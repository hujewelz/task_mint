import {
  Task,
  CandidateTask,
  Role,
  UnavailableSlot,
  GenerateTaskResponse,
  AIConfig,
  BackendTask,
} from "@/types/task";
import { generateAIJSON } from "./ai";
import {
  calculateAvailableHours,
  formatDateTime,
  getNextAvailableTime,
  isDateUnavailable,
} from "./date-utils";
import {
  addDays,
  setHours,
  setMinutes,
  format,
} from "date-fns";

/**
 * 使用 AI 解析 PRD 并生成候选任务
 */
export async function parsePRDToTasks(
  prd: string,
  role: Role,
  aiConfig?: AIConfig
): Promise<CandidateTask[]> {
  const prompt = `请分析以下 PRD 文档，并根据 ${role} 角色的工作范围，拆解出相关的任务清单。

PRD 内容：
${prd}

要求：
1. 只提取与 ${role} 角色相关的任务
2. 每个任务的颗粒度应该在 1-4 小时之间
3. 任务标题使用"动词 + 对象"的格式（如："实现用户登录接口"、"设计登录页面 UI"）
4. 为每个任务提供清晰的描述
5. 估算每个任务的工时（1-4小时）
6. 按照合理的优先级排序

请以 JSON 数组格式返回，格式如下：
[
  {
    "title": "任务标题",
    "description": "任务详细描述",
    "estimatedHours": 2,
    "category": "UI设计 | API开发 | 数据库 | 测试 | 其他",
    "priority": 1
  }
]`;

  const tasks = await generateAIJSON<CandidateTask[]>(prompt, aiConfig);
  return tasks;
}

/**
 * 根据角色过滤任务
 */
export function filterTasksByRole(
  tasks: CandidateTask[],
  role: Role
): CandidateTask[] {
  const roleKeywords: Record<Role, string[]> = {
    Frontend: [
      "UI",
      "界面",
      "页面",
      "组件",
      "样式",
      "前端",
      "交互",
      "动画",
      "响应式",
    ],
    Backend: [
      "API",
      "接口",
      "数据库",
      "后端",
      "服务",
      "认证",
      "权限",
      "中间件",
      "缓存",
    ],
    Test: ["测试", "用例", "自动化", "单元测试", "集成测试", "E2E"],
  };

  const keywords = roleKeywords[role];

  return tasks.filter((task) => {
    const searchText = `${task.title} ${task.description} ${task.category}`;
    return keywords.some((keyword) => searchText.includes(keyword));
  });
}

/**
 * 确保任务颗粒度在 1-4 小时之间
 */
export function normalizeTaskGranularity(
  tasks: CandidateTask[]
): CandidateTask[] {
  const normalized: CandidateTask[] = [];

  for (const task of tasks) {
    if (task.estimatedHours <= 4) {
      // 确保至少 1 小时
      normalized.push({
        ...task,
        estimatedHours: Math.max(1, task.estimatedHours),
      });
    } else {
      // 如果超过 4 小时，拆分成多个子任务
      const numSubtasks = Math.ceil(task.estimatedHours / 4);
      const hoursPerSubtask = task.estimatedHours / numSubtasks;

      for (let i = 0; i < numSubtasks; i++) {
        normalized.push({
          ...task,
          title: `${task.title} (${i + 1}/${numSubtasks})`,
          estimatedHours: Math.min(4, Math.max(1, hoursPerSubtask)),
        });
      }
    }
  }

  return normalized;
}

/**
 * 计算总工时
 */
export function calculateTotalHours(tasks: CandidateTask[]): number {
  return tasks.reduce((total, task) => total + task.estimatedHours, 0);
}

/**
 * 工作日负载管理器
 */
interface DayWorkload {
  date: string; // YYYY-MM-DD
  totalHours: number;
  tasks: Array<{ taskIndex: number; hours: number; startTime: Date }>;
}

/**
 * 为任务分配时间并生成最终任务列表（优化版，避免连续超负荷）
 */
