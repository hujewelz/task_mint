"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, TestTube2, CheckCircle2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { AIConfig } from "@/types/task";

const DEFAULT_CONFIGS: Record<string, Partial<AIConfig>> = {
  anthropic: {
    provider: "anthropic",
    modelName: "claude-3-5-sonnet-20241022",
    baseURL: "",
  },
  openai: {
    provider: "openai",
    modelName: "gpt-4-turbo-preview",
    baseURL: "",
  },
  custom: {
    provider: "custom",
    modelName: "",
    baseURL: "",
  },
};

export default function SettingsPage() {
  const router = useRouter();
  const [config, setConfig] = useState<AIConfig>({
    provider: "anthropic",
    apiKey: "",
    baseURL: "",
    modelName: "claude-3-5-sonnet-20241022",
  });
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
  } | null>(null);

  useEffect(() => {
    const savedConfig = localStorage.getItem("ai_config");
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }
  }, []);

  const handleProviderChange = (provider: string) => {
    const defaultConfig = DEFAULT_CONFIGS[provider];
    setConfig({
      ...config,
      provider: provider as AIConfig["provider"],
      ...defaultConfig,
    });
  };

  const handleSave = () => {
    localStorage.setItem("ai_config", JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    if (!config.apiKey || !config.modelName) {
      setTestResult({
        success: false,
        message: "请先填写 API Key 和模型名称",
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/test-ai-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      const data = await response.json();

      if (response.ok) {
        setTestResult({
          success: true,
          message: "连接成功！AI 配置正常工作",
          details: data.details,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || "测试失败",
          details: data.details,
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: "网络错误或服务不可用",
        details: error instanceof Error ? error.message : "未知错误",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AI 设置
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              配置 AI 模型提供商和参数
            </p>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>AI 提供商配置</CardTitle>
            <CardDescription>
              支持 Anthropic Claude、OpenAI 或自定义第三方 API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 提供商选择 */}
            <div className="space-y-2">
              <Label htmlFor="provider">提供商</Label>
              <Select
                value={config.provider}
                onValueChange={handleProviderChange}
              >
                <SelectTrigger id="provider">
                  <SelectValue placeholder="选择提供商" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                  <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                  <SelectItem value="custom">自定义第三方</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder={
                  config.provider === "anthropic"
                    ? "sk-ant-xxxxx"
                    : config.provider === "openai"
                    ? "sk-xxxxx"
                    : "your-api-key"
                }
                value={config.apiKey}
                onChange={(e) =>
                  setConfig({ ...config, apiKey: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                {config.provider === "anthropic" &&
                  "从 https://console.anthropic.com 获取"}
                {config.provider === "openai" &&
                  "从 https://platform.openai.com 获取"}
                {config.provider === "custom" && "输入第三方 API Key"}
              </p>
            </div>

            {/* Base URL (可选) */}
            <div className="space-y-2">
              <Label htmlFor="baseURL">
                Base URL <span className="text-muted-foreground">(可选)</span>
              </Label>
              <Input
                id="baseURL"
                type="url"
                placeholder={
                  config.provider === "anthropic"
                    ? "留空使用官方 API，或填写代理地址"
                    : config.provider === "openai"
                    ? "留空使用官方 API，或填写代理地址"
                    : "https://your-api-endpoint.com/v1"
                }
                value={config.baseURL}
                onChange={(e) =>
                  setConfig({ ...config, baseURL: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                用于代理服务或自定义 API 端点
              </p>
            </div>

            {/* Model Name */}
            <div className="space-y-2">
              <Label htmlFor="modelName">模型名称</Label>
              <Input
                id="modelName"
                type="text"
                placeholder={
                  config.provider === "anthropic"
                    ? "claude-3-5-sonnet-20241022"
                    : config.provider === "openai"
                    ? "gpt-4-turbo-preview"
                    : "your-model-name"
                }
                value={config.modelName}
                onChange={(e) =>
                  setConfig({ ...config, modelName: e.target.value })
                }
              />
              <div className="text-xs text-muted-foreground space-y-1">
                {config.provider === "anthropic" && (
                  <div>
                    <p className="font-medium">常用模型：</p>
                    <ul className="list-disc list-inside space-y-0.5 ml-2">
                      <li>claude-3-5-sonnet-20241022 (推荐)</li>
                      <li>claude-3-opus-20240229</li>
                      <li>claude-3-haiku-20240307</li>
                    </ul>
                  </div>
                )}
                {config.provider === "openai" && (
                  <div>
                    <p className="font-medium">常用模型：</p>
                    <ul className="list-disc list-inside space-y-0.5 ml-2">
                      <li>gpt-4-turbo-preview</li>
                      <li>gpt-4</li>
                      <li>gpt-3.5-turbo</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* 测试和保存按钮 */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={testing}
                className="flex-1"
              >
                <TestTube2 className="h-4 w-4 mr-2" />
                {testing ? "测试中..." : "测试连接"}
              </Button>
              <Button onClick={handleSave} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                {saved ? "已保存" : "保存配置"}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/")}
              >
                返回主页
              </Button>
            </div>

            {/* 测试结果 */}
            {testResult && (
              <div
                className={`p-4 rounded-lg border text-sm ${
                  testResult.success
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}
              >
                <div className="flex items-center gap-2 font-medium">
                  {testResult.success ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  {testResult.message}
                </div>
                {testResult.details && (
                  <div className="mt-2 text-xs opacity-75">
                    {testResult.details}
                  </div>
                )}
              </div>
            )}

            {saved && (
              <div className="p-3 bg-green-50 text-green-700 rounded-lg border border-green-200 text-sm">
                ✓ 配置已保存到浏览器本地存储
              </div>
            )}
          </CardContent>
        </Card>

        {/* 使用说明 */}
        <Card>
          <CardHeader>
            <CardTitle>使用说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">1. 官方 API</p>
              <p>直接使用 Anthropic 或 OpenAI 官方服务，Base URL 留空即可</p>
            </div>
            <div>
              <p className="font-medium text-foreground">2. 代理服务</p>
              <p>
                如果使用代理服务（如 claude-relay），填写完整的 Base URL（包含路径）
              </p>
              <p className="text-xs mt-1">
                示例：https://your-proxy.com/claude-proxy/your-account
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground">3. 数据安全</p>
              <p>所有配置仅保存在浏览器本地，不会上传到服务器</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
