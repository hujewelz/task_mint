# TASK_MINT Next.js 项目需求

你现在是一个专业的全栈 AI 工程助理，请根据以下项目需求，为我创建一个完整可运行的项目脚手架（Next.js + TypeScript）。请按照要求生成所有文件内容、目录结构，以及必要的逻辑框架。

## 项目名称
AI 自动任务拆解与排期生成系统

## 项目目标
根据 PRD 文本，自动拆解任务并生成排期计划，

输入：
- PRD 文本（功能说明 + 验收标准）
- 执行角色（Frontend / Backend / Test）
- Deadline（如：2025-01-12）
- 已占用日程（如：周三全天不可用）

输出（JSON）：
- 任务标题（动词 + 对象）
- 任务描述
- 预计工时（1～4 小时）
- 建议开始时间（必须考虑不可用时间）
- 依赖关系（可选）
并确保：
- 前端不会出现后端任务，反之亦然
- 总工时不能超过 Deadline 前可用时间
- 自动排期
- 每项任务颗粒度 1～4 小时

## 项目技术栈要求

- Next.js（App Router）
- TypeScript
- TailwindCSS
- Shadcn/UI
- OpenAI / Claude API（封装成 /lib/ai.ts）
- 有清晰的服务端/客户端边界

## 代码结构要求
请生成以下目录结构与所有文件内容：

/app
  /page.tsx（输入表单 + JSON 结果展示）
  /api/generate/route.ts（核心逻辑）
/components
  /ui（shadcn）
/lib
  /ai.ts（调用 Claude/OpenAI 的封装）
  /task-utils.ts（包含：PRD解析、任务拆解、工时计算、排期算法）
  /date-utils.ts（负责日历运算：跳过不可用时间、计算可用小时）
/types
  /task.ts（Task 类型定义）
/styles
  globals.css
  tailwind.css
/config
  shadcn.json
  env.ts（dotenv）
/README.md
/eslintrc.json
/prettierrc
/tsconfig.json
/package.json

## 功能逻辑要求

## 后端 /api/generate
必须包含以下算法模块：
1. PRD解析模块 → 整理功能点，拆成候选任务
2. 角色过滤模块 → 根据 Frontend/Backend/Test 删除不属于该角色的任务
3. 任务颗粒化模块 → 保证每项 1～4 小时
4. 工时计算模块 → 总工时 ≤ Deadline
5. 排期模块：
   - 自动生成建议开始时间
   - 避开不可用日期
   - 按时间顺序排列
6. 最终输出标准 JSON

## 前端
- 表单输入：PRD、角色、Deadline、不可用日期
- Loading 状态
- JSON 美化展示

## 生成方式要求
- 请为每个文件提供完整内容（不能省略）
- 使用代码块标记，并在标题上注明文件路径
- 所有逻辑必须可直接运行
- 所有生成内容一次性输出

请从生成项目目录结构开始，然后输出所有文件。