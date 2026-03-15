import { ref } from "vue";
import { ElMessage } from "element-plus";
import { useI18n } from "vue-i18n";
import {
  listMemories,
  addMemory,
  updateMemory,
  deleteMemory,
  type UserMemory,
  type MemoryCategory
} from "@/api/ai-chat";

export function useMemories() {
  const { t } = useI18n();

  const memories = ref<UserMemory[]>([]);
  const total = ref(0);
  const loading = ref(false);
  const saving = ref(false);

  async function loadMemories(category?: MemoryCategory) {
    loading.value = true;
    try {
      const res = await listMemories({ category, limit: 200 });
      if (res.ok) {
        memories.value = res.data?.memories ?? [];
        total.value = res.data?.total ?? 0;
      }
    } catch {
      ElMessage.error(t("wolf.aiChat.memoryLoadFailed"));
    } finally {
      loading.value = false;
    }
  }

  async function createMemory(
    category: MemoryCategory,
    content: string
  ): Promise<boolean> {
    saving.value = true;
    try {
      const res = await addMemory({ category, content });
      if (res.ok) {
        ElMessage.success(t("wolf.aiChat.memorySaved"));
        await loadMemories();
        return true;
      }
      return false;
    } catch {
      ElMessage.error(t("wolf.aiChat.memorySaveFailed"));
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function editMemory(
    id: number,
    category: MemoryCategory,
    content: string
  ): Promise<boolean> {
    saving.value = true;
    try {
      const res = await updateMemory({ id, category, content });
      if (res.ok) {
        ElMessage.success(t("wolf.aiChat.memorySaved"));
        await loadMemories();
        return true;
      }
      return false;
    } catch {
      ElMessage.error(t("wolf.aiChat.memorySaveFailed"));
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function removeMemory(id: number): Promise<boolean> {
    try {
      const res = await deleteMemory(id);
      if (res.ok) {
        ElMessage.success(t("wolf.aiChat.memoryDeleted"));
        memories.value = memories.value.filter(m => m.id !== id);
        total.value = Math.max(0, total.value - 1);
        return true;
      }
      return false;
    } catch {
      ElMessage.error(t("wolf.aiChat.memoryDeleteFailed"));
      return false;
    }
  }

  return {
    memories,
    total,
    loading,
    saving,
    loadMemories,
    createMemory,
    editMemory,
    removeMemory
  };
}
