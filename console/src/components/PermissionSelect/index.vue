<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useUserStoreHook } from "@/store/modules/user";
import { listPermissions, getSysPermissions } from "@/api/permission";
import PermissionTransfer from "@/components/PermissionTransfer/index.vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

interface Props {
  modelValue: string | string[];
  multiple?: boolean;
  readonly?: boolean;
  application?: string;
}

const props = withDefaults(defineProps<Props>(), {
  multiple: false,
  readonly: false,
  application: ""
});

const emit = defineEmits<{
  "update:modelValue": [value: string | string[]];
}>();

interface Permission {
  id: string;
  name: string;
  category?: { id: number; name: string };
}

interface CategoryPermission {
  category: string;
  permissions: Permission[];
}

const categoryPermissions = ref<CategoryPermission[]>([]);
const allPermissions = ref<Permission[]>([]);
const transferVisible = ref(false);
const userStore = useUserStoreHook();

const currentApp = computed(() => {
  return props.application || userStore.currentApp;
});

const clearable = computed(() => props.multiple);

const permIDs = computed({
  get: () => props.modelValue,
  set: (value: string | string[]) => emit("update:modelValue", value)
});

const selectDisabled = computed(() => {
  if (!props.multiple) return false;
  if (allPermissions.value.length >= 128) return true;
  if (Array.isArray(permIDs.value) && permIDs.value.length >= 128) return true;
  return false;
});

const limitedPermIDs = computed({
  get: () => {
    if (selectDisabled.value && Array.isArray(permIDs.value)) {
      const tmpPermIDs = permIDs.value.slice(0, 16);
      if (permIDs.value.length > 16) {
        tmpPermIDs.push("...");
      }
      return tmpPermIDs;
    }
    return permIDs.value;
  },
  set: (value: string | string[]) => {
    permIDs.value = value;
  }
});

const fetchPermissions = async () => {
  if (!currentApp.value) return;
  const res = await listPermissions({ appID: currentApp.value, limit: 10000 });
  if (res?.ok) {
    let permissions = res.data?.permissions || [];
    if (!props.multiple) {
      const sysPermissions = getSysPermissions();
      permissions = [...sysPermissions, ...permissions];
    }
    allPermissions.value = permissions;

    // 按分类分组
    const categoryPermissionMap: Record<string, CategoryPermission> = {};
    permissions.forEach((permission: Permission) => {
      const category = permission.category?.name || "";
      if (!categoryPermissionMap[category]) {
        categoryPermissionMap[category] = {
          category,
          permissions: []
        };
      }
      categoryPermissionMap[category].permissions.push(permission);
    });

    const result: CategoryPermission[] = [];
    Object.keys(categoryPermissionMap).forEach(category => {
      if (category === "") {
        result.unshift(categoryPermissionMap[category]);
      } else {
        result.push(categoryPermissionMap[category]);
      }
    });
    categoryPermissions.value = result;
  }
};

watch(currentApp, () => {
  fetchPermissions();
});

onMounted(() => {
  fetchPermissions();
});

const showTransferDialog = () => {
  transferVisible.value = true;
};
</script>

<template>
  <div class="permission-select-container">
    <el-select
      v-model="limitedPermIDs"
      :placeholder="t('wolf.promptChangePermission')"
      size="small"
      :multiple="multiple"
      :clearable="clearable"
      :disabled="readonly || selectDisabled"
      class="permission-select"
      filterable
    >
      <el-option-group
        v-for="categoryPermission in categoryPermissions"
        :key="categoryPermission.category"
        :label="categoryPermission.category || t('wolf.labelUncategorized')"
      >
        <el-option
          v-for="permission in categoryPermission.permissions"
          :key="permission.id"
          :label="permission.name"
          :value="permission.id"
        />
      </el-option-group>
    </el-select>
    <el-button v-if="!readonly && multiple" plain @click="showTransferDialog">
      {{ t("wolf.btnEdit") }}
    </el-button>
    <PermissionTransfer
      v-model="permIDs as string[]"
      :readonly="false"
      :all="allPermissions"
      :visible="transferVisible"
      @update:visible="transferVisible = $event"
    />
  </div>
</template>

<style scoped>
.permission-select-container {
  display: flex;
  flex-direction: row;
}
.permission-select {
  width: 100%;
}
</style>

