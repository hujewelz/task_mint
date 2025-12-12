# Task Mint

AI 自动任务拆解与排期生成系统

根据 PRD 文本，自动拆解任务并生成符合角色的排期计划。

## 功能特性

- **AI 驱动拆解**：基于 Claude/OpenAI 自动解析 PRD 并拆解任务
- **角色过滤**：支持 Frontend、Backend、Test 三种角色，自动过滤不相关任务
- **智能排期**：考虑不可用时间，自动分配任务开始时间
- **工时计算**：确保任务颗粒度在 1-4 小时之间
- **可行性检查**：自动判断任务总工时是否超过 Deadline

## 技术栈

- **框架**：Next.js 15 (App Router)
- **语言**：TypeScript
- **样式**：TailwindCSS + Shadcn/UI
- **AI**：Claude API / OpenAI API
- **工具**：date-fns, zod, lucide-react

## 项目结构

```
task_mint/
├── app/
│   ├── api/generate/route.ts    # 核心 API 路由
│   ├── layout.tsx               # 布局组件
│   ├── page.tsx                 # 主页面（表单 + 结果展示）
│   └── globals.css              # 全局样式
├── components/
│   └── ui/                      # Shadcn UI 组件
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── select.tsx
│       └── textarea.tsx
├── lib/
│   ├── ai.ts                    # AI 调用封装
│   ├── task-utils.ts            # 任务拆解与排期逻辑
│   ├── date-utils.ts            # 日期计算工具
│   └── utils.ts                 # 通用工具函数
├── types/
│   └── task.ts                  # TypeScript 类��定义
├── .env.example                 # 环境变量示例
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，并填写你的 API 密钥：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 选择 AI 提供商：anthropic 或 openai
AI_PROVIDER=anthropic

# Anthropic API Key（如果使用 Claude）
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# OpenAI API Key（如果使用 OpenAI）
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. 运行开发服务器

```bash
npm run dev
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000)

### 4. 构建生产版本

```bash
npm run build
npm start
```

## 使用说明

### 输入参数

1. **PRD 内容**：产品需求文档，包含功能说明和验收标准
2. **执行角色**：选择 Frontend、Backend 或 Test
3. **截止日期**：任务完成的最后期限（格式：YYYY-MM-DD）
4. **不可用日程**：添加不可用的日期（如假期、会议等）

### 输出结果（JSON）

```json
{
  "tasks": [
    {
      "id": "task-1",
      "title": "实现用户登录接口",
      "description": "开发 POST /api/login 接口，支持邮箱密码登录",
      "estimatedHours": 3,
      "suggestedStartTime": "2025-01-08 09:00",
      "role": "Backend",
      "dependencies": []
    }
  ],
  "totalEstimatedHours": 24,
  "availableHours": 40,
  "isFeasible": true,
  "warnings": []
}
```

## 核心算法

### 1. PRD 解析模块
使用 AI 分析 PRD 文档，提取功能点并拆解为候选任务

### 2. 角色过滤模块
根据 Frontend/Backend/Test 角色关键词，过滤不相关任务

### 3. 任务颗粒化模块
确保每个任务工时在 1-4 小时之间，自动拆分大任务

### 4. 工时计算模块
计算总工时，并与 Deadline 前的可用时间对比

### 5. 排期模块
- 自动生成建议开始时间
- 避开周末和不可用日期
- 按时间顺序排列
- 添加任务依赖关系

## API 接口

### POST /api/generate

**请求体**：

```typescript
{
  prd: string;
  role: "Frontend" | "Backend" | "Test";
  deadline: string; // YYYY-MM-DD
  unavailableSlots: Array<{
    date: string; // YYYY-MM-DD
    isFullDay: boolean;
    startTime?: string; // HH:mm
    endTime?: string; // HH:mm
  }>;
  workingHoursPerDay?: number; // 默认 8
}
```

**响应**：

```typescript
{
  tasks: Task[];
  totalEstimatedHours: number;
  availableHours: number;
  isFeasible: boolean;
  warnings?: string[];
}
```

## 开发说明

### 添加新的 UI 组件

项目使用 Shadcn/UI，可以通过以下命令添加组件：

```bash
npx shadcn@latest add [component-name]
```

### 自定义 AI 提示词

编辑 [lib/task-utils.ts](lib/task-utils.ts) 中的 `parsePRDToTasks` 函数，修改传递给 AI 的 prompt

### 调整工作时间

在 [lib/date-utils.ts](lib/date-utils.ts) 中修改工作时间设置（默认 9:00-18:00）

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！
