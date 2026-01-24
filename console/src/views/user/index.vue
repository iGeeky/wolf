<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useUserStoreHook } from "@/store/modules/user";
import {
  listUsers,
  addUser,
  deleteUser,
  updateUser,
  checkUsernameExist,
  resetPwd
} from "@/api/user";
import { getLoginOptions } from "@/api/user";
import RoleDetail from "./roleDetail.vue";
import { deepClone, formatUnixTime } from "@/utils/wolf";
import { ElMessage, ElMessageBox, ElNotification } from "element-plus";
import type { FormInstance, FormRules } from "element-plus";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import Search from "~icons/ep/search";

const { t } = useI18n();
const userStore = useUserStoreHook();

interface UserInfo {
  id?: string;
  username: string;
  nickname: string;
  email: string;
  tel: string;
  appIDs: string[];
  manager: string;
  authType: number;
  status: number;
  createTime?: number;
}

const defaultUser: UserInfo = {
  username: "",
  nickname: "",
  email: "",
  tel: "",
  appIDs: [],
  manager: "",
  authType: 1,
  status: 0
};

const userFormRef = ref<FormInstance>();
const users = ref<UserInfo[]>([]);
const total = ref(0);
const user = ref<UserInfo>({ ...defaultUser });
const dialogVisible = ref(false);
const dialogType = ref<"new" | "edit">("new");

const listQuery = reactive({
  page: 1,
  limit: 10,
  key: "",
  sort: "-id"
});

const loginOptions = reactive<{
  ldap: { supported: boolean; syncedFields?: string[] };
}>({
  ldap: { supported: false }
});

const appIdsRules = ref<FormRules["appIDs"]>([]);

const applications = computed(() => userStore.applications);

// 监听 manager 变化，动态调整 appIDs 校验规则
watch(
  () => user.value.manager,
  val => {
    if (val === "admin") {
      appIdsRules.value = [
        {
          required: true,
          message: t("wolf.userRulesMessageAppIDRequired"),
          trigger: ["blur", "change"]
        }
      ];
      if (dialogVisible.value) {
        setTimeout(() => {
          userFormRef.value?.validateField("appIDs");
        }, 0);
      }
    } else {
      appIdsRules.value = [];
      if (dialogVisible.value) {
        setTimeout(() => {
          userFormRef.value?.clearValidate(["appIDs"]);
        }, 0);
      }
    }
  }
);

const validateUsername = async (
  _rule: any,
  value: string,
  callback: (error?: Error) => void
) => {
  const res = await checkUsernameExist(value, user.value.id);
  if (res?.ok && res.data?.exist) {
    callback(new Error(t("wolf.userPromptUsernameExist")));
  } else {
    callback();
  }
};

const rules = computed<FormRules>(() => {
  const rulesAll: FormRules = {
    username: [
      {
        required: true,
        message: t("wolf.userRulesMessageUsernameRequired"),
        trigger: ["blur", "change"]
      },
      {
        min: 2,
        max: 32,
        message: t("wolf.pubRulesMessageLength_2_32"),
        trigger: ["blur", "change"]
      },
      {
        pattern: /^[a-zA-Z0-9_-]*$/,
        message: t("wolf.pubRulesMessageIDFormat"),
        trigger: ["blur", "change"]
      },
      { validator: validateUsername, trigger: ["blur", "change"] }
    ],
    nickname: [
      {
        required: true,
        message: t("wolf.userRulesMessageNicknameRequired"),
        trigger: ["blur", "change"]
      },
      {
        min: 2,
        max: 32,
        message: t("wolf.pubRulesMessageLength_2_32"),
        trigger: ["blur", "change"]
      }
    ],
    email: [
      {
        type: "email",
        message: t("wolf.userRulesMessageEmailFormat"),
        trigger: ["blur", "change"]
      }
    ],
    tel: [
      {
        pattern: /^[\d- ]{6,15}$/,
        message: t("wolf.userRulesMessageTelFormat"),
        trigger: ["blur", "change"]
      }
    ],
    appIDs: appIdsRules.value
  };

  // 如果是 LDAP 用户，忽略同步字段的校验
  if (user.value.authType !== 1 && loginOptions.ldap.syncedFields) {
    const syncedFields = loginOptions.ldap.syncedFields;
    const filteredRules: FormRules = {};
    for (const field of Object.keys(rulesAll)) {
      if (!syncedFields.includes(field)) {
        filteredRules[field] = rulesAll[field];
      }
    }
    return filteredRules;
  }
  return rulesAll;
});

const tableRowClassName = ({ row }: { row: UserInfo }) => {
  return row.status === -1 ? "disabled-row" : "";
};

const appIdsFormat = (
  _row: UserInfo,
  _column: any,
  cellValue: string[]
): string => {
  if (!cellValue || cellValue.length === 0) return "";
  return cellValue.join("|");
};

