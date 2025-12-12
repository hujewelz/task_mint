/**
 * 执行角色类型
 */
export type Role = "Frontend" | "Backend" | "Test";

/**
 * 任务依赖关系
 */
export interface TaskDependency {
  taskId: string;
  type: "before" | "after";
}

/**
 * 任务定义（前端显示用）
 */
export interface Task {
  id: string;
  title: string;
  description: string;
  estimatedHours: number;
  suggestedStartTime: string;
  dependencies?: TaskDependency[];
  role: Role;
}

/**
 * 后端对接的任务格式
 */
export interface BackendTask {
  title: string;
  consume_time: number;
  deadline: string;
  user_role: string;
}

/**
 * 不可用时间段
 */
export interface UnavailableSlot {
  date: string;
  isFullDay: boolean;
  startTime?: string;
  endTime?: string;
}

/**
 * 生成任务的请求参数
 */
export interface AIConfig {
  provider: "anthropic" | "openai" | "custom";
  apiKey: string;
  baseURL?: string;
  modelName: string;
}

export interface GenerateTaskRequest {
  prd: string;
  role: Role;
  deadline: string;
  unavailableSlots: UnavailableSlot[];
  workingHoursPerDay?: number;
  aiConfig: AIConfig;
}

/**
 * 生成任务的响应结果
 */
export interface GenerateTaskResponse {
  tasks: Task[];
  totalEstimatedHours: number;
  availableHours: number;
  isFeasible: boolean;
  warnings?: string[];
  backendTasks: BackendTask[];
}

/**
 * AI 解析后的候选任务
 */
export interface CandidateTask {
  title: string;
  description: string;
  estimatedHours: number;
  category: string;
  priority?: number;
}
