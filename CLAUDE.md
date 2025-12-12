# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Task Mint 是一个基于 AI 的任务拆解与排期生成系统，能够根据 PRD 文档自动生成符合角色的任务计划和时间安排。

**技术栈**：Next.js 15 (App Router) + TypeScript + TailwindCSS + Shadcn/UI + Claude/OpenAI API

## 常用命令

```bash
# 开发
npm run dev              # 启动开发服务器 (http://localhost:3000)

# 构建与部署
npm run build            # 构建生产版本
npm start                # 启动生产服务器

# 代码质量
npm run lint             # 运行 ESLint 检查
npm run format           # 使用 Prettier 格式化代码
```

## 环境配置

项目需要配置 AI API 密钥：

1. 复制 `.env.example` 为 `.env`
2. 设置 `AI_PROVIDER` (anthropic 或 openai)
3. 设置对应的 API Key (`ANTHROPIC_API_KEY` 或 `OPENAI_API_KEY`)

## 核心架构

### 数据流

```
用户输入(PRD + 角色 + Deadline)
  ↓
app/api/generate/route.ts (验证请求)
  ↓
lib/task-utils.ts::generateTaskPlan()
  ├─ parsePRDToTasks() → 调用 AI 解析 PRD
  ├─ filterTasksByRole() → 根据角色过滤任务
  ├─ normalizeTaskGranularity() → 确保任务颗粒度 1-4h
  ├─ calculateAvailableHours() → 计算可用工时
  └─ scheduleTasksWithDependencies() → 生成排期
  ↓
返回 JSON 响应 (任务列表 + 可行性分析)
```

### 关键模块

#### 1. AI 调用层 (`lib/ai.ts`)
- 封装 Anthropic/OpenAI SDK
- 支持切换 AI Provider
- `generateAIJSON<T>()`: 生成并解析 JSON 响应

#### 2. 任务处理引擎 (`lib/task-utils.ts`)
- **PRD 解析**：使用 AI 将 PRD 拆解为候选任务
- **角色过滤**：基于关键词匹配过滤任务（Frontend/Backend/Test）
- **颗粒化处理**：自动拆分超过 4 小时的任务
- **排期算法**：为任务分配开始时间，添加依赖关系

#### 3. 日期计算工具 (`lib/date-utils.ts`)
- **工作时间**：9:00-18:00（可配置）
- **跳过规则**：周末 + 用户指定的不可用时段
- **核心函数**：
  - `calculateAvailableHours()`: 计算截止日期前的可用工时
  - `scheduleTask()`: 为任务分配开始时间（跨日计算）
  - `getNextAvailableTime()`: 获取下一个可用时间点

#### 4. 类型定义 (`types/task.ts`)
- `Task`: 最终生成的任务结构（包含 id、时间、依赖）
- `CandidateTask`: AI 解析后的候选任务
- `Role`: Frontend | Backend | Test
- `UnavailableSlot`: 不可用时间段

### API 接口

**POST /api/generate**

请求体：
```typescript
{
  prd: string;                    // PRD 文档内容
  role: "Frontend" | "Backend" | "Test";
  deadline: string;               // YYYY-MM-DD
  unavailableSlots: Array<{
    date: string;                 // YYYY-MM-DD
    isFullDay: boolean;
    startTime?: string;           // HH:mm
    endTime?: string;             // HH:mm
  }>;
  workingHoursPerDay?: number;    // 默认 8
}
```

响应：
```typescript
{
  tasks: Task[];                  // 已排期的任务列表
  totalEstimatedHours: number;    // 总工时
  availableHours: number;         // 可用工时
  isFeasible: boolean;            // 是否可在 Deadline 前完成
  warnings?: string[];            // 警告信息
}
```

## 添加新功能时的注意事项

### UI 组件
- 使用 Shadcn/UI：`npx shadcn@latest add [component-name]`
- 所有组件位于 `components/ui/`
- 使用 TailwindCSS + `cn()` 工具函数

### 修改 AI 提示词
- 编辑 `lib/task-utils.ts` 中的 `parsePRDToTasks()` 函数
- 确保 prompt 明确要求返回 JSON 格式

### 调整工作时间规则
- 修改 `lib/date-utils.ts` 中的时间常量（当前：9:00-18:00）
- 更新 `scheduleTask()` 和 `getNextAvailableTime()` 逻辑

### 角色过滤规则
- 编辑 `lib/task-utils.ts` 中的 `roleKeywords` 对象
- 添加新的角色类型需同步修改 `types/task.ts` 中的 `Role` 类型

## 项目约束

1. **任务颗粒度**：严格控制在 1-4 小时，超过则自动拆分
2. **角色隔离**：Frontend 不会看到 Backend 任务，反之亦然
3. **时间验证**：自动检查总工时是否超过 Deadline
4. **工作日历**：默认跳过周末，支持自定义不可用时段
5. **依赖关系**：任务按顺序依赖（task-2 依赖 task-1）
