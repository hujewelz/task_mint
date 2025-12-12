# Task Mint API 文档

Task Mint AI 任务拆解与排期系统的完整 API 接口文档。

## 基础信息

- **Base URL**: `http://localhost:3000` (开发环境)
- **Content-Type**: `application/json`
- **认证方式**: 无需认证 (AI密钥通过请求体传递)

## 接口概览

| 接口 | 方法 | 路径 | 描述 |
|------|------|------|------|
| 任务生成 | POST | `/api/generate` | 根据PRD生成任务排期 |
| AI配置测试 | POST | `/api/test-ai-config` | 测试AI服务连接状态 |
| PRD内容获取 | POST | `/api/fetch-prd` | 从文档链接获取PRD内容 |

---

## 1. 任务生成接口

### `POST /api/generate`

根据PRD内容和配置参数，生成智能的任务拆解和排期计划。

#### 请求参数

```typescript
{
  prd: string;                    // PRD文档内容 (最少10个字符)
  role: "Frontend" | "Backend" | "Test";  // 执行角色
  deadline: string;               // 截止时间 (格式: YYYY-MM-DDTHH:mm)
  unavailableSlots: UnavailableSlot[];    // 不可用时间段
  workingHoursPerDay?: number;    // 每日工作时长，默认8小时
  aiConfig?: AIConfig;            // AI配置 (可选，优先使用传入的配置)
}
```

#### 详细参数说明

**UnavailableSlot (不可用时间段)**
```typescript
{
  date: string;          // 日期 (格式: YYYY-MM-DD)
  isFullDay: boolean;    // 是否全天不可用
  startTime?: string;    // 开始时间 (格式: HH:mm，非全天时必填)
  endTime?: string;      // 结束时间 (格式: HH:mm，非全天时必填)
}
```

**AIConfig (AI配置)**
```typescript
{
  provider: "anthropic" | "openai" | "custom";  // AI提供商
  apiKey: string;                               // API密钥
  baseURL?: string;                            // 自定义API地址 (custom时必填)
  modelName: string;                           // 模型名称
}
```

#### 请求示例

```json
{
  "prd": "开发一个用户管理系统，包含用户注册、登录、个人资料管理等功能。需要支持邮箱验证和密码重置。",
  "role": "Backend",
  "deadline": "2025-01-15T18:00",
  "unavailableSlots": [
    {
      "date": "2025-01-10",
      "isFullDay": true
    },
    {
      "date": "2025-01-12",
      "isFullDay": false,
      "startTime": "14:00",
      "endTime": "16:00"
    }
  ],
  "workingHoursPerDay": 8,
  "aiConfig": {
    "provider": "anthropic",
    "apiKey": "sk-ant-xxx",
    "modelName": "claude-3-sonnet-20240229"
  }
}
```

#### 响应格式

**成功响应 (200)**
```typescript
{
  tasks: Task[];                  // 用户界面展示的任务列表
  totalEstimatedHours: number;    // 总预估工时
  availableHours: number;         // 可用工作时间
  isFeasible: boolean;           // 是否可行
  warnings?: string[];           // 警告信息
  backendTasks: BackendTask[];   // 后端对接格式的任务数据
}
```

**Task (用户界面任务格式)**
```typescript
{
  id: string;                    // 任务ID (如: "task-1")
  title: string;                 // 任务标题
  description: string;           // 任务描述
  estimatedHours: number;        // 预估工时
  suggestedStartTime: string;    // 建议开始时间 (YYYY-MM-DD HH:mm)
  dependencies?: TaskDependency[]; // 任务依赖
  role: Role;                    // 任务角色
}
```

**BackendTask (后端对接格式)**
```typescript
{
  title: string;          // 任务标题
  consume_time: number;   // 消耗时间 (小时)
  deadline: string;       // 截止时间 (YYYY-MM-DD HH:mm:ss)
  user_role: string;      // 用户角色 ("前端开发"|"后端开发"|"测试工程师")
}
```

#### 响应示例

```json
{
  "tasks": [
    {
      "id": "task-1",
      "title": "设计用户数据库表结构",
      "description": "创建用户表、角色表等数据库结构，包含必要的字段和索引",
      "estimatedHours": 2,
      "suggestedStartTime": "2025-01-08 10:30",
      "role": "Backend",
      "dependencies": []
    },
    {
      "id": "task-2",
      "title": "实现用户注册接口",
      "description": "开发POST /api/register接口，支持邮箱注册和数据验证",
      "estimatedHours": 3,
      "suggestedStartTime": "2025-01-08 12:30",
      "role": "Backend",
      "dependencies": [
        {
          "taskId": "task-1",
          "type": "after"
        }
      ]
    }
  ],
  "totalEstimatedHours": 24,
  "availableHours": 40,
  "isFeasible": true,
  "warnings": [],
  "backendTasks": [
    {
      "title": "设计用户数据库表结构",
      "consume_time": 2.0,
      "deadline": "2025-01-08 12:30:00",
      "user_role": "后端开发"
    },
    {
      "title": "实现用户注册接口",
      "consume_time": 3.0,
      "deadline": "2025-01-08 15:30:00",
      "user_role": "后端开发"
    }
  ]
}
```

#### 错误响应

