import { ref, triggerRef, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { chatStream, getMessages, type ChatMessage } from "@/api/ai-chat";
import { stripAssistantVisibleArtifacts } from "../utils/strip-assistant-visible";

/** 前端展示用的消息类型 */
export interface DisplayMessage {
  id: string;
  role: "user" | "assistant" | "toolResult";
  /** 文字内容（流式更新） */
  text: string;
  /** 是否正在流式输出 */
  streaming: boolean;
  /** 工具调用列表（assistant 消息携带时） */
  toolCalls?: ToolCallDisplay[];
  /** token 使用情况 */
  tokenUsage?: { input: number; output: number; cost: number } | null;
  createTime?: number;
}

export interface ToolCallDisplay {
  toolCallId: string;
  toolName: string;
  args?: any;
  status: "running" | "done" | "error";
  result?: any;
}

export interface SendMessageResult {
  success: boolean;
  sessionId: number | null;
}

export function useChat() {
  const { t } = useI18n();
  const messages = ref<DisplayMessage[]>([]);
  const isStreaming = ref(false);
  const error = ref<string | null>(null);
  const currentSessionId = ref<number | null>(null);

  /** 将数据库消息转换为展示格式 */
  function dbMsgToDisplay(dbMsg: ChatMessage): DisplayMessage {
    const content = dbMsg.content;
    let text = "";

    const role = (dbMsg.role as DisplayMessage["role"]) || "assistant";

    if (Array.isArray(content?.content)) {
      const textBlocks = content.content.filter((c: any) => c.type === "text");
      text = textBlocks.map((c: any) => c.text || "").join("\n");
    } else if (typeof content === "string") {
      text = content;
    } else if (content?.text) {
      text = content.text;
    }

    if (role === "assistant") {
      text = stripAssistantVisibleArtifacts(text);
    }

    return {
      id: String(dbMsg.id),
      role,
      text,
      streaming: false,
      tokenUsage: dbMsg.tokenUsage,
      createTime: dbMsg.createTime
    };
  }

  /** 加载历史消息；返回服务端该会话消息总数（用于判断是否「已确认空会话」），失败为 null */
  async function loadHistory(sessionId: number): Promise<number | null> {
    currentSessionId.value = sessionId;
    try {
      const res = await getMessages(sessionId, { limit: 100 });
      if (res.ok && res.data) {
        messages.value = res.data.messages.map(dbMsgToDisplay);
        return typeof res.data.total === "number" ? res.data.total : null;
      }
    } catch (err: any) {
      error.value =
        t("wolf.aiChat.loadHistoryFailed") +
        ": " +
        (err.message || t("wolf.aiChat.unknownError"));
    }
    return null;
  }

  /** 清空消息（切换会话时） */
  function clearMessages() {
    messages.value = [];
    error.value = null;
    isStreaming.value = false;
  }

  /** 发送消息并处理 SSE 流 */
  async function sendMessage(
    text: string,
    sessionId?: number,
    onSessionCreated?: (id: number, title: string) => void
  ): Promise<SendMessageResult> {
    if (isStreaming.value) {
      return { success: false, sessionId: currentSessionId.value };
    }
    if (!text.trim()) {
      return { success: false, sessionId: currentSessionId.value };
    }

    if (sessionId && sessionId > 0) {
      currentSessionId.value = sessionId;
    }

    error.value = null;
    isStreaming.value = true;
    let failed = false;

    // 立即追加用户消息
    messages.value.push({
      id: `user-${Date.now()}`,
      role: "user",
      text,
      streaming: false
    });

    // 立即追加一个空的助手占位消息，让用户马上看到正在处理的动效
    messages.value.push({
      id: `assistant-pending-${Date.now()}`,
      role: "assistant",
      text: "",
      streaming: true,
      toolCalls: []
    });
    // 当前 assistant 消息（流式更新）
    let assistantMsg: DisplayMessage | null =
      messages.value[messages.value.length - 1];
    // 工具调用 map：toolCallId -> ToolCallDisplay
    const toolCallMap = new Map<string, ToolCallDisplay>();

    try {
      for await (const event of chatStream(text, sessionId)) {
        switch (event.type) {
          case "session_created":
            if (event.sessionId) {
              currentSessionId.value = event.sessionId;
              onSessionCreated?.(event.sessionId, text.slice(0, 20));
            }
            break;

          case "message_start":
            if (event.message?.role === "assistant") {
              // 复用条件：上一条 assistant 消息没有工具调用。
              // 这样思考阶段产生的临时消息会被后续正式回复覆盖，
              // 而带工具调用的消息则保留（新建一条用于最终回复）。
              if (assistantMsg && !(assistantMsg.toolCalls?.length)) {
                assistantMsg.text = "";
                assistantMsg.streaming = true;
                assistantMsg.toolCalls = [];
                triggerRef(messages);
              } else {
                messages.value.push({
                  id: `assistant-${Date.now()}`,
                  role: "assistant",
                  text: "",
                  streaming: true,
                  toolCalls: []
                });
                assistantMsg = messages.value[messages.value.length - 1];
              }
            }
            break;

          case "message_update": {
            if (!assistantMsg) break;
            const ev = event.event;
            if (!ev) break;

            if (
              ev.type === "thinking_start" ||
              ev.type === "thinking_delta" ||
              ev.type === "thinking_end"
            ) {
              break;
            }

            if (ev.type === "text_delta") {
              // pi-mono text_delta: ev.delta is a string (the text chunk)
              if (typeof ev.delta === "string") {
                assistantMsg.text += ev.delta;
              } else if (ev.delta?.text) {
                assistantMsg.text += ev.delta.text;
              }
              assistantMsg.text = stripAssistantVisibleArtifacts(
                assistantMsg.text
              );
              triggerRef(messages);
            } else if (
              ev.type === "content_block_delta" &&
              ev.delta?.type === "text_delta"
            ) {
              assistantMsg.text += ev.delta.text || "";
              assistantMsg.text = stripAssistantVisibleArtifacts(
                assistantMsg.text
              );
              triggerRef(messages);
            }
            break;
          }

          case "message_end": {
            // 只处理 assistant 的 message_end；agent 框架也会为 user 消息
            // 发送 message_end，必须跳过，否则会破坏预创建的占位消息
            if (event.message?.role && event.message.role !== "assistant") {
              break;
            }
            if (assistantMsg) {
              assistantMsg.streaming = false;
              if (event.message?.content) {
                const content = event.message.content;
                const textBlocks = Array.isArray(content)
                  ? (content as any[]).filter((c: any) => c.type === "text")
                  : typeof content === "string"
                    ? [{ text: content }]
                    : [];
                if (textBlocks.length > 0) {
                  assistantMsg.text = stripAssistantVisibleArtifacts(
                    textBlocks.map((c: any) => c.text).join("\n")
                  );
                }
              }
              triggerRef(messages);
              // 不置空 assistantMsg：thinking 模型会产生多轮 message 周期，
              // 保留引用让下一轮 message_start 可以复用（覆盖思考内容）
            }
            break;
          }

          case "tool_execution_start": {
            const tc: ToolCallDisplay = {
              toolCallId: event.toolCallId || "",
              toolName: event.toolName || "",
              args: event.args,
              status: "running"
            };
            toolCallMap.set(tc.toolCallId, tc);
            // 找到当前 assistant 消息追加工具调用卡片
            const lastAssistant = [...messages.value]
              .reverse()
              .find(m => m.role === "assistant");
            if (lastAssistant) {
              lastAssistant.toolCalls = lastAssistant.toolCalls || [];
              lastAssistant.toolCalls.push(tc);
            }
            break;
          }

          case "tool_execution_end": {
            const lastAst = [...messages.value]
              .reverse()
              .find(m => m.role === "assistant");
            if (lastAst?.toolCalls) {
              const tc = lastAst.toolCalls.find(
                item => item.toolCallId === (event.toolCallId || "")
              );
              if (tc) {
                tc.status = event.isError ? "error" : "done";
              }
            }
            triggerRef(messages);
            break;
          }

          case "done":
            // 会话统计（可选：更新最后一条 assistant 消息的 tokenUsage）
            break;

          case "error":
            failed = true;
            error.value = event.error || t("wolf.aiChat.aiServiceError");
            break;
        }

        // 确保视图更新后滚动到底部（catch 防止组件渲染错误中断 SSE 循环）
        await nextTick().catch(() => {});
      }
    } catch (err: any) {
      failed = true;
      error.value =
        t("wolf.aiChat.connectFailed") +
        ": " +
        (err.message || t("wolf.aiChat.unknownError"));
      if (assistantMsg) {
        assistantMsg.streaming = false;
        assistantMsg.text =
          assistantMsg.text || t("wolf.aiChat.streamInterrupted");
        triggerRef(messages);
      }
    } finally {
      isStreaming.value = false;
      if (assistantMsg) {
        assistantMsg.streaming = false;

        // 如果 assistant 消息内容为空（无文本且无工具调用），说明 AI 没有返回任何内容。
        // 移除该空占位消息，并在未设置错误时提示用户检查模型配置。
        const isEmpty =
          !assistantMsg.text.trim() && !(assistantMsg.toolCalls?.length);
        if (isEmpty) {
          const idx = messages.value.indexOf(assistantMsg);
          if (idx !== -1) messages.value.splice(idx, 1);
          if (!failed) {
            failed = true;
            error.value = t("wolf.aiChat.emptyResponse");
          }
        }

        triggerRef(messages);
      }
    }

    return {
      success: !failed,
      sessionId: currentSessionId.value
    };
  }

  return {
    messages,
    isStreaming,
    error,
    currentSessionId,
    loadHistory,
    clearMessages,
    sendMessage
  };
}
