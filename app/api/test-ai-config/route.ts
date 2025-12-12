import { NextRequest, NextResponse } from "next/server";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { z } from "zod";

// 验证 AI 配置的 schema
const aiConfigSchema = z.object({
  provider: z.enum(["anthropic", "openai", "custom"]),
  apiKey: z.string().min(1, "API Key 不能为空"),
  baseURL: z.string().optional(),
  modelName: z.string().min(1, "模型名称不能为空"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证配置
    const validationResult = aiConfigSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "配置验证失败",
          details: validationResult.error.errors.map(e => e.message).join(", "),
        },
        { status: 400 }
      );
    }

    const config = validationResult.data;

    // 创建 AI 客户端并测试
    let model;
    try {
      if (config.provider === "openai" || config.provider === "custom") {
        // OpenAI 或自定义（大多数第三方都兼容 OpenAI 格式）
        const openaiClient = createOpenAI({
          apiKey: config.apiKey,
          baseURL: config.baseURL || undefined,
        });
        model = openaiClient(config.modelName);
      } else {
        // anthropic
        const anthropicClient = createAnthropic({
          apiKey: config.apiKey,
          baseURL: config.baseURL || undefined,
        });
        model = anthropicClient(config.modelName);
      }

      // 发送测试请求
      const { text } = await generateText({
        model,
        prompt: "Hello! Please respond with 'Test successful' if you can see this message.",
        temperature: 0.1,
        maxTokens: 50,
      });

      return NextResponse.json({
        success: true,
        message: "连接成功！AI 配置正常工作",
        details: `模型响应: ${text.substring(0, 100)}${text.length > 100 ? "..." : ""}`,
      });

    } catch (aiError: unknown) {
      console.error("AI API Error:", aiError);

      // 解析不同类型的错误
      let errorMessage = "AI API 调用失败";
      let errorDetails = "";

      const error = aiError as { message?: string; statusCode?: number };

      if (error.message?.includes("invalid x-api-key") || error.message?.includes("authentication")) {
        errorMessage = "API Key 无效或已过期";
        errorDetails = "请检查 API Key 是否正确";
      } else if (error.message?.includes("Not Found") || error.statusCode === 404) {
        errorMessage = "模型不存在或 Base URL 不正确";
        errorDetails = "请检查模型名称和 Base URL 是否正确";
      } else if (error.message?.includes("No available") || error.message?.includes("support")) {
        errorMessage = "该账号不支持所选模型";
        errorDetails = "请尝试其他模型名称或联系服务提供商";
      } else if (error.message?.includes("quota") || error.message?.includes("limit")) {
        errorMessage = "API 配额不足或达到限制";
        errorDetails = "请检查账号余额或调用限制";
      } else if (error.message?.includes("timeout")) {
        errorMessage = "请求超时";
        errorDetails = "网络连接可能不稳定，请重试";
      } else {
        errorDetails = error.message || "未知错误";
      }

      return NextResponse.json(
        {
          error: errorMessage,
          details: errorDetails,
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error("Test AI Config Error:", error);

    return NextResponse.json(
      {
        error: "服务器错误",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    );
  }
}