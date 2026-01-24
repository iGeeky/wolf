<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useUserStoreHook } from "@/store/modules/user";
import CurrentApp from "@/components/CurrentApp/index.vue";
import PermissionSelect from "@/components/PermissionSelect/index.vue";
import {
  listRoles,
  addRole,
  deleteRole,
  updateRole,
  checkRoleIDExist,
  checkRoleNameExist
} from "@/api/role";
import { deepClone, formatUnixTime } from "@/utils/wolf";
import { ElMessage, ElMessageBox, ElNotification } from "element-plus";
import type { FormInstance, FormRules } from "element-plus";

const { t } = useI18n();
const userStore = useUserStoreHook();

interface RoleInfo {
  id: string;
  appID: string;
  name: string;
  description: string;
  permIDs: string[];
  createTime?: number;
}

const defaultRole: RoleInfo = {
  id: "",
  appID: "",
  name: "",
  description: "",
  permIDs: []
};

const roleFormRef = ref<FormInstance>();
const roles = ref<RoleInfo[]>([]);
const total = ref(0);
const role = ref<RoleInfo>({ ...defaultRole });
const dialogVisible = ref(false);
const dialogType = ref<"new" | "edit" | "view">("new");

const listQuery = reactive({
  page: 1,
  limit: 10,
  key: "",
  appID: "",
  sort: "-createTime"
});

const currentApp = computed(() => userStore.currentApp);

const dialogTitle = computed(() => {
  switch (dialogType.value) {
    case "edit":
      return t("wolf.roleEditRole");
    case "view":
      return t("wolf.roleViewRole");
    default:
      return t("wolf.roleNewRole");
  }
});

const inputReadonly = computed(() => dialogType.value === "view");

const validateRoleId = async (
  _rule: any,
  value: string,
  callback: (error?: Error) => void
) => {
  if (dialogType.value === "edit" || dialogType.value === "view") {
    callback();
    return;
  }
  const res = await checkRoleIDExist(currentApp.value, value);
  if (res.ok && res.exist) {
    callback(new Error(t("wolf.rolePromptIDExist")));
  } else {
    callback();
  }
};

const validateRoleName = async (
  _rule: any,
  value: string,
  callback: (error?: Error) => void
) => {
  const res = await checkRoleNameExist(currentApp.value, value, role.value.id);
  if (res.ok && res.exist) {
    callback(new Error(t("wolf.rolePromptNameExist")));
  } else {
    callback();
  }
};