const userStatusFormat = (
  _row: UserInfo,
  _column: any,
  cellValue: number
): string => {
  return cellValue === 0
    ? t("wolf.newUserLabelStatusNormal")
    : t("wolf.newUserLabelStatusDisabled");
};

const unixtimeFormat = (
  _row: UserInfo,
  _column: any,
  cellValue: number
): string => {
  return formatUnixTime(cellValue);
};

const fetchUsers = async () => {
  const res = await listUsers(listQuery);
  if (res?.ok) {
    total.value = res.data?.total || 0;
    users.value = res.data?.userInfos || [];
  }
};

const fetchLoginOptions = async () => {
  const res = await getLoginOptions();
  if (res?.ok && res.data) {
    Object.assign(loginOptions, res.data);
  }
};

const handleFilter = () => {
  listQuery.page = 1;
  fetchUsers();
};

const userEditable = (row: UserInfo) => row.authType === 1;

const fieldDisabled = (u: UserInfo, field: string) => {
  if (u.authType === 2 && loginOptions.ldap.syncedFields) {
    return loginOptions.ldap.syncedFields.includes(field);
  }
  return false;
};

const handleAdd = () => {
  user.value = { ...defaultUser };
  dialogType.value = "new";
  dialogVisible.value = true;
};

const handleEdit = (row: UserInfo) => {
  dialogType.value = "edit";
  dialogVisible.value = true;
  user.value = deepClone(row);
};

const handleReset = (row: UserInfo) => {
  ElMessageBox.confirm(t("wolf.userPromptConfirmResetPassword"), "Warning", {
    confirmButtonText: t("wolf.btnConfirm"),
    cancelButtonText: t("wolf.btnCancel"),
    type: "warning"
  })
    .then(async () => {
      const res = await resetPwd(row.id!);
      if (res?.ok) {
        const password = res.data?.password;
        ElNotification({
          title: "Success",
          dangerouslyUseHTMLString: true,
          message: t("wolf.userPromptResetPasswordSuccess", { password }),
          type: "success",
          duration: 0
        });
      }
    })
    .catch(() => {});
};

const handleDelete = (row: UserInfo) => {
  ElMessageBox.confirm(t("wolf.userPromptConfirmRemove"), "Warning", {
    confirmButtonText: t("wolf.btnConfirm"),
    cancelButtonText: t("wolf.btnCancel"),
    type: "warning"
  })
    .then(async () => {
      const res = await deleteUser(row.id!);
      if (res?.ok) {
        fetchUsers();
        ElMessage.success(t("wolf.userPromptRemoveSuccess"));
      }
    })
    .catch(() => {});
};

const validateAndSubmit = async () => {
  if (!userFormRef.value) return;
  const valid = await userFormRef.value.validate().catch(() => false);
  if (valid) {
    await submitUser();
  }
};

const submitUser = async () => {
  const isEdit = dialogType.value === "edit";
  if (isEdit) {
    await updateUser(user.value.id!, user.value);
    fetchUsers();
    dialogVisible.value = false;
    ElNotification({
      title: "Success",
      message: t("wolf.userPromptUpdateSuccess"),
      type: "success"
    });
  } else {
    const res = await addUser(user.value);
    if (res?.ok) {
      const password = res.data?.password;
      const username = res.data?.userInfo?.username || user.value.username;
      fetchUsers();
      dialogVisible.value = false;
      ElNotification({
        title: "Success",
        dangerouslyUseHTMLString: true,
        message: t("wolf.userPromptAddSuccess", { username, password }),
        type: "success",
        duration: 0
      });
    }
  }
};

const handlePageChange = () => {
  fetchUsers();
};

onMounted(() => {
  fetchUsers();
  fetchLoginOptions();
});
</script>