export function scheduleTasksWithDependencies(
  candidateTasks: CandidateTask[],
  role: Role,
  deadline: string,
  unavailableSlots: UnavailableSlot[],
  maxHoursPerDay: number = 8
): Task[] {
  const tasks: Task[] = [];
  const now = new Date();
  const workloadMap = new Map<string, DayWorkload>();

  // 获取下一个可用的工作时间（早上10:30开始）
  let currentTime = getNextAvailableTime(now, unavailableSlots);
  if (currentTime.getHours() >= 18 || currentTime.getHours() < 10 || (currentTime.getHours() === 10 && currentTime.getMinutes() < 30)) {
    currentTime = addDays(currentTime, 1);
    currentTime = setHours(setMinutes(currentTime, 30), 10);
    currentTime = getNextAvailableTime(currentTime, unavailableSlots);
  }

  candidateTasks.forEach((candidate, index) => {
    const scheduledTime = scheduleTaskWithWorkloadLimit(
      currentTime,
      candidate.estimatedHours,
      unavailableSlots,
      workloadMap,
      maxHoursPerDay
    );

    const task: Task = {
      id: `task-${index + 1}`,
      title: candidate.title,
      description: candidate.description,
      estimatedHours: candidate.estimatedHours,
      suggestedStartTime: formatDateTime(scheduledTime.startTime),
      role,
    };

    // 如果不是第一个任务，添加对前一个任务的依赖
    if (index > 0) {
      task.dependencies = [
        {
          taskId: tasks[index - 1].id,
          type: "after",
        },
      ];
    }

    tasks.push(task);

    // 更新当前时间为任务结束后的下一个时间点
    currentTime = scheduledTime.nextAvailableTime;
  });

  return tasks;
}

/**
 * 在工作负载限制下安排任务
 */
function scheduleTaskWithWorkloadLimit(
  preferredStartTime: Date,
  durationHours: number,
  unavailableSlots: UnavailableSlot[],
  workloadMap: Map<string, DayWorkload>,
  maxHoursPerDay: number
): { startTime: Date; nextAvailableTime: Date } {
  let currentTime = new Date(preferredStartTime);
  let remainingHours = durationHours;

  while (remainingHours > 0) {
    // 确保在工作时间内
    if (currentTime.getHours() < 10 || (currentTime.getHours() === 10 && currentTime.getMinutes() < 30)) {
      currentTime = setHours(setMinutes(currentTime, 30), 10);
    }

    if (currentTime.getHours() >= 18) {
      currentTime = addDays(currentTime, 1);
      currentTime = setHours(setMinutes(currentTime, 30), 10);
      currentTime = getNextAvailableTime(currentTime, unavailableSlots);
      continue;
    }

    // 检查当前日期是否可用
    if (isDateUnavailable(currentTime, unavailableSlots)) {
      currentTime = getNextAvailableTime(addDays(currentTime, 1), unavailableSlots);
      continue;
    }

    const dateKey = format(currentTime, "yyyy-MM-dd");
    const currentWorkload = workloadMap.get(dateKey) || {
      date: dateKey,
      totalHours: 0,
      tasks: []
    };

    // 计算当天剩余可用工作时间
    const dayRemainingCapacity = maxHoursPerDay - currentWorkload.totalHours;
    const workDayRemainingHours = 18 - currentTime.getHours();
    const availableToday = Math.min(dayRemainingCapacity, workDayRemainingHours, remainingHours);

    if (availableToday > 0) {
      // 如果这是第一次安排到这一天，记录开始时间
      const taskStartTime = remainingHours === durationHours ? new Date(currentTime) : currentTime;

      // 更新工作负载
      currentWorkload.totalHours += availableToday;
      currentWorkload.tasks.push({
        taskIndex: workloadMap.size,
        hours: availableToday,
        startTime: taskStartTime
      });
      workloadMap.set(dateKey, currentWorkload);

      remainingHours -= availableToday;

      // 如果任务完成，返回开始时间
      if (remainingHours <= 0) {
        const nextTime = new Date(currentTime);
        nextTime.setHours(currentTime.getHours() + availableToday);
        return {
          startTime: taskStartTime,
          nextAvailableTime: nextTime
        };
      }

      // 更新当前时间到当天工作结束
      currentTime.setHours(currentTime.getHours() + availableToday);
    }

    // 移动到下一天
    if (remainingHours > 0) {
      currentTime = addDays(currentTime, 1);
      currentTime = setHours(setMinutes(currentTime, 30), 10);
      currentTime = getNextAvailableTime(currentTime, unavailableSlots);
    }
  }

  return {
    startTime: preferredStartTime,
    nextAvailableTime: currentTime
  };
}

