import { NextRequest, NextResponse } from "next/server";
import { generateTaskPlan } from "@/lib/task-utils";
import { GenerateTaskRequest, GenerateTaskResponse } from "@/types/task";
import { z } from "zod";

// 验证请求体的 schema
const requestSchema = z.object({
  prd: z.string().min(10, "PRD 内容至少需要 10 个字符"),
  role: z.enum(["Frontend", "Backend", "Test"], {
    errorMap: () => ({ message: "���色必须是 Frontend、Backend 或 Test" }),
  }),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, {
    message: "截止日期格式必须为 YYYY-MM-DDTHH:mm",
  }),
  unavailableSlots: z.array(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      isFullDay: z.boolean(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
    })
  ),
  workingHoursPerDay: z.number().min(1).max(24).optional().default(8),
  aiConfig: z.object({
    provider: z.enum(["anthropic", "openai", "custom"]),
    apiKey: z.string().min(1),
    baseURL: z.string().optional(),
    modelName: z.string().min(1),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body = await request.json();

    // 验证请求参数
    const validationResult = requestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "参数验证失败",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const data = validationResult.data as GenerateTaskRequest;

    // 检查环境变量
    const apiProvider = process.env.AI_PROVIDER || "anthropic";
    const hasApiKey =
      apiProvider === "anthropic"
        ? !!process.env.ANTHROPIC_API_KEY
        : !!process.env.OPENAI_API_KEY;

    if (!hasApiKey) {
      return NextResponse.json(
        {
          error: "AI API 密钥未配置",
          details: `请在 .env 文件中设置 ${apiProvider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY"}`,
        },
        { status: 500 }
      );
    }

    // 生成任务计划
    const result: GenerateTaskResponse = await generateTaskPlan(
      data.prd,
      data.role,
      data.deadline,
      data.unavailableSlots,
      data.workingHoursPerDay,
      data.aiConfig
    );

    // 返回成功响应
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error generating tasks:", error);

    // 返回错误响应
    return NextResponse.json(
      {
        error: "生成任务失败",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    );
  }
}

// 支持 OPTIONS 请求（CORS）
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
