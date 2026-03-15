<template>
  <div class="ai-chat-page">
    <!-- 左侧：会话列表 -->
    <div class="sidebar">
      <SessionList
        :sessions="sessions"
        :active-session-id="activeSessionId"
        :loading="sessionsLoading"
        :stream-busy="isStreaming"
        :session-known-empty="isSessionKnownEmpty"
        @select="handleSelectSession"
        @delete="handleDeleteSession"
        @rename="handleRenameSession"
        @new-session="handleNewSession"
        @auto-rename="handleManualAutoRename"
        @open-memory="memoryPanelVisible = true"
      />
    </div>

    <!-- 右侧：对话区域 -->
    <div class="main-area">
      <!-- 会话标题栏 -->
      <div v-if="currentSession" class="chat-header">
        <span class="chat-title">{{
          currentSession.title || t("wolf.aiChat.newChat")
        }}</span>
      </div>
      <div v-else class="chat-header">
        <span class="chat-title" style="color: #909399">{{
          t("wolf.aiChat.selectOrCreate")
        }}</span>
      </div>

      <ChatWindow
        :messages="messages"
        :is-streaming="isStreaming"
        :error="error"
        @send="handleSend"
      />
    </div>

    <!-- 记忆管理面板 -->
    <MemoryPanel v-model="memoryPanelVisible" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessageBox } from "element-plus";
import SessionList from "./components/SessionList.vue";
import ChatWindow from "./components/ChatWindow.vue";
import MemoryPanel from "./components/MemoryPanel.vue";
import { useSessions } from "./hooks/useSessions";
import { useChat } from "./hooks/useChat";

const { t } = useI18n();

const memoryPanelVisible = ref(false);

const {
  sessions,
  loading: sessionsLoading,
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
} = useSessions();

const {
  messages,
  isStreaming,
  error,
  loadHistory,
  clearMessages,
  sendMessage
} = useChat();

const currentSession = computed(
  () => sessions.value.find(s => s.id === activeSessionId.value) ?? null
);

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** 初始化：加载会话列表 */
onMounted(async () => {
  await loadSessions();
  if (sessions.value.length > 0) {
    await handleSelectSession(sessions.value[0].id);
  }
});

/** 切换会话 */
async function handleSelectSession(id: number) {
  if (activeSessionId.value === id && messages.value.length > 0) return;
  selectSession(id);
  clearMessages();
  const total = await loadHistory(id);
  if (total === 0) {
    markSessionKnownEmpty(id);
  } else if (total != null && total > 0) {
    markSessionKnownHasMessages(id);
  }
}

/** 新建会话：立即创建并显示在列表，标题 新会话YY-MM-DD-HH */
async function handleNewSession() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const title =
    t("wolf.aiChat.newSessionPrefix") +
    yy +
    "-" +
    pad2(now.getMonth() + 1) +
    "-" +
    pad2(now.getDate()) +
    "-" +
    pad2(now.getHours());
  const newId = await newSession(title);
  if (newId != null) {
    clearMessages();
    selectSession(newId);
  }
}

/** 删除会话 */
async function handleDeleteSession(id: number) {
  try {
    await ElMessageBox.confirm(
      t("wolf.aiChat.confirmDelete"),
      t("wolf.aiChat.prompt"),
      {
        type: "warning",
        confirmButtonText: t("wolf.aiChat.confirmDeleteBtn"),
        cancelButtonText: t("wolf.btnCancel")
      }
    );
    const wasActive = activeSessionId.value === id;
    let nextId: number | null = null;
    if (wasActive && sessions.value.length > 1) {
      const idx = sessions.value.findIndex(s => s.id === id);
      nextId =
        idx < sessions.value.length - 1
          ? sessions.value[idx + 1].id
          : sessions.value[idx - 1].id;
    }
    await removeSession(id);
    if (wasActive) {
      clearMessages();
      if (nextId != null) {
        await handleSelectSession(nextId);
      } else {
        activeSessionId.value = null;
      }
    }
  } catch {
    // user cancelled
  }
}

/** 重命名会话 */
async function handleRenameSession(id: number, title: string) {
  await renameSessionTitle(id, title);
}

/** 手动 AI 重命名当前选中会话 */
async function handleManualAutoRename(sessionId: number) {
  if (!sessionId || sessionId <= 0) return;
  await manualAutoRenameSession(sessionId);
}

/** 发送消息 */
async function handleSend(text: string) {
  const priorEmpty = messages.value.length === 0;
  const sessionId =
    activeSessionId.value && activeSessionId.value > 0
      ? activeSessionId.value
      : undefined;

  const result = await sendMessage(text, sessionId, (newSessionId, title) => {
    onSessionCreated(newSessionId, title);
  });

  if (result.success && result.sessionId && result.sessionId > 0) {
    markSessionKnownHasMessages(result.sessionId);
  }

  if (
    priorEmpty &&
    result.success &&
    result.sessionId &&
    result.sessionId > 0
  ) {
    await autoRenameSessionTitle(result.sessionId);
  }
}

/** 切换会话时，如果当前 activeSessionId 改变，自动加载对应历史 */
watch(activeSessionId, newId => {
  if (newId && newId > 0) {
    // handled by handleSelectSession
  }
});
</script>

<style scoped>
.ai-chat-page {
  display: flex;
  height: calc(100vh - 100px);
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.sidebar {
  width: 260px;
  flex-shrink: 0;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  background: #fafafa;
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chat-header {
  padding: 10px 16px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 8px;
}

.chat-title {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
</style>
