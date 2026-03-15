<template>
  <div class="tool-call-card" :class="statusClass">
    <div class="tool-header" @click="toggleExpand">
      <el-icon class="tool-icon">
        <component :is="statusIcon" />
      </el-icon>
      <span class="tool-name">{{ toolCall.toolName }}</span>
      <span class="tool-status-badge">{{ statusLabel }}</span>
      <el-icon class="expand-icon">
        <ArrowDown v-if="!expanded" />
        <ArrowUp v-else />
      </el-icon>
    </div>

    <div v-if="expanded" class="tool-detail">
      <div v-if="toolCall.args" class="tool-args">
        <div class="detail-label">{{ t("wolf.aiChat.toolParams") }}</div>
        <pre class="detail-content">{{ formatJson(toolCall.args) }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import {
  ArrowDown,
  ArrowUp,
  Loading,
  CircleCheck,
  CircleClose
} from "@element-plus/icons-vue";
import type { ToolCallDisplay } from "../hooks/useChat";

const { t } = useI18n();

const props = defineProps<{
  toolCall: ToolCallDisplay;
}>();

const expanded = ref(false);

const statusClass = computed(() => ({
  "status-running": props.toolCall.status === "running",
  "status-done": props.toolCall.status === "done",
  "status-error": props.toolCall.status === "error"
}));

const statusIcon = computed(() => {
  if (props.toolCall.status === "running") return Loading;
  if (props.toolCall.status === "done") return CircleCheck;
  return CircleClose;
});

const statusLabel = computed(() => {
  if (props.toolCall.status === "running") return t("wolf.aiChat.toolRunning");
  if (props.toolCall.status === "done") return t("wolf.aiChat.toolDone");
  return t("wolf.aiChat.toolError");
});

function toggleExpand() {
  expanded.value = !expanded.value;
}

function formatJson(val: any): string {
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return String(val);
  }
}
</script>

<style scoped>
.tool-call-card {
  margin: 4px 0;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
  overflow: hidden;
  font-size: 13px;
}

.status-running {
  border-color: #409eff;
  background: #ecf5ff;
}

.status-done {
  border-color: #67c23a;
  background: #f0f9eb;
}

.status-error {
  border-color: #f56c6c;
  background: #fef0f0;
}

.tool-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  cursor: pointer;
  user-select: none;
}

.tool-icon {
  flex-shrink: 0;
}

.status-running .tool-icon {
  color: #409eff;
  animation: spin 1s linear infinite;
}

.status-done .tool-icon {
  color: #67c23a;
}

.status-error .tool-icon {
  color: #f56c6c;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.tool-name {
  font-family: monospace;
  font-weight: 500;
  flex: 1;
}

.tool-status-badge {
  color: #909399;
  font-size: 12px;
}

.expand-icon {
  color: #909399;
  flex-shrink: 0;
}

.tool-detail {
  padding: 8px 10px;
  border-top: 1px solid inherit;
}

.detail-label {
  font-size: 11px;
  color: #909399;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-content {
  margin: 0;
  padding: 6px 8px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow: auto;
}
</style>
