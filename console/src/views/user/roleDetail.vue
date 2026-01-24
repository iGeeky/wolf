<script setup lang="ts">
import { ref, computed } from "vue";
import { getUserRole, setUserRole } from "@/api/user-role";
import { useUserStoreHook } from "@/store/modules/user";
import PermissionSelect from "@/components/PermissionSelect/index.vue";
import RoleSelect from "@/components/RoleSelect/index.vue";
import { useI18n } from "vue-i18n";
import { ElNotification } from "element-plus";
import ArrowDown from "~icons/ep/arrow-down";

const { t } = useI18n();

interface UserInfo {
  id: string;
  username: string;
  nickname?: string;
  appIDs?: string[];
  manager?: string;
}

interface Props {
  user: UserInfo;
}

const props = defineProps<Props>();
const userStore = useUserStoreHook();

interface UserRole {
  userID: string;
  appID: string;
  permIDs: string[];
  roleIDs: string[];
}

const defaultUserRole: UserRole = {
  userID: "",
  appID: "",
  permIDs: [],
  roleIDs: []
};

const currentApp = ref<string>("");
const userRole = ref<UserRole>({ ...defaultUserRole });
const detailDialogVisible = ref(false);

// 获取用户可访问的应用ID列表
const appIds = computed(() => {
  const userAppIds = props.user.appIDs || [];
  // 如果是超级管理员，返回所有应用
  if (userStore.roles.includes("admin")) {
    return userAppIds;
  }
  // 否则返回交集
  const loginUserAppIds = new Set(
    userStore.applications.map(app => app.id)
  );
  return userAppIds.filter(id => loginUserAppIds.has(id));
});

const fetchUserRole = async () => {
  const res = await getUserRole(props.user.id, currentApp.value);
  if (res?.ok) {
    const role = res.data?.userRole || defaultUserRole;
    userRole.value = {
      userID: props.user.id,
      appID: currentApp.value,
      permIDs: role.permIDs || [],
      roleIDs: role.roleIDs || []
    };
  }
  return res;
};

const handlePermissionDetail = async (command: string) => {
  if (!command) return;
  currentApp.value = command;
  const res = await fetchUserRole();
  if (res?.ok) {
    detailDialogVisible.value = true;
  }
};

const submit = async () => {
  const res = await setUserRole(userRole.value);
  if (res?.ok) {
    userRole.value = { ...defaultUserRole };
    detailDialogVisible.value = false;
    ElNotification({
      title: "Success",
      message: t("wolf.userPromptUpdateRoleDetailSuccess"),
      type: "success"
    });
  }
};
</script>

<template>
  <div>
    <el-dropdown @command="handlePermissionDetail">
      <el-button type="primary">
        {{ t("wolf.btnDetail") }}
        <IconifyIconOffline :icon="ArrowDown" class="el-icon--right" />
      </el-button>
      <template #dropdown>
        <el-dropdown-menu v-if="appIds && appIds.length > 0">
          <el-dropdown-item
            v-for="appID in appIds"
            :key="appID"
            :command="appID"
          >
            {{ appID }}
          </el-dropdown-item>
        </el-dropdown-menu>
        <el-dropdown-menu v-else>
          <el-dropdown-item key="no_app" command="">
            {{ t("wolf.roleDetailLabelNoApplication") }}
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <el-dialog
      v-model="detailDialogVisible"
      :title="t('wolf.roleDetailDialogTitle')"
      class="rbac-edit-dialog"
    >
      <el-form :model="user" label-width="120px" label-position="left">
        <el-form-item :label="t('wolf.roleDetailLabelUsername')" prop="username">
          <el-input :model-value="user.username" readonly />
        </el-form-item>
        <el-form-item :label="t('wolf.roleDetailLabelNickname')" prop="nickname">
          <el-input :model-value="user.nickname" readonly />
        </el-form-item>
        <el-form-item :label="t('wolf.labelApp')" prop="appIDs">
          <el-input :model-value="currentApp" readonly />
        </el-form-item>
        <el-form-item
          :label="t('wolf.roleDetailLabelPermissions')"
          prop="permIDs"
        >
          <PermissionSelect
            v-model="userRole.permIDs"
            :application="currentApp"
            multiple
          />
        </el-form-item>
        <el-form-item :label="t('wolf.roleDetailLabelRoles')" prop="roleIDs">
          <RoleSelect v-model="userRole.roleIDs" :application="currentApp" />
        </el-form-item>
      </el-form>
      <div style="text-align: right">
        <el-button type="danger" @click="detailDialogVisible = false">
          {{ t("wolf.btnCancel") }}
        </el-button>
        <el-button type="primary" @click="submit">
          {{ t("wolf.btnConfirm") }}
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>