<template>
  <div class="app-container">
    <div class="filter-container">
      <el-input
        v-model="listQuery.key"
        :placeholder="t('wolf.userSearchPrompt')"
        style="width: 200px"
        class="filter-item"
        maxlength="32"
        clearable
        @keyup.enter="handleFilter"
      />
      <el-button
        class="filter-item"
        type="primary"
        :icon="useRenderIcon(Search)"
        @click="handleFilter"
      >
        {{ t("wolf.search") }}
      </el-button>
      <el-button
        class="filter-item"
        type="primary"
        :disabled="loginOptions.ldap.supported"
        @click="handleAdd"
      >
        {{ t("wolf.userNewUser") }}
      </el-button>
    </div>

    <el-table
      :data="users"
      style="margin-top: 30px"
      :row-class-name="tableRowClassName"
      border
      fit
      highlight-current-row
    >
      <el-table-column
        align="center"
        label="ID"
        min-width="80"
        show-overflow-tooltip
        prop="id"
      />
      <el-table-column
        align="center"
        :label="t('wolf.userTitleUserName')"
        min-width="120"
        show-overflow-tooltip
        prop="username"
      />
      <el-table-column
        align="center"
        :label="t('wolf.userTitleNickName')"
        min-width="120"
        show-overflow-tooltip
        prop="nickname"
      />
      <el-table-column
        align="center"
        :label="t('wolf.userTitleManager')"
        min-width="80"
        show-overflow-tooltip
        prop="manager"
      />
      <el-table-column
        align="center"
        :label="t('wolf.userTitleAppIds')"
        min-width="150"
        show-overflow-tooltip
        prop="appIDs"
        :formatter="appIdsFormat"
      />
      <el-table-column
        align="center"
        :label="t('wolf.userTitleStatus')"
        min-width="80"
        prop="status"
        :formatter="userStatusFormat"
      />
      <el-table-column
        align="center"
        :label="t('wolf.titleCreateTime')"
        min-width="150"
        show-overflow-tooltip
        prop="createTime"
        :formatter="unixtimeFormat"
      />
      <el-table-column
        align="center"
        :label="t('wolf.userTitlePermissions')"
        min-width="100"
      >
        <template #default="{ row }">
          <RoleDetail :user="row" />
        </template>
      </el-table-column>
      <el-table-column
        align="center"
        :label="t('wolf.titleOperations')"
        min-width="200"
      >
        <template #default="{ row }">
          <el-tooltip
            effect="dark"
            :content="t('wolf.userPromptResetPassword')"
            placement="top"
          >
            <el-button
              type="primary"
              size="small"
              :disabled="!userEditable(row)"
              @click="handleReset(row)"
            >
              {{ t("wolf.btnReset") }}
            </el-button>
          </el-tooltip>
          <el-button type="primary" size="small" @click="handleEdit(row)">
            {{ t("wolf.btnEdit") }}
          </el-button>
          <el-button type="danger" size="small" @click="handleDelete(row)">
            {{ t("wolf.btnDelete") }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination pagination-center">
      <el-pagination
        v-show="total > 0"
        v-model:current-page="listQuery.page"
        v-model:page-size="listQuery.limit"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handlePageChange"
        @current-change="handlePageChange"
      />
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="
        dialogType === 'edit' ? t('wolf.userEditUser') : t('wolf.userNewUser')
      "
      class="rbac-edit-dialog"
    >
      <el-form
        ref="userFormRef"
        :model="user"
        :rules="rules"
        label-width="120px"
        label-position="left"
      >
        <el-form-item :label="t('wolf.newUserLabelUsername')" prop="username">
          <el-input
            v-model="user.username"
            :disabled="fieldDisabled(user, 'username')"
            :placeholder="t('wolf.newUserPromptUsername')"
          />
        </el-form-item>
        <el-form-item :label="t('wolf.newUserLabelNickname')" prop="nickname">
          <el-input
            v-model="user.nickname"
            :disabled="fieldDisabled(user, 'nickname')"
            :placeholder="t('wolf.newUserPromptNickname')"
          />
        </el-form-item>
        <el-form-item :label="t('wolf.newUserLabelEmail')" prop="email">
          <el-input
            v-model="user.email"
            :disabled="fieldDisabled(user, 'email')"
            :placeholder="t('wolf.newUserPromptEmail')"
          />
        </el-form-item>
        <el-form-item :label="t('wolf.newUserLabelTel')" prop="tel">
          <el-input
            v-model="user.tel"
            :disabled="fieldDisabled(user, 'tel')"
            :placeholder="t('wolf.newUserPromptTel')"
          />
        </el-form-item>
        <el-form-item :label="t('wolf.labelApp')" prop="appIDs">
          <el-select
            v-model="user.appIDs"
            multiple
            filterable
            :placeholder="t('wolf.newUserPromptAppID')"
            style="display: block"
          >
            <el-option
              v-for="application in applications"
              :key="application.id"
              :label="application.name"
              :value="application.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('wolf.newUserLabelManager')" prop="manager">
          <el-radio-group v-model="user.manager" size="small">
            <el-radio-button value="super">
              {{ t("wolf.newUserLabelManagerSuper") }}
            </el-radio-button>
            <el-radio-button value="admin">
              {{ t("wolf.newUserLabelManagerAdmin") }}
            </el-radio-button>
            <el-radio-button value="none">
              {{ t("wolf.newUserLabelManagerNone") }}
            </el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="t('wolf.newUserLabelStatus')" prop="status">
          <el-radio-group v-model="user.status" size="small">
            <el-radio-button :value="0">
              {{ t("wolf.newUserLabelStatusNormal") }}
            </el-radio-button>
            <el-radio-button :value="-1">
              {{ t("wolf.newUserLabelStatusDisabled") }}
            </el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <div style="text-align: right">
        <el-button type="danger" @click="dialogVisible = false">
          {{ t("wolf.btnCancel") }}
        </el-button>
        <el-button type="primary" @click="validateAndSubmit">
          {{ t("wolf.btnConfirm") }}
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.filter-container {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.filter-item {
  margin-right: 10px;
}
.pagination {
  margin-top: 20px;
}
.pagination-center {
  display: flex;
  justify-content: center;
}
:deep(.el-table .disabled-row) {
  background: #ededef;
  color: #9e1433;
}
</style>