**参数验证失败 (400)**
```json
{
  "error": "参数验证失败",
  "details": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "undefined",
      "path": ["prd"],
      "message": "PRD 内容至少需要 10 个字符"
    }
  ]
}
```

**API密钥未配置 (500)**
```json
{
  "error": "AI API 密钥未配置",
  "details": "请在 .env 文件中设置 ANTHROPIC_API_KEY"
}
```

**任务生成失败 (500)**
```json
{
  "error": "生成任务失败",
  "details": "AI API调用失败: API key无效"
}
```

---

## 2. AI配置测试接口

### `POST /api/test-ai-config`

测试AI服务提供商的连接状态和配置有效性。

#### 请求参数

```typescript
{
  provider: "anthropic" | "openai" | "custom";  // AI提供商
  apiKey: string;                               // API密钥
  baseURL?: string;                            // 自定义API地址
  modelName: string;                           // 模型名称
}
```

#### 请求示例

```json
{
  "provider": "anthropic",
  "apiKey": "sk-ant-xxx",
  "modelName": "claude-3-sonnet-20240229"
}
```

#### 响应格式

**测试成功 (200)**
```json
{
  "success": true,
  "message": "AI配置测试成功",
  "details": {
    "provider": "anthropic",
    "model": "claude-3-sonnet-20240229",
    "responseTime": 1234,
    "testResponse": "AI服务连接正常"
  }
}
```

**测试失败 (400/500)**
```json
{
  "success": false,
  "error": "API密钥无效",
  "details": "请检查您的API密钥是否正确"
}
```

---

## 3. PRD内容获取接口

### `POST /api/fetch-prd`

从文档链接获取PRD内容，支持多种文档平台。

#### 请求参数

```typescript
{
  url: string;  // 文档链接URL
}
```

#### 支持的文档平台

- Notion页面
- 飞书文档
- 腾讯文档
- Google Docs
- 其他可公开访问的网页

#### 请求示例

```json
{
  "url": "https://www.notion.so/your-prd-document"
}
```

#### 响应格式

**获取成功 (200)**
```json
{
  "success": true,
  "content": "从文档中提取的PRD内容文本...",
  "metadata": {
    "title": "用户管理系统PRD",
    "url": "https://www.notion.so/your-prd-document",
    "extractedAt": "2025-01-08T10:30:00Z"
  }
}
```

**获取失败 (400/500)**
```json
{
  "success": false,
  "error": "无法访问文档",
  "details": "请检查链接是否正确或文档是否公开可访问"
}
```

---

## 错误码说明

| 状态码 | 错误类型 | 说明 |
|--------|----------|------|
| 400 | 参数错误 | 请求参数格式错误或缺失必填参数 |
| 401 | 认证失败 | API密钥无效或过期 |
| 403 | 权限不足 | API密钥权限不足或超出配额 |
| 404 | 资源不存在 | 请求的资源不存在 |
| 429 | 请求过频 | API调用频率超出限制 |
| 500 | 服务器错误 | 服务器内部错误或AI服务不可用 |
| 502 | 网关错误 | 上游AI服务连接失败 |
| 503 | 服务不可用 | AI服务临时不可用 |

## 公共错误响应格式

```typescript
{
  error: string;      // 错误简要说明
  details: string;    // 详细错误信息
  timestamp?: string; // 错误发生时间
  requestId?: string; // 请求追踪ID
}
```

## 使用限制

### 请求限制
- 最大请求体大小: 10MB
- 超时时间: 60秒
- PRD内容最大长度: 50,000字符

### AI服务限制
- **Anthropic Claude**: 遵循官方API限制
- **OpenAI**: 遵循官方API限制
- **自定义API**: 取决于服务提供商

### 任务生成限制
- 最大任务数量: 100个
- 最大工作时长: 1000小时
- 截止时间范围: 当前时间后1年内

## 最佳实践

### 1. 错误处理
```javascript
try {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestData)
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('API Error:', error);
    return;
  }

  const result = await response.json();
  // 处理成功响应
} catch (error) {
  console.error('Network Error:', error);
}
```

### 2. 请求重试
```javascript
async function callAPIWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;

      // 如果是5xx错误，进行重试
      if (response.status >= 500 && i < maxRetries - 1) {
        await sleep(1000 * Math.pow(2, i)); // 指数退避
        continue;
      }

      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * Math.pow(2, i));
    }
  }
}
```

### 3. AI配置管理
```javascript
// 优先使用传入的AI配置，回退到环境变量
const aiConfig = {
  provider: userConfig?.provider || process.env.AI_PROVIDER,
  apiKey: userConfig?.apiKey || process.env.ANTHROPIC_API_KEY,
  modelName: userConfig?.modelName || 'claude-3-sonnet-20240229'
};
```

## 更新日志

### v1.0.0 (2024-12)
- 🎉 初始API版本发布
- ✨ 支持三种AI提供商 (Anthropic, OpenAI, Custom)
- 🔧 完整的任务生成和配置测试功能
- 📋 PRD文档链接内容获取
- 🕒 智能工作时间调度 (10:30-18:00)
- 📤 双格式数据输出 (UI + Backend)

---

## 联系支持

如有API相关问题，请通过以下方式联系：

- 📧 提交GitHub Issue
- 📚 查看完整项目文档
- 💬 查看代码注释和示例

**文档最后更新**: 2024年12月