const rules = computed<FormRules>(() => ({
  id: [
    {
      required: true,
      message: t("wolf.roleRulesMessageIDRequired"),
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
    { validator: validateRoleId, trigger: ["blur", "change"] }
  ],
  name: [
    {
      required: true,
      message: t("wolf.roleRulesMessageNameRequired"),
      trigger: ["blur", "change"]
    },
    {
      min: 2,
      max: 32,
      message: t("wolf.pubRulesMessageLength_2_32"),
      trigger: ["blur", "change"]
    },
    { validator: validateRoleName, trigger: ["blur", "change"] }
  ]
}));

const unixtimeFormat = (
  _row: RoleInfo,
  _column: any,
  cellValue: number
): string => {
  return formatUnixTime(cellValue);
};

const fetchRoles = async () => {
  listQuery.appID = currentApp.value;
  const res = await listRoles(listQuery);
  if (res?.ok) {
    total.value = res.data?.total || 0;
    roles.value = (res.data?.roles || []).map((r: RoleInfo) => ({
      ...r,
      permIDs: r.permIDs || []
    }));
  }
};

watch(currentApp, () => {
  fetchRoles();
});

const handleFilter = () => {
  listQuery.page = 1;
  fetchRoles();
};

const handleAdd = () => {
  role.value = { ...defaultRole, appID: currentApp.value };
  dialogType.value = "new";
  dialogVisible.value = true;
};

const handleEdit = (row: RoleInfo) => {
  dialogType.value = "edit";
  dialogVisible.value = true;
  role.value = deepClone(row);
};

const handleView = (row: RoleInfo) => {
  dialogType.value = "view";
  dialogVisible.value = true;
  role.value = deepClone(row);
};

const handleDelete = (row: RoleInfo) => {
  ElMessageBox.confirm(t("wolf.rolePromptConfirmRemove"), "Warning", {
    confirmButtonText: t("wolf.btnConfirm"),
    cancelButtonText: t("wolf.btnCancel"),
    type: "warning"
  })
    .then(async () => {
      const res = await deleteRole(row.id, row.appID);
      if (res?.ok) {
        fetchRoles();
        ElMessage.success(t("wolf.rolePromptRemoveSuccess"));
      }
    })
    .catch(() => {});
};

const validateAndSubmit = async () => {
  if (!roleFormRef.value) return;
  const valid = await roleFormRef.value.validate().catch(() => false);
  if (valid) {
    await submitRole();
  }
};

const submitRole = async () => {
  const isEdit = dialogType.value === "edit";
  if (isEdit) {
    const res = await updateRole(role.value.id, role.value);
    if (!res?.ok) return;
    fetchRoles();
    dialogVisible.value = false;
    ElNotification({
      title: "Success",
      message: t("wolf.rolePromptUpdateSuccess"),
      type: "success"
    });
  } else {
    const res = await addRole(role.value);
    if (!res?.ok) return;
    fetchRoles();
    dialogVisible.value = false;
    ElNotification({
      title: "Success",
      message: t("wolf.rolePromptAddSuccess"),
      type: "success"
    });
  }
};

const handlePageChange = () => {
  fetchRoles();
};

onMounted(() => {
  fetchRoles();
});
</script>

<template>
  <div class="app-container">
    <div class="filter-container">
      <div class="filter-item">{{ t("wolf.app") }}:</div>
      <CurrentApp class="current-app filter-item" />
      <el-input
        v-model="listQuery.key"
        :placeholder="t('wolf.roleSearchPrompt')"
        style="width: 200px"
        class="filter-item"
        maxlength="32"
        clearable
        @keyup.enter="handleFilter"
      />
      <el-button class="filter-item" type="primary" @click="handleFilter">
        {{ t("wolf.search") }}
      </el-button>
      <el-button class="filter-item" type="primary" @click="handleAdd">
        {{ t("wolf.roleNewRole") }}
      </el-button>
    </div>

    <el-table :data="roles" style="margin-top: 30px" border>
      <el-table-column
        align="center"
        label="ID"
        min-width="120"
        show-overflow-tooltip
        prop="id"
      />
      <el-table-column
        align="center"
        :label="t('wolf.titleName')"
        min-width="120"
        show-overflow-tooltip
        prop="name"
      />
      <el-table-column
        align="center"
        :label="t('wolf.titleDescription')"
        min-width="180"
        show-overflow-tooltip
        prop="description"
      />
      <el-table-column
        align="center"
        :label="t('wolf.titleApp')"
        min-width="100"
        show-overflow-tooltip
        prop="appID"
      />
      <el-table-column
        align="center"
        :label="t('wolf.roleTitlePermissions')"
        min-width="100"
      >
        <template #default="{ row }">
          <el-button type="primary" size="small" @click="handleView(row)">
            {{ t("wolf.btnView") }}
          </el-button>
        </template>
      </el-table-column>
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
        :label="t('wolf.titleOperations')"
        min-width="150"
      >
        <template #default="{ row }">
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
      :title="dialogTitle"
      class="rbac-edit-dialog"
    >
      <el-form
        ref="roleFormRef"
        :model="role"
        :rules="rules"
        label-width="120px"
        label-position="left"
      >
        <el-form-item label="ID" prop="id">
          <el-input
            v-model="role.id"
            placeholder="ID"
            :readonly="dialogType === 'edit' || dialogType === 'view'"
          />
        </el-form-item>
        <el-form-item :label="t('wolf.newRoleLabelName')" prop="name">
          <el-input
            v-model="role.name"
            :placeholder="t('wolf.newRolePromptName')"
            minlength="5"
            maxlength="64"
            show-word-limit
            :readonly="inputReadonly"
          />
        </el-form-item>
        <el-form-item
          :label="t('wolf.newRoleLabelDescription')"
          prop="description"
        >
          <el-input
            v-model="role.description"
            :placeholder="t('wolf.newRolePromptDescription')"
            maxlength="256"
            show-word-limit
            :readonly="inputReadonly"
          />
        </el-form-item>
        <el-form-item :label="t('wolf.labelApp')" prop="appID">
          <el-input v-model="role.appID" readonly />
        </el-form-item>
        <el-form-item :label="t('wolf.newRoleLabelPermissions')" prop="permIDs">
          <PermissionSelect
            v-model="role.permIDs"
            multiple
            :readonly="dialogType === 'view'"
          />
        </el-form-item>
      </el-form>
      <div style="text-align: right">
        <el-button type="danger" @click="dialogVisible = false">
          {{ t("wolf.btnCancel") }}
        </el-button>
        <el-button
          v-if="dialogType !== 'view'"
          type="primary"
          @click="validateAndSubmit"
        >
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
  align-items: center;
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
</style>

