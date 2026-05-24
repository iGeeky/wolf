<template>
  <div class="session-list">
    <div class="session-header">
      <div class="session-header-left">
        <el-tooltip :content="t('wolf.aiChat.memoryManage')" placement="bottom">
          <button class="brain-btn" @click="emit('open-memory')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
              <path d="M12 5c0-1.657-1.343-3-3-3a3 3 0 0 0-2.83 2C4.547 4.22 3 5.88 3 7.9a3.9 3.9 0 0 0 1.5 3.1V13a4 4 0 0 0 4 4h1v3h5v-3h1a4 4 0 0 0 4-4v-2a3.9 3.9 0 0 0 1.5-3.1C21 5.88 19.453 4.22 17.83 4A3 3 0 0 0 15 2c-1.657 0-3 1.343-3 3Z"/>
              <line x1="12" y1="5" x2="12" y2="17"/>
              <path d="M7.5 9a2.5 2.5 0 0 0 2.5 2.5"/>
              <path d="M16.5 9a2.5 2.5 0 0 1-2.5 2.5"/>
            </svg>
          </button>
        </el-tooltip>
        <span class="session-title">{{ t("wolf.aiChat.sessions") }}</span>
      </div>
      <el-button
        type="primary"
        size="small"
        :icon="Plus"
        @click="emit('new-session')"
        >{{ t("wolf.aiChat.newSession") }}</el-button
      >
    </div>

    <div v-if="loading" class="session-loading">
      <el-skeleton :rows="3" animated />
    </div>

    <div v-else-if="sessions.length === 0" class="session-empty">
      {{ t("wolf.aiChat.noSessions") }}
    </div>

    <el-scrollbar v-else class="session-scroll">
      <div
        v-for="session in sessions"
        :key="session.id"
        class="session-item"
        :class="{ active: activeSessionId === session.id }"
        @click="emit('select', session.id)"
      >
        <div class="session-item-main">
          <div class="session-item-content">
            <!-- 编辑模式：点击区域外退出编辑（不保存） -->
            <div
              v-if="editingId === session.id"
              :ref="setEditWrapEl"
              class="session-edit-wrap"
              @click.stop
            >
              <el-input
                v-model="editingTitle"
                size="small"
                @keydown.enter.prevent="confirmRename(session.id)"
                @keydown.escape="cancelRename"
                @click.stop
              />
            </div>
            <!-- 正常显示 -->
            <template v-else>
              <el-icon class="session-icon"><ChatDotRound /></el-icon>
              <span class="session-title-text" :title="session.title">
                {{ session.title || t("wolf.aiChat.untitledSession") }}
              </span>
            </template>
          </div>

          <div
            v-if="
              editingId !== session.id &&
              (activeSessionId === session.id ||
                !sessionKnownEmpty(session.id))
            "
            class="session-actions-inline"
          >
            <el-button
              v-if="activeSessionId === session.id"
              link
              size="small"
              class="session-action-icon"
              :icon="Edit"
              @click.stop="startRename(session)"
            />
            <el-tooltip
              v-if="!sessionKnownEmpty(session.id)"
              class="session-action-tooltip"
              :content="t('wolf.aiChat.autoRenameTooltip')"
              placement="top"
            >
              <el-button
                link
                size="small"
                type="primary"
                class="session-action-icon"
                :icon="MagicStick"
                :disabled="streamBusy"
                @click.stop="emit('auto-rename', session.id)"
              />
            </el-tooltip>
          </div>
        </div>

        <el-button
          v-if="editingId !== session.id"
          link
          size="small"
          class="session-action-icon session-action-delete"
          :icon="Delete"
          type="danger"
          @click.stop="emit('delete', session.id)"
        />
      </div>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { ComponentPublicInstance } from "vue";
import { useI18n } from "vue-i18n";
import { onClickOutside } from "@vueuse/core";
import {
  Plus,
  Edit,
  Delete,
  ChatDotRound,
  MagicStick
} from "@element-plus/icons-vue";
import type { ChatSession } from "@/api/ai-chat";

const { t } = useI18n();

defineProps<{
  sessions: ChatSession[];
  activeSessionId: number | null;
  loading: boolean;
  /** 流式回复中禁用各行的「AI 重命名」 */
  streamBusy?: boolean;
  /** 本页内已确认无消息的会话：为 true 时不显示自动重命名 */
  sessionKnownEmpty: (id: number) => boolean;
}>();

const emit = defineEmits<{
  select: [id: number];
  delete: [id: number];
  rename: [id: number, title: string];
  "new-session": [];
  "auto-rename": [id: number];
  "open-memory": [];
}>();

const editingId = ref<number | null>(null);
const editingTitle = ref("");
const editWrapRef = ref<HTMLElement | null>(null);

function setEditWrapEl(
  el: Element | ComponentPublicInstance | null
) {
  if (!el) {
    editWrapRef.value = null;
    return;
  }
  editWrapRef.value =
    el instanceof HTMLElement ? el : (el as ComponentPublicInstance).$el;
}

onClickOutside(editWrapRef, () => {
  if (editingId.value !== null) {
    cancelRename();
  }
});

function startRename(session: ChatSession) {
  editingId.value = session.id;
  editingTitle.value = session.title;
}

function confirmRename(id: number) {
  if (editingTitle.value.trim()) {
    emit("rename", id, editingTitle.value.trim());
  }
  editingId.value = null;
  editingTitle.value = "";
}

function cancelRename() {
  editingId.value = null;
  editingTitle.value = "";
}
</script>

<style scoped>
.session-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.session-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
}

.session-header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.brain-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: #909399;
  padding: 0;
  transition: color 0.15s, background 0.15s;
}

.brain-btn:hover {
  color: #6366f1;
  background: #ede9fe;
}

.session-title {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}

.session-loading {
  padding: 12px;
}

.session-empty {
  padding: 24px 14px;
  color: #909399;
  font-size: 13px;
  text-align: center;
}

.session-scroll {
  flex: 1;
  min-height: 0;
}

.session-item {
  display: flex;
  align-items: center;
  padding: 8px 8px 8px 12px;
  cursor: pointer;
  border-radius: 6px;
  margin: 2px 8px;
  transition: background 0.15s;
  min-height: 36px;
  position: relative;
}

.session-item:hover {
  background: #f5f5f7;
}

.session-item.active {
  background: #ede9fe;
  color: #6366f1;
}

.session-item-main {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  gap: 2px;
}

.session-item-content {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  overflow: hidden;
  min-width: 0;
}

.session-edit-wrap {
  flex: 1;
  min-width: 0;
}

.session-icon {
  flex-shrink: 0;
  color: #c0c4cc;
  font-size: 14px;
  margin-right: -2px;
}

.session-item.active .session-icon {
  color: #6366f1;
}

.session-title-text {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.session-actions-inline {
  display: inline-flex;
  align-items: center;
  gap: 0;
  flex-shrink: 0;
}

.session-action-tooltip {
  display: inline-flex;
  line-height: 0;
}

.session-item :deep(.session-action-icon.el-button) {
  padding: 1px 2px;
  margin: 0;
  min-width: 0;
  height: auto;
}

.session-action-delete {
  flex-shrink: 0;
  padding-right: 0 !important;
}
</style>
