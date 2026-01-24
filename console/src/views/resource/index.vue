<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useUserStoreHook } from "@/store/modules/user";
import CurrentApp from "@/components/CurrentApp/index.vue";
import PermissionSelect from "@/components/PermissionSelect/index.vue";
import {
  listResources,
  addResource,
  deleteResource,
  updateResource,
  checkResourceExist,
  getResourceOptions
} from "@/api/resource";
import { listPermissions, getSysPermissions } from "@/api/permission";
import { deepClone, format, formatUnixTime } from "@/utils/wolf";
import { ElMessage, ElMessageBox, ElNotification } from "element-plus";
import type { FormInstance, FormRules } from "element-plus";

const { t } = useI18n();
const userStore = useUserStoreHook();

interface ResourceInfo {
  id?: number;
  appID: string;
  matchType: string;
  name: string;
  action: string;
  permID: string;
  matchTypeName?: string;
  permission_name?: string;
  createTime?: number;
}

interface PermissionInfo {
  id: string;
  name: string;
}

const defaultResource: ResourceInfo = {
  appID: "",
  matchType: "equal",
  name: "",
  action: "ALL",
  permID: "DENY_ALL"
};

const resourceFormRef = ref<FormInstance>();
const resources = ref<ResourceInfo[]>([]);
const permissions = ref<PermissionInfo[]>([]);
const total = ref(0);
const resource = ref<ResourceInfo>({ ...defaultResource });
const dialogVisible = ref(false);
const dialogType = ref<"new" | "edit">("new");
const rbacUseRadixTreeRouting = ref(false);
const showFullDescription = ref(false);

const listQuery = reactive({
  page: 1,
  limit: 10,
  key: "",
  appID: "",
  sort: "-createTime"
});

const currentApp = computed(() => userStore.currentApp);

const matchTypes = [
  { type: "equal", name: t("wolf.labelEqualsMatch") },
  { type: "prefix", name: t("wolf.labelPrefixMatch") },
  { type: "suffix", name: t("wolf.labelSuffixMatch") }
];

const actions = [
  "ALL",
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "HEAD",
  "OPTIONS",
  "PATCH"
];

const dialogTitle = computed(() => {
  return dialogType.value === "edit"
    ? t("wolf.resEditResource")
    : t("wolf.resNewResource");
});

const getMatchTypeFromName = (name: string): string => {
  if (!name) return "-";
  if (name.startsWith("*")) return "suffix";
  if (name.indexOf("*") > 0) return "prefix";
  return "equal";
};

const radixTypeMatchType = computed(() => {
  if (rbacUseRadixTreeRouting.value) {
    const matchTypeFromName = getMatchTypeFromName(resource.value.name);
    const matchTypeInfo = matchTypes.find(m => m.type === matchTypeFromName);
    return matchTypeInfo?.name || "-";
  }
  return "-";
});

const getMatchName = (matchType: string, name: string): string => {
  const matchTypeInfo = matchTypes.find(m => m.type === matchType);
  if (matchTypeInfo) return matchTypeInfo.name;
  if (matchType === "radixtree") {
    const matchTypeFromName = getMatchTypeFromName(name);
    const info = matchTypes.find(m => m.type === matchTypeFromName);
    return info ? "tree:" + info.name : matchType;
  }
  return matchType;
};

const getPermissionName = (permID: string): string => {
  const perm = permissions.value.find(p => p.id === permID);
  return perm?.name || permID;
};

const validateResource = async (
  _rule: any,
  _value: string,
  callback: (error?: Error) => void
) => {
  const { matchType, name, action } = resource.value;
  const res = await checkResourceExist(resource.value as any);
  if (res.ok && res.exist) {
    const prompt = format(t("wolf.resPromptResourceExist"), {
      matchTypeKey: t("wolf.resTitleMatchType"),
      matchType,
      actionKey: t("wolf.resTitleAction"),
      action,
      nameKey: t("wolf.titleName"),
      name
    });
    callback(new Error(prompt));
  } else {
    callback();
  }
};

const rules = computed<FormRules>(() => ({
  name: [
    {
      required: true,
      message: t("wolf.resRulesMessageNameRequired"),
      trigger: ["blur", "change"]
    },
    {
      min: 1,
      max: 512,
      message: t("wolf.resRulesMessageNameLength"),
      trigger: ["blur", "change"]
    },
    { validator: validateResource, trigger: ["blur", "change"] }
  ],
  matchType: [{ validator: validateResource, trigger: ["blur", "change"] }],
  action: [{ validator: validateResource, trigger: ["blur", "change"] }],
  permID: [
    {
      required: true,
      message: t("wolf.resRulesMessagePermIDRequired"),
      trigger: ["blur", "change"]
    }
  ]
}));

const unixtimeFormat = (
  _row: ResourceInfo,
  _column: any,
  cellValue: number
): string => {
  return formatUnixTime(cellValue);
};

const fetchResources = async () => {
  listQuery.appID = currentApp.value;
  const res = await listResources(listQuery);
  if (res?.ok) {
    total.value = res.data?.total || 0;
    const resourceList = res.data?.resources || [];

    // 获取权限名称
    if (resourceList.length > 0) {
      const permIDs = resourceList.map((r: ResourceInfo) => r.permID);
      const permRes = await listPermissions({
        appID: currentApp.value,
        ids: permIDs.join(","),
        limit: 512
      });
      if (permRes?.ok) {
        const sysPermissions = getSysPermissions();
        permissions.value = [
          ...sysPermissions,
          ...(permRes.data?.permissions || [])
        ];
      }

      resourceList.forEach((r: ResourceInfo) => {
        r.matchTypeName = getMatchName(r.matchType, r.name);
        r.permission_name = getPermissionName(r.permID);
      });
    }
    resources.value = resourceList;
  }
};

