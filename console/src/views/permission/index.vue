<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useUserStoreHook } from "@/store/modules/user";
import CurrentApp from "@/components/CurrentApp/index.vue";
import {
  listPermissions,
  addPermission,
  deletePermission,
  updatePermission,
  checkPermissionIDExist,
  checkPermissionNameExist
} from "@/api/permission";
import { listCategorys } from "@/api/category";
import { deepClone, formatUnixTime } from "@/utils/wolf";
import { ElMessage, ElMessageBox, ElNotification } from "element-plus";
import type { FormInstance, FormRules } from "element-plus";

const { t } = useI18n();
const userStore = useUserStoreHook();

interface PermissionInfo {
  id: string;
  appID: string;
  name: string;
  description?: string;
  categoryID?: number;
  category_name?: string;
  createTime?: number;
}

interface CategoryInfo {
  id: number;
  name: string;
}

const defaultPermission: PermissionInfo = {
  id: "",
  appID: "",
  name: "",
  description: ""
};

const permissionFormRef = ref<FormInstance>();
const permissions = ref<PermissionInfo[]>([]);
const categorys = ref<CategoryInfo[]>([]);
const total = ref(0);
const permission = ref<PermissionInfo>({ ...defaultPermission });
const dialogVisible = ref(false);
const dialogType = ref<"new" | "edit">("new");

const listQuery = reactive({
  page: 1,
  limit: 10,
  key: "",
  appID: "",
  sort: "-createTime"
});

const currentApp = computed(() => userStore.currentApp);

const categoryMap = computed(() => {
  const map: Record<string, string> = {};
  categorys.value.forEach(cat => {
    map[String(cat.id)] = cat.name;
  });
  return map;
});

const validatePermissionId = async (
  _rule: any,
  value: string,
  callback: (error?: Error) => void
) => {
  if (dialogType.value === "edit") {
    callback();
    return;
  }
  const res = await checkPermissionIDExist(currentApp.value, value);
  if (res.ok && res.exist) {
    callback(new Error(t("wolf.permPromptIDExist")));
  } else {
    callback();
  }
};

const validatePermissionName = async (
  _rule: any,
  value: string,
  callback: (error?: Error) => void
) => {
  const res = await checkPermissionNameExist(
    currentApp.value,
    value,
    permission.value.id
  );
  if (res.ok && res.exist) {
    callback(new Error(t("wolf.permPromptNameExist")));
  } else {
    callback();
  }
};

