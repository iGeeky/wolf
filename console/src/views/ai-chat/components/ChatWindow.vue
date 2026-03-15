<template>
  <div class="chat-window">
    <!-- 消息列表区域 -->
    <div ref="scrollRef" class="message-list">
      <!-- 空状态 -->
      <div v-if="messages.length === 0 && !isStreaming" class="empty-state">
        <el-icon class="empty-icon"><ChatDotRound /></el-icon>
        <p class="empty-title">{{ t("wolf.aiChat.title") }}</p>
        <p class="empty-desc">{{ t("wolf.aiChat.welcomeDesc") }}</p>
        <div class="quick-actions">
          <el-tag
            v-for="hint in quickHints"
            :key="hint"
            class="quick-tag"
            @click="emit('send', hint)"
            >{{ hint }}</el-tag
          >
        </div>
      </div>

      <!-- 消息气泡 -->
      <MessageBubble v-for="msg in messages" :key="msg.id" :message="msg" />

      <!-- 错误提示 -->
      <div v-if="error" class="error-banner">
        <el-icon><WarningFilled /></el-icon>
        {{ error }}
      </div>
    </div>

    <!-- 输入区域 -->
    <InputArea :disabled="isStreaming" @send="text => emit('send', text)" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from "vue";
import { useI18n } from "vue-i18n";
import { ChatDotRound, WarningFilled } from "@element-plus/icons-vue";
import MessageBubble from "./MessageBubble.vue";
import InputArea from "./InputArea.vue";
import type { DisplayMessage } from "../hooks/useChat";

const { t } = useI18n();

const quickHints = computed(() => [
  t("wolf.aiChat.hint1"),
  t("wolf.aiChat.hint2"),
  t("wolf.aiChat.hint3"),
  t("wolf.aiChat.hint4"),
  t("wolf.aiChat.hint5")
]);

const props = defineProps<{
  messages: DisplayMessage[];
  isStreaming: boolean;
  error: string | null;
}>();

const emit = defineEmits<{
  send: [text: string];
}>();

const scrollRef = ref<HTMLElement | null>(null);

/** 自动滚动到底部 */
async function scrollToBottom() {
  await nextTick();
  if (scrollRef.value) {
    scrollRef.value.scrollTop = scrollRef.value.scrollHeight;
  }
}

watch(
  () => props.messages.length,
  () => scrollToBottom()
);

watch(
  () => props.isStreaming,
  async val => {
    if (val) await scrollToBottom();
  }
);
</script>

<style scoped>
.chat-window {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  scroll-behavior: smooth;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
  text-align: center;
  padding: 40px;
}

.empty-icon {
  font-size: 64px;
  color: #c0c4cc;
  margin-bottom: 16px;
}

.empty-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px;
}

.empty-desc {
  font-size: 14px;
  margin: 0 0 16px;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  max-width: 400px;
}

.quick-tag {
  cursor: pointer;
  border-radius: 16px;
}

.quick-tag:hover {
  background: #6366f1;
  color: #fff;
  border-color: #6366f1;
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #fef0f0;
  border: 1px solid #fbc4c4;
  border-radius: 8px;
  color: #f56c6c;
  font-size: 13px;
  margin-top: 8px;
}
</style>
