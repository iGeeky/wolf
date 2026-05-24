import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessage } from "element-plus";
import {
  listSessions,
  createSession,
  deleteSession,
  renameSession,
  autoRenameSession,
  type ChatSession
} from "@/api/ai-chat";

export function useSessions() {
  const { t } = useI18n();
  const sessions = ref<ChatSession[]>([]);
  const loading = ref(false);
  const activeSessionId = ref<number | null>(null);

  /**
   * 已确认「当前没有消息」的会话 id（本页内）：
   * - 刚点「新建」创建的会话
   * - SSE 首条消息新建的会话（在写入消息前）
   * - 用户点开并拉取历史后 total===0
   * 不在集合内的会话侧栏仍显示自动重命名（未点开过的历史会话不额外查库）
   */
  const sessionIdsKnownEmpty = ref<Set<number>>(new Set());

  function markSessionKnownEmpty(id: number) {
    const next = new Set(sessionIdsKnownEmpty.value);
    next.add(id);
    sessionIdsKnownEmpty.value = next;
  }

  function markSessionKnownHasMessages(id: number) {
    if (!sessionIdsKnownEmpty.value.has(id)) return;
    const next = new Set(sessionIdsKnownEmpty.value);
    next.delete(id);
    sessionIdsKnownEmpty.value = next;
  }

  function isSessionKnownEmpty(id: number): boolean {
    return sessionIdsKnownEmpty.value.has(id);
  }

  /** 加载会话列表 */
  async function loadSessions() {
    loading.value = true;
    try {
      const res = await listSessions({ limit: 50 });
      if (res.ok && res.data) {
        sessions.value = res.data.sessions;
      }
    } catch (err: any) {
      ElMessage.error(
        t("wolf.aiChat.loadSessionsFailed") +
          ": " +
          (err.message || t("wolf.aiChat.unknownError"))
      );
    } finally {
      loading.value = false;
    }
  }

  /** 创建新会话 */
  async function newSession(
    title?: string,
    appID?: string
  ): Promise<number | null> {
    try {
      const res = await createSession({
        title: title || t("wolf.aiChat.newChat"),
        appID
      });
      if (res.ok && res.data?.session) {
        const sid = res.data.session.id;
        sessions.value.unshift(res.data.session);
        activeSessionId.value = sid;
        markSessionKnownEmpty(sid);
        return sid;
      }
    } catch (err: any) {
      ElMessage.error(
        t("wolf.aiChat.createSessionFailed") +
          ": " +
          (err.message || t("wolf.aiChat.unknownError"))
      );
    }
    return null;
  }

  /** 删除会话 */
  async function removeSession(id: number) {
    try {
      const res = await deleteSession(id);
      if (res.ok) {
        sessions.value = sessions.value.filter(s => s.id !== id);
        markSessionKnownHasMessages(id);
        ElMessage.success(t("wolf.aiChat.sessionDeleted"));
      }
    } catch (err: any) {
      ElMessage.error(
        t("wolf.aiChat.deleteSessionFailed") +
          ": " +
          (err.message || t("wolf.aiChat.unknownError"))
      );
    }
  }

  /** 重命名会话 */
  async function renameSessionTitle(id: number, title: string) {
    try {
      const res = await renameSession(id, title);
      if (res.ok) {
        const session = sessions.value.find(s => s.id === id);
        if (session) {
          session.title = title;
        }
      }
    } catch (err: any) {
      ElMessage.error(
        t("wolf.aiChat.renameFailed") +
          ": " +
          (err.message || t("wolf.aiChat.unknownError"))
      );
    }
  }

  /** AI 自动重命名（静默更新列表中的标题，无单独会话） */
  async function autoRenameSessionTitle(id: number) {
    try {
      const res = await autoRenameSession(id);
      if (res.ok && res.data?.title) {
        const session = sessions.value.find(s => s.id === id);
        if (session) {
          session.title = res.data.title;
        }
      }
    } catch {
      // 静默失败，不影响主流程
    }
  }

  /** 手动触发 AI 重命名当前会话（有成功/失败提示） */
  async function manualAutoRenameSession(id: number) {
    try {
      const res = await autoRenameSession(id);
      if (res.ok && res.data?.title) {
        const session = sessions.value.find(s => s.id === id);
        if (session) {
          session.title = res.data.title;
        }
        ElMessage.success(t("wolf.aiChat.autoRenameSuccess"));
        return;
      }
      const reason =
        res && typeof res === "object" && "reason" in res
          ? String((res as { reason?: string }).reason || "")
          : "";
      if (reason === "ERR_NO_MESSAGES_FOR_TITLE") {
        ElMessage.warning(t("wolf.aiChat.autoRenameNoMessages"));
      } else {
        ElMessage.error(t("wolf.aiChat.autoRenameFailed"));
      }
    } catch (err: any) {
      ElMessage.error(
        t("wolf.aiChat.autoRenameFailed") +
          (err?.message ? `: ${err.message}` : "")
      );
    }
  }

  /** 设置活跃会话 */
  function selectSession(id: number) {
    activeSessionId.value = id;
  }

  /** 根据 session_created 事件更新列表 */
  function onSessionCreated(sessionId: number, title: string) {
    const existing = sessions.value.find(s => s.id === sessionId);
    if (!existing) {
      sessions.value.unshift({
        id: sessionId,
        userID: 0,
        title,
        status: 1,
        createTime: Math.floor(Date.now() / 1000),
        updateTime: Math.floor(Date.now() / 1000)
      });
      markSessionKnownEmpty(sessionId);
    }
    activeSessionId.value = sessionId;
  }

  return {
    sessions,
    loading,
    activeSessionId,
    loadSessions,
    newSession,
    removeSession,
    renameSessionTitle,
    selectSession,
    onSessionCreated,
    autoRenameSessionTitle,
    manualAutoRenameSession,
    isSessionKnownEmpty,
    markSessionKnownEmpty,
    markSessionKnownHasMessages
  };
}