/**
 * 生成任务并进行完整的工作流处理
 */
export async function generateTaskPlan(
  prd: string,
  role: Role,
  deadline: string,
  unavailableSlots: UnavailableSlot[],
  workingHoursPerDay: number = 8,
  aiConfig?: AIConfig
): Promise<GenerateTaskResponse> {
  // 1. 使用 AI 解析 PRD
  const candidateTasks = await parsePRDToTasks(prd, role, aiConfig);

  // 2. 根据角色过滤任务
  const filteredTasks = filterTasksByRole(candidateTasks, role);

  // 3. 规范化任务颗粒度
  const normalizedTasks = normalizeTaskGranularity(filteredTasks);

  // 4. 计算总工时和可用工时
  const totalEstimatedHours = calculateTotalHours(normalizedTasks);
  const availableHours = calculateAvailableHours(
    deadline,
    unavailableSlots,
    workingHoursPerDay
  );

  // 5. 检查是否可行
  const isFeasible = totalEstimatedHours <= availableHours;
  const warnings: string[] = [];

  if (!isFeasible) {
    warnings.push(
      `总工时 (${totalEstimatedHours}h) 超过了截止日期前的可用时间 (${availableHours}h)，建议调整 Deadline 或减少任务范围。`
    );
  }

  if (normalizedTasks.length === 0) {
    warnings.push(`未找到与 ${role} 角色相关的任务，请检查 PRD 内容。`);
  }

  // 6. 为任务分配时间
  const scheduledTasks = scheduleTasksWithDependencies(
    normalizedTasks,
    role,
    deadline,
    unavailableSlots
  );

  // 转换为后端格式
  const backendTasks: BackendTask[] = scheduledTasks.map((task) => {
    // 计算任务截止时间，确保在工作时间内
    const startTime = new Date(task.suggestedStartTime);
    let endTime = new Date(startTime);
    let remainingHours = task.estimatedHours;

    while (remainingHours > 0) {
      // 如果不是工作时间，调整到下一个工作时间
      if (endTime.getHours() < 10 || (endTime.getHours() === 10 && endTime.getMinutes() < 30)) {
        endTime = setHours(setMinutes(endTime, 30), 10);
      }

      if (endTime.getHours() >= 18) {
        endTime = addDays(endTime, 1);
        endTime = setHours(setMinutes(endTime, 30), 10);
        endTime = getNextAvailableTime(endTime, unavailableSlots);
        continue;
      }

      // 检查是否在不可用时间段
      if (isDateUnavailable(endTime, unavailableSlots)) {
        endTime = getNextAvailableTime(addDays(endTime, 1), unavailableSlots);
        continue;
      }

      // 计算当天剩余工作时间
      const workDayEndTime = setHours(setMinutes(new Date(endTime), 0), 18);
      const hoursUntilEndOfDay = (workDayEndTime.getTime() - endTime.getTime()) / (1000 * 60 * 60);
      const hoursToday = Math.min(remainingHours, hoursUntilEndOfDay);

      endTime = new Date(endTime.getTime() + hoursToday * 60 * 60 * 1000);
      remainingHours -= hoursToday;

      // 如果还有剩余时间，移到下一工作日
      if (remainingHours > 0) {
        endTime = addDays(endTime, 1);
        endTime = setHours(setMinutes(endTime, 30), 10);
        endTime = getNextAvailableTime(endTime, unavailableSlots);
      }
    }

    // 转换角色名称
    const roleMapping: Record<Role, string> = {
      "Frontend": "前端开发",
      "Backend": "后端开发",
      "Test": "测试工程师"
    };

    return {
      title: task.title,
      consume_time: task.estimatedHours,
      deadline: endTime.toISOString().slice(0, 19).replace('T', ' '),
      user_role: roleMapping[task.role] || task.role,
    };
  });

  return {
    tasks: scheduledTasks,
    totalEstimatedHours,
    availableHours,
    isFeasible,
    warnings: warnings.length > 0 ? warnings : undefined,
    backendTasks,
  };
}