const fetchResourceOptions = async () => {
  const options = await getResourceOptions();
  if (options) {
    rbacUseRadixTreeRouting.value = options.rbacUseRadixTreeRouting || false;
    if (rbacUseRadixTreeRouting.value) {
      defaultResource.matchType = "radixtree";
    }
  }
};

watch(currentApp, () => {
  fetchResources();
});

const handleFilter = () => {
  listQuery.page = 1;
  fetchResources();
};

const handleAdd = () => {
  resource.value = { ...defaultResource, appID: currentApp.value };
  dialogType.value = "new";
  dialogVisible.value = true;
};

const handleEdit = (row: ResourceInfo) => {
  dialogType.value = "edit";
  dialogVisible.value = true;
  resource.value = deepClone(row);
};

const handleDelete = (row: ResourceInfo) => {
  ElMessageBox.confirm(t("wolf.resPromptConfirmRemove"), "Warning", {
    confirmButtonText: t("wolf.btnConfirm"),
    cancelButtonText: t("wolf.btnCancel"),
    type: "warning"
  })
    .then(async () => {
      const res = await deleteResource(row.id!);
      if (res?.ok) {
        fetchResources();
        ElMessage.success(t("wolf.resPromptRemoveSuccess"));
      }
    })
    .catch(() => {});
};

const validateAndSubmit = async () => {
  if (!resourceFormRef.value) return;
  const valid = await resourceFormRef.value.validate().catch(() => false);
  if (valid) {
    await submitResource();
  }
};

const submitResource = async () => {
  const isEdit = dialogType.value === "edit";
  if (isEdit) {
    const res = await updateResource(resource.value.id!, resource.value);
    if (!res?.ok) return;
    fetchResources();
    dialogVisible.value = false;
    ElNotification({
      title: "Success",
      message: t("wolf.resPromptUpdateSuccess"),
      type: "success"
    });
  } else {
    const res = await addResource(resource.value);
    if (!res?.ok) return;
    fetchResources();
    dialogVisible.value = false;
    ElNotification({
      title: "Success",
      message: t("wolf.resPromptAddSuccess"),
      type: "success"
    });
  }
};

const handlePageChange = () => {
  fetchResources();
};

onMounted(async () => {
  await fetchResourceOptions();
  await fetchResources();
});
</script>

<template>
  <div class="app-container">
    <div class="filter-container">
      <div class="filter-item">{{ t("wolf.app") }}:</div>
      <CurrentApp class="current-app filter-item" />
      <el-input
        v-model="listQuery.key"
        :placeholder="t('wolf.resSearchPrompt')"
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
        {{ t("wolf.resNewResource") }}
      </el-button>
    </div>

    <el-table :data="resources" style="margin-top: 30px" border>
      <el-table-column
        align="center"
        :label="t('wolf.titleApp')"
        min-width="100"
        show-overflow-tooltip
        prop="appID"
      />
      <el-table-column
        align="center"
        :label="t('wolf.resTitleMatchType')"
        min-width="100"
        show-overflow-tooltip
        prop="matchTypeName"
      />
      <el-table-column
        align="center"
        :label="t('wolf.titleName')"
        min-width="200"
        show-overflow-tooltip
        prop="name"
      />
      <el-table-column
        align="center"
        :label="t('wolf.resTitleAction')"
        min-width="80"
        show-overflow-tooltip
        prop="action"
      />
      <el-table-column
        align="center"
        :label="t('wolf.resTitlePermission')"
        min-width="120"
        show-overflow-tooltip
        prop="permission_name"
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
      :title="dialogTitle"
      class="rbac-edit-dialog"
    >
      <el-form
        ref="resourceFormRef"
        :model="resource"
        :rules="rules"
        label-width="120px"
        label-position="left"
      >
        <el-form-item :label="t('wolf.labelApp')" prop="appID">
          <el-input v-model="resource.appID" readonly />
        </el-form-item>
        <el-form-item :label="t('wolf.resTitleAction')" prop="action">
          <el-select
            v-model="resource.action"
            size="small"
            style="display: block"
          >
            <el-option
              v-for="action in actions"
              :key="action"
              :label="action"
              :value="action"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          v-if="rbacUseRadixTreeRouting"
          :label="t('wolf.resTitleMatchType')"
          prop="matchType"
        >
          <el-tag size="small" type="info">{{ radixTypeMatchType }}</el-tag>
        </el-form-item>
        <el-form-item
          v-else
          :label="t('wolf.resTitleMatchType')"
          prop="matchType"
        >
          <el-select
            v-model="resource.matchType"
            size="small"
            style="display: block"
          >
            <el-option
              v-for="mt in matchTypes"
              :key="mt.type"
              :label="mt.name"
              :value="mt.type"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('wolf.titleName')" prop="name">
          <el-input
            v-model="resource.name"
            :placeholder="t('wolf.newResourcePromptName')"
          />
          <div v-if="rbacUseRadixTreeRouting" class="resname-description">
            <div v-if="!showFullDescription">
              <span v-html="t('wolf.resPromptNameShortDescription')" />
              <el-button
                type="primary"
                link
                @click="showFullDescription = true"
              >
                {{ t("wolf.btnShowMore") }}
              </el-button>
            </div>
            <div v-else>
              <span v-html="t('wolf.resPromptNameFullDescription')" />
              <el-button
                type="primary"
                link
                @click="showFullDescription = false"
              >
                {{ t("wolf.btnShowLess") }}
              </el-button>
            </div>
          </div>
        </el-form-item>
        <el-form-item :label="t('wolf.resTitlePermission')" prop="permID">
          <PermissionSelect v-model="resource.permID" />
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
.resname-description {
  font-size: 12px;
  color: #909399;
  line-height: 1.2;
}
</style>
