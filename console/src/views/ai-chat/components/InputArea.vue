<template>
  <div class="input-area">
    <el-input
      v-model="inputText"
      type="textarea"
      :rows="3"
      :placeholder="placeholder"
      :disabled="disabled"
      resize="none"
      class="chat-input"
      @keydown.enter.exact.prevent="handleSend"
      @keydown.enter.shift.prevent="handleNewLine"
    />
    <div class="input-actions">
      <span class="hint-text">{{ t("wolf.aiChat.inputHint") }}</span>
      <el-button
        type="primary"
        :disabled="disabled || !inputText.trim()"
        :loading="disabled"
        @click="handleSend"
      >
        <el-icon><Promotion /></el-icon>
        {{ t("wolf.aiChat.send") }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { Promotion } from "@element-plus/icons-vue";

const { t } = useI18n();

const props = defineProps<{
  disabled?: boolean;
  placeholder?: string;
}>();

const emit = defineEmits<{
  send: [text: string];
}>();

const inputText = ref("");

const placeholder = computed(
  () => props.placeholder || t("wolf.aiChat.inputPlaceholder")
);

function handleSend() {
  const text = inputText.value.trim();
  if (!text || props.disabled) return;
  emit("send", text);
  inputText.value = "";
}

function handleNewLine() {
  inputText.value += "\n";
}
</script>

<style scoped>
.input-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #e4e7ed;
  background: #fff;
}

.input-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hint-text {
  font-size: 12px;
  color: #c0c4cc;
}

:deep(.el-textarea__inner) {
  font-size: 14px;
  line-height: 1.6;
}
</style>
