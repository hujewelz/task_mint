"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  GenerateTaskRequest,
  GenerateTaskResponse,
  Role,
  UnavailableSlot,
} from "@/types/task";
import { Loader2, Plus, Trash2, Link2, FileText, Settings, Copy, Download, Clock, Calendar, User, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [inputMode, setInputMode] = useState<"text" | "link">("text");
  const [prd, setPrd] = useState("");
  const [prdLink, setPrdLink] = useState("");
  const [role, setRole] = useState<Role>("Frontend");
  const [deadline, setDeadline] = useState("");
  const [unavailableSlots, setUnavailableSlots] = useState<UnavailableSlot[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateTaskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "json">("list");
  const [copySuccess, setCopySuccess] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const addUnavailableSlot = () => {
    setUnavailableSlots([
      ...unavailableSlots,
      {
        date: "",
        isFullDay: false,
        startTime: "",
        endTime: "",
      },
    ]);
  };

  const removeUnavailableSlot = (index: number) => {
    setUnavailableSlots(unavailableSlots.filter((_, i) => i !== index));
  };

  const updateUnavailableSlot = (
    index: number,
    field: keyof UnavailableSlot,
    value: string | boolean
  ) => {
    const updatedSlots = [...unavailableSlots];
    updatedSlots[index] = { ...updatedSlots[index], [field]: value };
    setUnavailableSlots(updatedSlots);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Check AI configuration first
      const aiConfig = localStorage.getItem("ai_config");
      const config = aiConfig ? JSON.parse(aiConfig) : null;

      if (!config || !config.provider || !config.apiKey || !config.modelName) {
        throw new Error("Please configure AI settings first. Click the 'AI Settings' button in the top right corner to set up your AI provider, API key, and model.");
      }

      let prdContent = prd;

      if (inputMode === "link") {
        if (!prdLink) {
          throw new Error("请输入文档链接");
        }
        const fetchResponse = await fetch("/api/fetch-prd", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: prdLink }),
        });

        if (!fetchResponse.ok) {
          throw new Error("无法获取文档内容，请检查链接是否正确");
        }

        const fetchData = await fetchResponse.json();
        prdContent = fetchData.content;
      }

      const requestData: GenerateTaskRequest = {
        prd: prdContent,
        role,
        deadline,
        unavailableSlots: unavailableSlots.filter((slot) => slot.date),
        aiConfig: config,
      };

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "生成失败");
      }

      setResult(data);
      setDialogOpen(true); // 自动打开结果弹窗
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyJson = async () => {
    if (result) {
      try {
        await navigator.clipboard.writeText(JSON.stringify(result.backendTasks, null, 2));
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  const handleDownloadJson = () => {
    if (result) {
      const dataStr = JSON.stringify(result.backendTasks, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });

      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backend-tasks-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex-1 text-center space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Task Mint
            </h1>
            <p className="text-muted-foreground">
              AI 自动任务拆解与排期生成系统
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/settings")}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            AI 设置
          </Button>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* 输入表单 */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>项目信息</CardTitle>
              <CardDescription>
                填写 PRD 和项目配置信息，自动生成任务排期
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* PRD 输入 */}
                <div className="space-y-3">
                  <Label>PRD 内容</Label>
                  <div className="flex gap-2 mb-3">
                    <Button
                      type="button"
                      variant={inputMode === "text" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setInputMode("text")}
                      className="flex items-center gap-1"
                    >
                      <FileText className="h-4 w-4" />
                      文本输入
                    </Button>
                    <Button
                      type="button"
                      variant={inputMode === "link" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setInputMode("link")}
                      className="flex items-center gap-1"
                    >
                      <Link2 className="h-4 w-4" />
                      文档链接
                    </Button>
                  </div>

                  {inputMode === "text" ? (
                    <Textarea
                      placeholder="请输入 PRD 内容..."
                      value={prd}
                      onChange={(e) => setPrd(e.target.value)}
                      className="min-h-32"
                      required
                    />
                  ) : (
                    <Input
                      placeholder="请输入文档链接（如：Notion, 飞书文档等）"
                      value={prdLink}
                      onChange={(e) => setPrdLink(e.target.value)}
                      required
                    />
                  )}
                </div>

                {/* 角色选择 */}
                <div className="space-y-2">
                  <Label htmlFor="role">执行角色</Label>
                  <Select
                    value={role}
                    onValueChange={(value: Role) => setRole(value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Frontend">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          前端开发
                        </div>
                      </SelectItem>
                      <SelectItem value="Backend">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          后端开发
                        </div>
                      </SelectItem>
                      <SelectItem value="Test">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          测试工程师
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Deadline */}
                <div className="space-y-2">
                  <Label htmlFor="deadline">项目截止日期</Label>
                  <Input
                    id="deadline"
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    required
                  />
                </div>

                {/* 不可用时间段 */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Label>不可用时间段</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addUnavailableSlot}
                      className="flex items-center gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      添加
                    </Button>
                  </div>
                  {unavailableSlots.map((slot, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Label className="text-xs">日期</Label>
                        <Input
                          type="date"
                          value={slot.date}
                          onChange={(e) =>
                            updateUnavailableSlot(index, "date", e.target.value)
                          }
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs">全天不可用</Label>
                        <Select
                          value={slot.isFullDay ? "true" : "false"}
                          onValueChange={(value) =>
                            updateUnavailableSlot(
                              index,
                              "isFullDay",
                              value === "true"
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">是</SelectItem>
                            <SelectItem value="false">否</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {!slot.isFullDay && (
                        <>
                          <div className="flex-1">
                            <Label className="text-xs">开始时间</Label>
                            <Input
                              type="time"
                              value={slot.startTime}
                              onChange={(e) =>
                                updateUnavailableSlot(
                                  index,
                                  "startTime",
                                  e.target.value
                                )
                              }
                            />
                          </div>
                          <div className="flex-1">
                            <Label className="text-xs">结束时间</Label>
                            <Input
                              type="time"
                              value={slot.endTime}
                              onChange={(e) =>
                                updateUnavailableSlot(
                                  index,
                                  "endTime",
                                  e.target.value
                                )
                              }
                            />
                          </div>
                        </>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeUnavailableSlot(index)}
                        className="mb-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* 提交按钮 */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    "生成任务排期"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* 错误提示 */}
          {error && (
            <div className="mt-6 p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
              <p className="font-semibold">错误</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}
        </div>

        {/* Dialog 弹窗显示结果 */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="fixed inset-0 w-screen h-screen max-w-none max-h-none transform-none overflow-hidden border-0 rounded-none p-0 flex flex-col">
            {/* 固定的头部区域 */}
            <div className="flex-shrink-0 border-b border-border p-6 bg-background">
              <DialogHeader>
                <DialogTitle>生成结果</DialogTitle>
                <DialogDescription>
                  AI 生成的任务拆解和排期计划
                </DialogDescription>
              </DialogHeader>
            </div>

            {/* 可滚动的内容区域 */}
            <div className="flex-1 overflow-y-auto p-6">
              {result && (
              <div className="space-y-4">
                {/* 统计信息 */}
                <div className="grid grid-cols-1 gap-4 max-w-md">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-muted-foreground">
                      总工时
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      {result.totalEstimatedHours}h
                    </p>
                  </div>
                </div>

                {/* 可行性 */}
                <div
                  className={`p-4 rounded-lg border ${
                    result.isFeasible
                      ? "bg-green-50 border-green-200 text-green-700"
                      : "bg-amber-50 border-amber-200 text-amber-700"
                  }`}
                >
                  <p className="font-semibold">
                    {result.isFeasible ? "✓ 排期可行" : "⚠ 时间紧张"}
                  </p>
                  {result.warnings?.map((warning, i) => (
                    <p key={i} className="text-sm mt-1">
                      {warning}
                    </p>
                  ))}
                </div>

                {/* 视图切换和操作按钮 */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button
                      variant={viewMode === "list" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                    >
                      任务列表
                    </Button>
                    <Button
                      variant={viewMode === "json" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("json")}
                    >
                      JSON
                    </Button>
                  </div>
                  {viewMode === "json" && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyJson}
                        className="flex items-center gap-1"
                      >
                        <Copy className="h-4 w-4" />
                        复制
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadJson}
                        className="flex items-center gap-1"
                      >
                        <Download className="h-4 w-4" />
                        下载
                      </Button>
                    </div>
                  )}
                </div>

                {/* 内容展示 */}
                {viewMode === "list" ? (
                  <div className="space-y-3">
                    {result.tasks.map((task, index) => (
                      <div
                        key={task.id}
                        className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-2">
                              {index + 1}. {task.title}
                            </h3>
                            <p className="text-muted-foreground text-sm mb-3">
                              {task.description}
                            </p>
                            <div className="flex flex-wrap gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4 text-blue-500" />
                                <span>{task.estimatedHours}h</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4 text-green-500" />
                                <span>{task.suggestedStartTime}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <User className="h-4 w-4 text-purple-500" />
                                <span>{task.role}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="relative">
                    <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-sm">
                      {JSON.stringify(result.backendTasks, null, 2)}
                    </pre>
                    {copySuccess && (
                      <div className="absolute top-2 right-2">
                        <div className="p-2 bg-green-50 text-green-700 rounded border border-green-200 text-sm text-center">
                          ✓ JSON 已复制到剪贴板
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}