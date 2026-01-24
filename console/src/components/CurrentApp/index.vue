<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useUserStoreHook } from "@/store/modules/user";
import { setCurrentApp, getCurrentApp } from "@/utils/auth";

// Props
interface Props {
  addRbacConsoleItem?: boolean;
}
const props = withDefaults(defineProps<Props>(), {
  addRbacConsoleItem: false
});

// Store
const userStore = useUserStoreHook();

// Wolf Console 固定项
const rbacConsoleItem = {
  id: "rbac-console",
  name: "Wolf Console"
};

// 当前选中的应用
const currentApp = computed({
  get: () => userStore.currentApp,
  set: (value: string) => {
    setCurrentApp(value);
  }
});

// 应用列表
const applications = computed(() => userStore.applications);

// 初始化：如果没有选中应用，设置为第一个
onMounted(() => {
  if (!currentApp.value && applications.value.length > 0) {
    setCurrentApp(applications.value[0].id);
  }
});
</script>

<template>
  <el-select
    v-model="currentApp"
    placeholder="Change App"
    size="small"
    style="width: 150px"
  >
    <el-option
      v-if="props.addRbacConsoleItem"
      :key="rbacConsoleItem.id"
      :label="rbacConsoleItem.name"
      :value="rbacConsoleItem.id"
    />
    <el-option
      v-for="application in applications"
      :key="application.id"
      :label="application.name"
      :value="application.id"
    />
  </el-select>
</template>
