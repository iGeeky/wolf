<template>
  <el-dialog
    v-model="visible"
    :title="t('wolf.aiChat.memoryManage')"
    width="680px"
    :close-on-click-modal="false"
    destroy-on-close
    class="memory-panel-dialog"
    @open="handleOpen"
  >
    <!-- 顶部操作栏 -->
    <div class="memory-toolbar">
      <el-button type="primary" size="small" :icon="Plus" @click="openAddForm">
        {{ t("wolf.aiChat.memoryAddBtn") }}
      </el-button>
      <div class="memory-count" v-if="total > 0">
        {{ total }} {{ t("wolf.aiChat.memory") }}
      </div>
    </div>

    <!-- 加载骨架 -->
    <el-skeleton v-if="loading" :rows="4" animated />

    <!-- 空状态 -->
    <el-empty
      v-else-if="memories.length === 0"
      :description="t('wolf.aiChat.memoryEmpty')"
      :image-size="80"
    />

    <!-- 记忆列表（按分类分组） -->
    <div v-else class="memory-list">
      <template v-for="(group, category) in groupedMemories" :key="category">
        <div class="memory-group">
          <div class="memory-group-title">
            <el-tag :type="categoryTagType(category as MemoryCategory)" size="small" effect="plain">
              {{ t(`wolf.aiChat.memoryCategory${capitalize(category)}`) }}
            </el-tag>
          </div>
          <div
            v-for="mem in group"
            :key="mem.id"
            class="memory-item"
          >
            <!-- 查看/编辑模式切换 -->
            <template v-if="editingId !== mem.id">
              <div class="memory-content">{{ mem.content }}</div>
              <div class="memory-meta">
                <span class="memory-source">
                  {{
                    mem.source === "manual"
                      ? t("wolf.aiChat.memorySourceManual")
                      : t("wolf.aiChat.memorySourceAuto")
                  }}
                </span>
                <span v-if="mem.sessionTitle" class="memory-session">
                  · {{ t("wolf.aiChat.memorySourceSession") }}：{{ mem.sessionTitle }}
                </span>
              </div>
            </template>

            <!-- 行内编辑状态 -->
            <template v-else>
              <div class="memory-edit-form">
                <el-select
                  v-model="editForm.category"
                  size="small"
                  style="width: 130px; flex-shrink: 0"
                >
                  <el-option
                    v-for="cat in CATEGORIES"
                    :key="cat"
                    :value="cat"
                    :label="t(`wolf.aiChat.memoryCategory${capitalize(cat)}`)"
                  />
                </el-select>
                <el-input
                  v-model="editForm.content"
                  type="textarea"
                  :autosize="{ minRows: 2, maxRows: 5 }"
                  size="small"
                  :placeholder="t('wolf.aiChat.memoryContentPlaceholder')"
                  style="flex: 1"
                />
              </div>
            </template>

            <!-- 操作按钮 -->
            <div class="memory-actions">
              <template v-if="editingId === mem.id">
                <el-button
                  type="primary"
                  size="small"
                  :loading="saving"
                  @click="handleSaveEdit(mem.id)"
                >
                  保存
                </el-button>
                <el-button size="small" @click="cancelEdit">取消</el-button>
              </template>
              <template v-else>
                <el-tooltip :content="t('wolf.btnEdit')" placement="top">
                  <el-button
                    size="small"
                    :icon="Edit"
                    circle
                    @click="startEdit(mem)"
                  />
                </el-tooltip>
                <el-popconfirm
                  :title="t('wolf.aiChat.memoryConfirmDelete')"
                  @confirm="handleDelete(mem.id)"
                >
                  <template #reference>
                    <el-button
                      size="small"
                      :icon="Delete"
                      circle
                      type="danger"
                    />
                  </template>
                </el-popconfirm>
              </template>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- 新增记忆表单 -->
    <el-dialog
      v-model="addFormVisible"
      :title="t('wolf.aiChat.memoryAddBtn')"
      width="480px"
      append-to-body
      :close-on-click-modal="false"
    >
      <el-form :model="addForm" label-width="60px" size="default">
        <el-form-item :label="t('wolf.aiChat.memoryCategory')">
          <el-select v-model="addForm.category" style="width: 100%">
            <el-option
              v-for="cat in CATEGORIES"
              :key="cat"
              :value="cat"
              :label="t(`wolf.aiChat.memoryCategory${capitalize(cat)}`)"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('wolf.aiChat.memoryContent')">
          <el-input
            v-model="addForm.content"
            type="textarea"
            :rows="4"
            :placeholder="t('wolf.aiChat.memoryContentPlaceholder')"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addFormVisible = false">{{ t("wolf.btnCancel") }}</el-button>
        <el-button
          type="primary"
          :loading="saving"
          :disabled="!addForm.content.trim()"
          @click="handleAdd"
        >
          {{ t("wolf.btnConfirm") }}
        </el-button>
      </template>
    </el-dialog>

    <template #footer>
      <el-button @click="visible = false">{{ t("wolf.btnCancel") }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from "vue";
import { useI18n } from "vue-i18n";
import { Plus, Edit, Delete } from "@element-plus/icons-vue";
import { useMemories } from "../hooks/useMemories";
import type { UserMemory, MemoryCategory } from "@/api/ai-chat";

const { t } = useI18n();

const CATEGORIES: MemoryCategory[] = ["preference", "knowledge", "decision", "pattern"];

const visible = defineModel<boolean>({ default: false });

const {
  memories,
  total,
  loading,
  saving,
  loadMemories,
  createMemory,
  editMemory,
  removeMemory
} = useMemories();

// 按分类分组
const groupedMemories = computed(() => {
  const groups: Partial<Record<MemoryCategory, UserMemory[]>> = {};
  for (const cat of CATEGORIES) {
    const items = memories.value.filter(m => m.category === cat);
    if (items.length > 0) groups[cat] = items;
  }
  return groups;
});

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function categoryTagType(category: MemoryCategory): "primary" | "success" | "warning" | "info" {
  const map: Record<MemoryCategory, "primary" | "success" | "warning" | "info"> = {
    preference: "primary",
    knowledge: "success",
    decision: "warning",
    pattern: "info"
  };
  return map[category] ?? "info";
}

async function handleOpen() {
  await loadMemories();
}

// 新增表单
const addFormVisible = ref(false);
const addForm = reactive<{ category: MemoryCategory; content: string }>({
  category: "preference",
  content: ""
});

function openAddForm() {
  addForm.category = "preference";
  addForm.content = "";
  addFormVisible.value = true;
}

async function handleAdd() {
  const ok = await createMemory(addForm.category, addForm.content);
  if (ok) addFormVisible.value = false;
}

// 编辑
const editingId = ref<number | null>(null);
const editForm = reactive<{ category: MemoryCategory; content: string }>({
  category: "preference",
  content: ""
});

function startEdit(mem: UserMemory) {
  editingId.value = mem.id;
  editForm.category = mem.category;
  editForm.content = mem.content;
}

function cancelEdit() {
  editingId.value = null;
}

async function handleSaveEdit(id: number) {
  const ok = await editMemory(id, editForm.category, editForm.content);
  if (ok) editingId.value = null;
}

// 删除
async function handleDelete(id: number) {
  await removeMemory(id);
}
</script>

<style scoped>
.memory-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.memory-count {
  color: #909399;
  font-size: 13px;
}

.memory-list {
  max-height: 480px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.memory-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.memory-group-title {
  padding-bottom: 4px;
}

.memory-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background: #fafafa;
  transition: background 0.15s;
}

.memory-item:hover {
  background: #f0f4ff;
}

.memory-content {
  flex: 1;
  font-size: 13px;
  color: #303133;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}

.memory-meta {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.memory-source {
  font-weight: 500;
}

.memory-session {
  margin-left: 4px;
}

.memory-edit-form {
  flex: 1;
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.memory-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
</style>
