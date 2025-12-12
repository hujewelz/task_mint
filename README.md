# Task Mint

AI 自动任务拆解与排期生成系统

根据 PRD 文本，自动拆解任务并生成符合角色的排期计划。

## 功能特性

- **AI 驱动拆解**：基于 Claude/OpenAI 自动解析 PRD 并拆解任务
- **多AI提供商支持**：支持 Anthropic、OpenAI 和自定义API，内置配置测试
- **角色过滤**：支持 Frontend、Backend、Test 三种角色，自动过滤不相关任务
- **智能排期**：考虑不可用时间，自动分配任务开始时间（工作时间：10:30-18:00）
- **工作负载平衡**：优先满足每日8小时工作制，避免连续多日过载
- **PRD多输入模式**：支持文本直接输入和文档链接获取
- **全屏弹窗展示**：固定头部、可滚动内容的沉浸式结果展示
- **双格式导出**：提供用户友好的任务列表和后端JSON格式
- **工时计算**：确保任务颗粒度在 1-4 小时之间
- **可行性检查**：自动判断任务总工时是否超过 Deadline

## 界面预览

### 主页面
- 现代化渐变背景设计
- 单列布局，聚焦内容输入
- AI设置快速访问按钮

### 结果展示
- 全屏模态弹窗
- 固定头部导航
- 可滚动内容区域
- 任务列表/JSON双视图切换
- 一键复制和下载功能

## 技术栈

- **框架**：Next.js 15 (App Router)
- **语言**：TypeScript
- **样式**：TailwindCSS + Shadcn/UI
- **AI**：Claude API / OpenAI API / 自定义API
- **组件库**：Button, Card, Dialog, Input, Label, Select, Textarea
- **工具**：date-fns, zod, lucide-react

## 项目结构

```
task_mint/
├── app/
│   ├── api/
│   │   ├── generate/route.ts         # 核心任务生成API
│   │   ├── test-ai-config/route.ts   # AI配置测试API
│   │   └── fetch-prd/route.ts        # PRD文档获取API
│   ├── settings/page.tsx             # AI设置页面
│   ├── layout.tsx                    # 布局组件
│   ├── page.tsx                      # 主页面（表单 + 弹窗结果）
│   └── globals.css                   # 全局样式
├── components/
│   └── ui/                           # Shadcn UI 组件
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx                # 弹窗组件
│       ├── input.tsx
│       ├── label.tsx
│       ├── select.tsx
│       └── textarea.tsx
├── lib/
│   ├── ai.ts                         # AI 调用封装（多提供商支持）
│   ├── task-utils.ts                 # 任务拆解与排期逻辑
│   ├── date-utils.ts                 # 日期计算工具
│   └── utils.ts                      # 通用工具函数
├── types/
│   └── task.ts                       # TypeScript 类型定义
├── .env.example                      # 环境变量示例
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

### 2. 运行开发服务器

```bash
npm run dev
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000)

### 3. 构建生产版本

```bash
npm run build
npm start
```

## 使用说明

### AI设置配置

系统使用前端设置页面进行AI配置，无需手动编辑配置文件：

1. 点击右上角的"AI设置"按钮
2. 选择AI提供商（Anthropic、OpenAI、自定义）
3. 填写API密钥和相关配置
4. 点击"测试配置"验证连接
5. 保存设置

配置信息将自动保存到浏览器本地存储，下次访问时自动加载。

### 任务生成流程

#### 输入参数

1. **PRD 内容**：
   - **文本输入**：直接粘贴PRD内容
   - **文档链接**：输入Notion、飞书文档等链接，系统自动获取内容
2. **执行角色**：选择 Frontend、Backend 或 Test
3. **截止日期**：任务完成的最后期限（datetime-local格式）
4. **不可用日程**：添加不可用的时间段
   - 支持全天或指定时间段
   - 多个时间段管理

#### 结果展示

- **全屏弹窗**：沉浸式结果查看体验
- **固定头部**：标题和关闭按钮始终可见
- **双视图模式**：
  - **任务列表**：用户友好的卡片式展示
  - **JSON格式**：后端对接的标准化数据
- **操作功能**：
  - 一键复制JSON到剪贴板
  - 下载JSON文件
  - 可滚动查看大量任务

### 输出结果格式

#### 用户界面展示
```
✓ 排期可行 | 总工时: 24h
┌─────────────────────────────────┐
│ 1. 实现用户登录接口              │
│ 开发 POST /api/login 接口       │
│ ⏰ 3h | 📅 2025-01-08 10:30    │
│ 👤 Backend                     │
└─────────────────────────────────┘
```

#### JSON格式（后端对接）
```json
[
  {
    "title": "实现用户登录接口",
    "consume_time": 3.0,
    "deadline": "2025-01-08 13:30:00",
    "user_role": "后端开发"
  }
]
```

## 核心特性详解

### 1. 智能任务调度

- **工作时间**：10:30-18:00（每日7.5小时）
- **工作负载平衡**：优先保证每日8小时工作制
- **避免过载**：智能分配任务，避免连续多日超负荷
- **时间冲突处理**：自动避开不可用时间段
- **依赖关系管理**：任务按时间顺序自动添加依赖

### 2. 多AI提供商支持

- **Anthropic Claude**：官方API支持
- **OpenAI**：GPT系列模型
- **自定义API**：支持OpenAI兼容的自定义服务
- **配置测试**：实时验证API连接状态
- **本地存储**：配置信息安全保存在浏览器

### 3. 角色智能过滤

- **Frontend**：UI、界面、页面、组件、样式等关键词
- **Backend**：API、接口、数据库、服务、中间件等
- **Test**：测试、用例、自动化、单元测试等

## API 接口

参考 [API 文档](API.md)

## 开发说明

### 添加新的 UI 组件

项目使用 Shadcn/UI，可以通过以下命令添加组件：

```bash
npx shadcn@latest add [component-name]
```

### 自定义 AI 提示词

编辑 [lib/task-utils.ts](lib/task-utils.ts) 中的 `parsePRDToTasks` 函数，修改传递给 AI 的 prompt

### 调整工作时间

在 [lib/date-utils.ts](lib/date-utils.ts) 和 [lib/task-utils.ts](lib/task-utils.ts) 中修改工作时间设置（当前：10:30-18:00）

### 添加新的AI提供商

1. 在 `lib/ai.ts` 中添加新的提供商支持
2. 更新 `types/task.ts` 中的 AIConfig 类型
3. 在设置页面添加对应的配置选项

## 部署说明

### Vercel 部署

1. 将代码推送到 GitHub
2. 在 Vercel 中导入项目
3. 设置环境变量
4. 部署完成

### 部署配置

- 主要通过前端AI设置页面进行配置
- 可选择性配置环境变量作为默认值（参考 `.env.example`）
- 所有配置支持运行时动态修改

## 更新日志

### v1.0.0 (2024-12)
- 🎉 初始版本发布
- 🤖 多AI提供商支持
- 📱 全屏弹窗结果展示
- ⚖️ 智能工作负载平衡
- 🔗 PRD文档链接支持
- ⚙️ AI设置管理页面
- 📤 双格式数据导出

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！

### 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 技术支持

如有问题，请通过以下方式联系：

- 提交 GitHub Issue
- 查看项目文档
- 参考代码注释