const rules = computed<FormRules>(() => ({
  id: [
    {
      required: true,
      message: t("wolf.permRulesMessageIDRequired"),
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
    { validator: validatePermissionId, trigger: ["blur", "change"] }
  ],
  name: [
    {
      required: true,
      message: t("wolf.permRulesMessageNameRequired"),
      trigger: ["blur", "change"]
    },
    {
      min: 2,
      max: 32,
      message: t("wolf.pubRulesMessageLength_2_32"),
      trigger: ["blur", "change"]
    },
    { validator: validatePermissionName, trigger: ["blur", "change"] }
  ]
}));

const unixtimeFormat = (
  _row: PermissionInfo,
  _column: any,
  cellValue: number
): string => {
  return formatUnixTime(cellValue);
};

const fetchCategorys = async () => {
  const res = await listCategorys({ appID: currentApp.value, limit: 512 });
  if (res?.ok) {
    categorys.value = res.data?.categorys || [];
  }
};

const fetchPermissions = async () => {
  listQuery.appID = currentApp.value;
  const res = await listPermissions(listQuery);
  if (res?.ok) {
    total.value = res.data?.total || 0;
    permissions.value = (res.data?.permissions || []).map(
      (p: PermissionInfo) => ({
        ...p,
        category_name:
          p.categoryID && p.categoryID > 0
            ? categoryMap.value[String(p.categoryID)] ||
              "unknown:" + p.categoryID
            : ""
      })
    );
  }
};

watch(currentApp, () => {
  fetchCategorys().then(() => fetchPermissions());
});

const handleFilter = () => {
  listQuery.page = 1;
  fetchPermissions();
};

const handleAdd = () => {
  permission.value = { ...defaultPermission, appID: currentApp.value };
  dialogType.value = "new";
  dialogVisible.value = true;
  fetchCategorys();
};

const handleEdit = (row: PermissionInfo) => {
  dialogType.value = "edit";
  dialogVisible.value = true;
  permission.value = deepClone(row);
  fetchCategorys();
};

const handleDelete = (row: PermissionInfo) => {
  ElMessageBox.confirm(t("wolf.permPromptConfirmRemove"), "Warning", {
    confirmButtonText: t("wolf.btnConfirm"),
    cancelButtonText: t("wolf.btnCancel"),
    type: "warning"
  })
    .then(async () => {
      const res = await deletePermission(row.id, row.appID);
      if (res?.ok) {
        fetchPermissions();
        ElMessage.success(t("wolf.permPromptRemoveSuccess"));
      }
    })
    .catch(() => {});
};

const validateAndSubmit = async () => {
  if (!permissionFormRef.value) return;
  const valid = await permissionFormRef.value.validate().catch(() => false);
  if (valid) {
    await submitPermission();
  }
};

const submitPermission = async () => {
  const isEdit = dialogType.value === "edit";
  if (isEdit) {
    const res = await updatePermission(permission.value.id, permission.value);
    if (!res?.ok) return;
    fetchPermissions();
    dialogVisible.value = false;
    ElNotification({
      title: "Success",
      message: t("wolf.permPromptUpdateSuccess"),
      type: "success"
    });
  } else {
    const res = await addPermission(permission.value);
    if (!res?.ok) return;
    fetchPermissions();
    dialogVisible.value = false;
    ElNotification({
      title: "Success",
      message: t("wolf.permPromptAddSuccess"),
      type: "success"
    });
  }
};

const handlePageChange = () => {
  fetchPermissions();
};

onMounted(() => {
  fetchCategorys().then(() => fetchPermissions());
});
</script>

<template>
  <div class="app-container">
    <div class="filter-container">
      <div class="filter-item">{{ t("wolf.app") }}:</div>
      <CurrentApp class="current-app filter-item" />
      <el-input
        v-model="listQuery.key"
        :placeholder="t('wolf.permSearchPrompt')"
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
        {{ t("wolf.permNewPermission") }}
      </el-button>
    </div>

    <el-table :data="permissions" style="margin-top: 30px" border>
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
        :label="t('wolf.permTitleCategory')"
        min-width="100"
        show-overflow-tooltip
        prop="category_name"
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
      :title="
        dialogType === 'edit'
          ? t('wolf.permEditPermission')
          : t('wolf.permNewPermission')
      "
      class="rbac-edit-dialog"
    >
      <el-form
        ref="permissionFormRef"
        :model="permission"
        :rules="rules"
        label-width="120px"
        label-position="left"
      >
        <el-form-item :label="t('wolf.newPermLabelID')" prop="id">
          <el-input
            v-model="permission.id"
            :placeholder="t('wolf.newPermPromptID')"
            :readonly="dialogType === 'edit'"
          />
        </el-form-item>
        <el-form-item :label="t('wolf.newPermLabelName')" prop="name">
          <el-input
            v-model="permission.name"
            :placeholder="t('wolf.newPermPromptName')"
            minlength="5"
            maxlength="64"
            show-word-limit
          />
        </el-form-item>
        <el-form-item
          :label="t('wolf.newPermLabelDescription')"
          prop="description"
        >
          <el-input
            v-model="permission.description"
            :placeholder="t('wolf.newPermPromptDescription')"
            maxlength="256"
            show-word-limit
          />
        </el-form-item>
        <el-form-item :label="t('wolf.labelApp')" prop="appID">
          <el-input v-model="permission.appID" readonly />
        </el-form-item>
        <el-form-item :label="t('wolf.newPermLabelCategory')" prop="categoryID">
          <el-select
            v-model="permission.categoryID"
            :placeholder="t('wolf.newPermPromptCategory')"
            size="small"
            style="display: block"
            clearable
            filterable
          >
            <el-option
              v-for="cat in categorys"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            />
          </el-select>
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

