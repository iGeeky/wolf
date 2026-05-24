<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useUserStoreHook } from "@/store/modules/user";
import CurrentApp from "@/components/CurrentApp/index.vue";
import {
  listCategorys,
  addCategory,
  deleteCategory,
  updateCategory,
  checkCategoryNameExist
} from "@/api/category";
import { deepClone, formatUnixTime } from "@/utils/wolf";
import { ElMessage, ElMessageBox, ElNotification } from "element-plus";
import type { FormInstance, FormRules } from "element-plus";

const { t } = useI18n();
const userStore = useUserStoreHook();

interface CategoryInfo {
  id?: number;
  appID: string;
  name: string;
  createTime?: number;
}

const defaultCategory: CategoryInfo = {
  appID: "",
  name: ""
};

const categoryFormRef = ref<FormInstance>();
const categorys = ref<CategoryInfo[]>([]);
const total = ref(0);
const category = ref<CategoryInfo>({ ...defaultCategory });
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

const validateCategoryName = async (
  _rule: any,
  value: string,
  callback: (error?: Error) => void
) => {
  const res = await checkCategoryNameExist(
    currentApp.value,
    value,
    category.value.id
  );
  if (res.ok && res.exist) {
    callback(new Error(t("wolf.categoryPromptNameExist")));
  } else {
    callback();
  }
};

const rules = computed<FormRules>(() => ({
  name: [
    {
      required: true,
      message: t("wolf.categoryRulesMessageNameRequired"),
      trigger: ["blur", "change"]
    },
    {
      min: 2,
      max: 32,
      message: t("wolf.pubRulesMessageLength_2_32"),
      trigger: ["blur", "change"]
    },
    { validator: validateCategoryName, trigger: ["blur", "change"] }
  ]
}));

const unixtimeFormat = (
  _row: CategoryInfo,
  _column: any,
  cellValue: number
): string => {
  return formatUnixTime(cellValue);
};

const fetchCategorys = async () => {
  listQuery.appID = currentApp.value;
  const res = await listCategorys(listQuery);
  if (res?.ok) {
    total.value = res.data?.total || 0;
    categorys.value = res.data?.categorys || [];
  }
};

watch(currentApp, () => {
  fetchCategorys();
});

const handleFilter = () => {
  listQuery.page = 1;
  fetchCategorys();
};

const handleAdd = () => {
  category.value = { ...defaultCategory, appID: currentApp.value };
  dialogType.value = "new";
  dialogVisible.value = true;
};

const handleEdit = (row: CategoryInfo) => {
  dialogType.value = "edit";
  dialogVisible.value = true;
  category.value = deepClone(row);
};

const handleDelete = (row: CategoryInfo) => {
  ElMessageBox.confirm(t("wolf.categoryPromptConfirmRemove"), "Warning", {
    confirmButtonText: t("wolf.btnConfirm"),
    cancelButtonText: t("wolf.btnCancel"),
    type: "warning"
  })
    .then(async () => {
      const res = await deleteCategory(row.id!);
      if (res?.ok) {
        fetchCategorys();
        ElMessage.success(t("wolf.categoryPromptRemoveSuccess"));
      }
    })
    .catch(() => {});
};

const validateAndSubmit = async () => {
  if (!categoryFormRef.value) return;
  const valid = await categoryFormRef.value.validate().catch(() => false);
  if (valid) {
    await submitCategory();
  }
};

const submitCategory = async () => {
  const isEdit = dialogType.value === "edit";
  if (isEdit) {
    const res = await updateCategory(category.value.id!, category.value);
    if (!res?.ok) return;
    fetchCategorys();
    dialogVisible.value = false;
    ElNotification({
      title: "Success",
      message: t("wolf.categoryPromptUpdateSuccess"),
      type: "success"
    });
  } else {
    const res = await addCategory(category.value);
    if (!res?.ok) return;
    fetchCategorys();
    dialogVisible.value = false;
    ElNotification({
      title: "Success",
      message: t("wolf.categoryPromptAddSuccess"),
      type: "success"
    });
  }
};

const handlePageChange = () => {
  fetchCategorys();
};

onMounted(() => {
  fetchCategorys();
});
</script>

<template>
  <div class="app-container">
    <div class="filter-container">
      <div class="filter-item">{{ t("wolf.app") }}:</div>
      <CurrentApp class="current-app filter-item" />
      <el-input
        v-model="listQuery.key"
        :placeholder="t('wolf.categorySearchPrompt')"
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
        {{ t("wolf.categoryNewCategory") }}
      </el-button>
    </div>

    <el-table :data="categorys" style="margin-top: 30px" border>
      <el-table-column
        align="center"
        label="ID"
        min-width="80"
        show-overflow-tooltip
        prop="id"
      />
      <el-table-column
        align="center"
        :label="t('wolf.titleName')"
        min-width="150"
        show-overflow-tooltip
        prop="name"
      />
      <el-table-column
        align="center"
        :label="t('wolf.titleApp')"
        min-width="120"
        show-overflow-tooltip
        prop="appID"
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
          ? t('wolf.categoryEditCategory')
          : t('wolf.categoryNewCategory')
      "
      class="rbac-edit-dialog"
    >
      <el-form
        ref="categoryFormRef"
        :model="category"
        :rules="rules"
        label-width="120px"
        label-position="left"
      >
        <el-form-item
          v-if="dialogType === 'edit'"
          :label="t('wolf.newCategoryLabelID')"
          prop="id"
        >
          <el-input
            :model-value="String(category.id)"
            :placeholder="t('wolf.newCategoryPromptID')"
            readonly
          />
        </el-form-item>
        <el-form-item :label="t('wolf.newCategoryLabelName')" prop="name">
          <el-input
            v-model="category.name"
            :placeholder="t('wolf.newCategoryPromptName')"
            minlength="5"
            maxlength="64"
            show-word-limit
          />
        </el-form-item>
        <el-form-item :label="t('wolf.labelApp')" prop="appID">
          <el-input v-model="category.appID" readonly />
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
