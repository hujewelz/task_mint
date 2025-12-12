import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { AIConfig } from "@/types/task";

/**
 * 获取 AI 模型实例 - 只支持前端配置
 */
function getModel(aiConfig: AIConfig) {
  if (aiConfig.provider === "openai" || aiConfig.provider === "custom") {
    // OpenAI 或自定义（大多数第三方都兼容 OpenAI 格式）
    const openaiClient = createOpenAI({
      apiKey: aiConfig.apiKey,
      baseURL: aiConfig.baseURL || undefined,
    });
    return openaiClient(aiConfig.modelName);
  } else {
    // anthropic
    const anthropicClient = createAnthropic({
      apiKey: aiConfig.apiKey,
      baseURL: aiConfig.baseURL || undefined,
    });
    return anthropicClient(aiConfig.modelName);
  }
}

/**
 * 调用 AI 生成文本
 */
export async function generateAIText(prompt: string, aiConfig: AIConfig): Promise<string> {
  const model = getModel(aiConfig);

  const { text } = await generateText({
    model,
    prompt,
    temperature: 0.7,
    maxTokens: 4000,
  });

  return text;
}

/**
 * 调用 AI 生成 JSON 格式的响应
 */
export async function generateAIJSON<T>(prompt: string, aiConfig: AIConfig): Promise<T> {
  const systemPrompt = `你是一个专业的项目管理助手。请根据用户的需求，生成符合要求的 JSON 格式输出。
确保输出的 JSON 格式正确，可以被解析。只返回 JSON，不要包含任何其他文字说明。`;

  const fullPrompt = `${systemPrompt}\n\n${prompt}`;

  const text = await generateAIText(fullPrompt, aiConfig);

  try {
    // 尝试提取 JSON 代码块
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }

    // 尝试提取普通代码块
    const codeMatch = text.match(/```\s*([\s\S]*?)\s*```/);
    if (codeMatch) {
      return JSON.parse(codeMatch[1]);
    }

    // 直接解析文本
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to parse AI response as JSON:", text);
    throw new Error(`AI 返回的内容无法解析为 JSON: ${error}`);
  }
}
