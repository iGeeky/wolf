<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useUserStoreHook } from "@/store/modules/user";
import { listRoles } from "@/api/role";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

interface Props {
  modelValue: string[];
  application?: string;
}

const props = withDefaults(defineProps<Props>(), {
  application: ""
});

const emit = defineEmits<{
  "update:modelValue": [value: string[]];
}>();

interface Role {
  id: string;
  name: string;
}

const roles = ref<Role[]>([]);
const userStore = useUserStoreHook();

const currentApp = computed(() => {
  return props.application || userStore.currentApp;
});

const roleIDs = computed({
  get: () => props.modelValue,
  set: (value: string[]) => emit("update:modelValue", value)
});

const fetchRoles = async () => {
  if (!currentApp.value) return;
  const res = await listRoles({ appID: currentApp.value, limit: 512 });
  if (res?.ok) {
    roles.value = res.data?.roles || [];
  }
};

watch(currentApp, () => {
  fetchRoles();
});

onMounted(() => {
  fetchRoles();
});
</script>

<template>
  <el-select
    v-model="roleIDs"
    :placeholder="t('wolf.promptChangeRole')"
    size="small"
    style="display: block"
    multiple
    clearable
    filterable
  >
    <el-option
      v-for="role in roles"
      :key="role.id"
      :label="role.name"
      :value="role.id"
    />
  </el-select>
</template>

