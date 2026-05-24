import { unref } from "vue";
import { http, type WolfResponse } from "@/utils/http";
import { getWolfToken } from "@/utils/auth";
import { i18n } from "@/plugins/i18n";

/** AI 聊天会话 */
export interface ChatSession {
  id: number;
  userID: number;
  title: string;
  appID?: string;
  status: number;
  createTime: number;
  updateTime: number;
}

/** AI 聊天消息（数据库记录格式） */
export interface ChatMessage {
  id: number;
  sessionID: number;
  role: string;
  content: any;
  tokenUsage?: { input: number; output: number; cost: number } | null;
  createTime: number;
}

/** 记忆分类 */
export type MemoryCategory = "preference" | "knowledge" | "decision" | "pattern";

/** 用户记忆 */
export interface UserMemory {
  id: number;
  userID: number;
  sessionID?: number | null;
  sessionTitle?: string | null;
  category: MemoryCategory;
  content: string;
  source: "auto" | "manual";
  status: number;
  createTime: number;
  updateTime: number;
}

/** SSE 事件类型 */
export type SseEventType =
  | "session_created"
  | "agent_start"
  | "message_start"
  | "message_update"
  | "message_end"
  | "tool_execution_start"
  | "tool_execution_end"
  | "done"
  | "error";

/** SSE 事件数据 */
export interface SseEvent {
  type: SseEventType;
  sessionId?: number;
  message?: any;
  event?: any;
  toolCallId?: string;
  toolName?: string;
  args?: any;
  isError?: boolean;
  tokenUsage?: { input: number; output: number; cost: number };
  error?: string;
}

function acceptLanguageHeader(): string {
  const loc = unref(i18n.global.locale);
  return loc === "zh"
    ? "zh-CN,zh;q=0.9,en;q=0.8"
    : "en-US,en;q=0.9,zh-CN;q=0.8";
}

/** 获取会话列表 */
export const listSessions = (params?: { page?: number; limit?: number }) =>
  http.request<WolfResponse<{ sessions: ChatSession[]; total: number }>>(
    "get",
    "/ai-chat/sessions",
    { params }
  );

/** 创建新会话 */
export const createSession = (data: { title?: string; appID?: string }) =>
  http.request<WolfResponse<{ session: ChatSession }>>(
    "post",
    "/ai-chat/createSession",
    { data }
  );

/** 删除会话 */
export const deleteSession = (id: number) =>
  http.request<WolfResponse>("delete", "/ai-chat/deleteSession", {
    data: { id }
  });

/** 重命名会话 */
export const renameSession = (id: number, title: string) =>
  http.request<WolfResponse>("put", "/ai-chat/renameSession", {
    data: { id, title }
  });

/** AI 根据对话内容生成并更新会话标题 */
export const autoRenameSession = (sessionId: number) =>
  http.request<WolfResponse<{ title: string }>>(
    "post",
    "/ai-chat/autoRenameSession",
    { data: { id: sessionId } }
  );

/** 获取会话消息列表 */
export const getMessages = (
  sessionId: number,
  params?: { page?: number; limit?: number }
) =>
  http.request<WolfResponse<{ messages: ChatMessage[]; total: number }>>(
    "get",
    "/ai-chat/messages",
    { params: { sessionId, ...params } }
  );

/** 获取用户记忆列表 */
export const listMemories = (params?: {
  category?: MemoryCategory;
  page?: number;
  limit?: number;
}) =>
  http.request<WolfResponse<{ memories: UserMemory[]; total: number }>>(
    "get",
    "/ai-chat/memories",
    { params }
  );

/** 手动添加一条记忆 */
export const addMemory = (data: { category: MemoryCategory; content: string }) =>
  http.request<WolfResponse<{ memory: UserMemory }>>(
    "post",
    "/ai-chat/memory",
    { data }
  );

/** 编辑一条记忆 */
export const updateMemory = (data: {
  id: number;
  category?: MemoryCategory;
  content?: string;
}) =>
  http.request<WolfResponse<{ memory: UserMemory }>>(
    "put",
    "/ai-chat/memory",
    { data }
  );

/** 删除一条记忆（软删除） */
export const deleteMemory = (id: number) =>
  http.request<WolfResponse>("delete", "/ai-chat/memory", {
    data: { id }
  });

/**
 * 发起 SSE 流式对话
 *
 * 使用原生 fetch + ReadableStream，不经过 axios。
 * 返回一个 AsyncGenerator，每次 yield 一个解析后的 SseEvent。
 *
 * @param message   - 用户消息
 * @param sessionId - 会话ID（不传则自动创建新会话）
 * @param appID     - 关联应用ID
 */
export async function* chatStream(
  message: string,
  sessionId?: number,
  appID?: string
): AsyncGenerator<SseEvent, void, unknown> {
  const token = getWolfToken();
  const baseURL =
    import.meta.env.MODE === "production"
      ? import.meta.env.VITE_API_BASE_URL || "/wolf"
      : "/wolf";

  const t = i18n.global.t.bind(i18n.global);

  const response = await fetch(`${baseURL}/ai-chat/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-rbac-token": token || "",
      "Accept-Language": acceptLanguageHeader()
    },
    body: JSON.stringify({ message, sessionId, appID })
  });

  if (!response.ok) {
    let errPayload: { reason?: string; errmsg?: string } | null = null;
    try {
      errPayload = await response.json();
    } catch {
      errPayload = null;
    }
    const friendly =
      (errPayload?.errmsg && String(errPayload.errmsg).trim()) ||
      (errPayload?.reason === "AI_NOT_CONFIGURED"
        ? String(t("wolf.aiChat.aiNotConfigured"))
        : "") ||
      `HTTP ${response.status}: ${response.statusText}`;
    yield { type: "error", error: friendly };
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    yield { type: "error", error: String(t("wolf.aiChat.noResponseBody")) };
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          try {
            const event: SseEvent = JSON.parse(jsonStr);
            yield event;
          } catch {
            // skip malformed lines
          }
        }
      }
    }

    // 处理缓冲区中剩余数据
    if (buffer.startsWith("data: ")) {
      const jsonStr = buffer.slice(6).trim();
      if (jsonStr) {
        try {
          const event: SseEvent = JSON.parse(jsonStr);
          yield event;
        } catch {
          // ignore
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
