<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import { useUserStoreHook } from "@/store/modules/user";
import {
  type Application,
  type ApplicationListParams,
  listApplications,
  addApplication,
  updateApplication,
  deleteApplication,
  getSecret,
  checkAppIdExist,
  checkAppNameExist
} from "@/api/application";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import Search from "~icons/ep/search";
import Plus from "~icons/ep/plus";
import Edit from "~icons/ep/edit";
import Delete from "~icons/ep/delete";
import View from "~icons/ep/view";
import Refresh from "~icons/ep/refresh";

defineOptions({
  name: "ApplicationList"
});

// 列表数据
const applications = ref<Application[]>([]);
const total = ref(0);
const loading = ref(false);

// 查询参数
const listQuery = reactive<ApplicationListParams>({
  page: 1,
  limit: 10,
  key: "",
  sort: "-createTime"
});

// 对话框
const dialogVisible = ref(false);
const dialogType = ref<"new" | "edit">("new");
const secretMask = "**********";
const showBtnShow = ref(false);
const showBtnReset = ref(false);
const redirectUriInputVisible = ref(false);
const redirectUriInputValue = ref("");
const saveRedirectUriInput = ref<HTMLInputElement>();

// 默认应用数据
const defaultApplication: Application = {
  id: "",
  name: "",
  description: "",
  secret: "",
  redirectUris: [],
  accessTokenLifetime: 0,
  refreshTokenLifetime: 0
};

// 当前编辑的应用
const application = reactive<Application>({ ...defaultApplication });

// 表单规则
const formRef = ref();
const rules = {
  id: [
    { required: true, message: "请输入应用ID", trigger: ["blur", "change"] },
    {
      min: 2,
      max: 32,
      message: "长度只能是2-32个字符",
      trigger: ["blur", "change"]
    },
    {
      pattern: /^[a-zA-Z0-9_-]*$/,
      message: "只能包含: 字母(a-zA-Z), 数字(0-9),下划线(_),连字符(-)",
      trigger: ["blur", "change"]
    },
    { validator: validateAppId, trigger: ["blur", "change"] }
  ],
  name: [
    { required: true, message: "请输入应用名称", trigger: ["blur", "change"] },
    { validator: validateAppName, trigger: ["blur", "change"] }
  ]
};

// 验证应用ID
async function validateAppId(
  _rule: any,
  value: string,
  callback: (error?: Error) => void
) {
  if (dialogType.value === "edit") {
    callback();
    return;
  }
  try {
    const res = await checkAppIdExist(value);
    if (res.ok && res.data?.exist) {
      callback(new Error("应用ID已经存在了"));
    } else {
      callback();
    }
  } catch {
    callback();
  }
}

// 验证应用名称
async function validateAppName(
  _rule: any,
  value: string,
  callback: (error?: Error) => void
) {
  try {
    const res = await checkAppNameExist(value, application.id);
    if (res.ok && res.data?.exist) {
      callback(new Error("应用名称已经存在了"));
    } else {
      callback();
    }
  } catch {
    callback();
  }
}

// Token 存活时间格式化
const lifetimeFormatter = (seconds: number): string => {
  if (!seconds || seconds <= 0) return "默认";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const parts = [];
  if (days > 0) parts.push(`${days}天`);
  if (hours > 0) parts.push(`${hours}小时`);
  if (minutes > 0) parts.push(`${minutes}分钟`);
  if (secs > 0) parts.push(`${secs}秒`);
  return parts.join("") || "0秒";
};

// 计算属性
const accessTokenLifetimePrompt = computed(() =>
  lifetimeFormatter(application.accessTokenLifetime || 0)
);
const refreshTokenLifetimePrompt = computed(() =>
  lifetimeFormatter(application.refreshTokenLifetime || 0)
);

// 时间格式化
const unixtimeFormat = (row: Application) => {
  if (!row.createTime) return "";
  return new Date(row.createTime * 1000).toLocaleString();
};

// 重定向URI格式化
const redirectUrisFormat = (row: Application) => {
  return row.redirectUris?.join(", ") || "";
};

// 生存时间格式化
const lifetimeFormat = (row: Application, column: any) => {
  const value = row[column.property as keyof Application] as number;
  return lifetimeFormatter(value);
};

// 随机密钥
const randomSecret = (): string => {
  const chars =
    "23456789abcdefghijkmnpqrstuvwxyzABCDEFJHIJKLMNOPQRSTUVWXYZ";
  const secret = [];
  for (let i = 0; i < 40; i++) {
    const rand = Math.floor(Math.random() * chars.length);
    secret.push(chars[rand]);
  }
  return secret.join("");
};

// 加载列表
const fetchApplications = async () => {
  loading.value = true;
  try {
    const res = await listApplications(listQuery);
    if (res.ok && res.data) {
      total.value = res.data.total;
      applications.value = res.data.applications;
    }
  } finally {
    loading.value = false;
  }
};

// 搜索
const handleFilter = () => {
  listQuery.page = 1;
  fetchApplications();
};

// 新增
const handleAdd = () => {
  dialogVisible.value = true;
  dialogType.value = "new";
  Object.assign(application, { ...defaultApplication });
  application.secret = randomSecret();
  showBtnShow.value = false;
  showBtnReset.value = false;
};

// 编辑
const handleEdit = (row: Application) => {
  dialogType.value = "edit";
  dialogVisible.value = true;
  Object.assign(application, {
    ...row,
    secret: secretMask,
    redirectUris: row.redirectUris ? [...row.redirectUris] : []
  });
  showBtnShow.value = true;
  showBtnReset.value = false;
};

// 显示密钥
const showSecret = async (id: string) => {
  try {
    const res = await getSecret(id);
    if (res.ok && res.data) {
      application.secret = res.data.secret;
      showBtnShow.value = false;
      showBtnReset.value = true;
    }
  } catch (e) {
    console.error("Failed to get secret:", e);
  }
};

// 重置密钥
const resetSecret = async () => {
  try {
    await ElMessageBox.confirm("确定要重置密钥吗?", "警告", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning"
    });
    application.secret = randomSecret();
    showBtnReset.value = false;
  } catch {
    // 取消
  }
};

// 删除重定向URI
const handleRedirectUriDelete = (uri: string) => {
  const index = application.redirectUris?.indexOf(uri);
  if (index !== undefined && index > -1) {
    application.redirectUris?.splice(index, 1);
  }
};

// 显示重定向URI输入框
const showRedirectUriInput = () => {
  redirectUriInputVisible.value = true;
  setTimeout(() => {
    saveRedirectUriInput.value?.focus();
  }, 0);
};

// 确认添加重定向URI
const handleRedirectUriInputConfirm = () => {
  if (redirectUriInputValue.value) {
    if (!application.redirectUris) {
      application.redirectUris = [];
    }
    application.redirectUris.push(redirectUriInputValue.value);
  }
  redirectUriInputVisible.value = false;
  redirectUriInputValue.value = "";
};

// 删除应用
const handleDelete = async (row: Application) => {
  try {
    await ElMessageBox.confirm("确定要删除应用吗?", "警告", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning"
    });
    const res = await deleteApplication(row.id);
    if (res.ok) {
      message("应用已经删除!", { type: "success" });
      fetchApplications();
      // 刷新用户信息
      await useUserStoreHook().getUserInfo();
    }
  } catch {
    // 取消
  }
};

// 提交表单
const validateAndSubmit = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid: boolean) => {
    if (valid) {
      await submitApplication();
    }
  });
};

// 提交应用
const submitApplication = async () => {
  const isEdit = dialogType.value === "edit";
  const data = { ...application };

  // 如果密钥未更改，不提交
  if (data.secret === secretMask) {
    delete data.secret;
  }

  try {
    if (isEdit) {
      const res = await updateApplication(application.id, data);
      if (res.ok) {
        message("应用已经修改", { type: "success" });
        dialogVisible.value = false;
        fetchApplications();
        await useUserStoreHook().getUserInfo();
      }
    } else {
      const res = await addApplication(data);
      if (res.ok) {
        message("应用已经添加", { type: "success" });
        dialogVisible.value = false;
        fetchApplications();
        await useUserStoreHook().getUserInfo();
      }
    }
  } catch (e) {
    console.error("Submit failed:", e);
  }
};

// 分页变化
const handleSizeChange = (val: number) => {
  listQuery.limit = val;
  fetchApplications();
};

const handleCurrentChange = (val: number) => {
  listQuery.page = val;
  fetchApplications();
};

onMounted(() => {
  fetchApplications();
});
</script>

<template>
  <div class="main-content">
    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-input
        v-model="listQuery.key"
        placeholder="应用ID或名称"
        style="width: 200px"
        clearable
        @keyup.enter="handleFilter"
      />
      <el-button
        type="primary"
        :icon="useRenderIcon(Search)"
        @click="handleFilter"
      >
        搜索
      </el-button>
      <el-button
        type="primary"
        :icon="useRenderIcon(Plus)"
        @click="handleAdd"
      >
        新应用
      </el-button>
    </div>

    <!-- 表格 -->
    <el-table
      v-loading="loading"
      :data="applications"
      border
      style="margin-top: 20px"
    >
      <el-table-column
        align="center"
        label="ID"
        prop="id"
        min-width="100"
        show-overflow-tooltip
      />
      <el-table-column
        align="center"
        label="名称"
        prop="name"
        min-width="120"
        show-overflow-tooltip
      />
      <el-table-column
        align="center"
        label="描述"
        prop="description"
        min-width="200"
        show-overflow-tooltip
      />
      <el-table-column
        align="center"
        label="重定向URI"
        min-width="200"
        show-overflow-tooltip
        :formatter="redirectUrisFormat"
      />
      <el-table-column
        align="center"
        label="AccessToken存活时间"
        prop="accessTokenLifetime"
        min-width="150"
        :formatter="lifetimeFormat"
      />
      <el-table-column
        align="center"
        label="RefreshToken存活时间"
        prop="refreshTokenLifetime"
        min-width="150"
        :formatter="lifetimeFormat"
      />
      <el-table-column
        align="center"
        label="创建时间"
        min-width="160"
        :formatter="unixtimeFormat"
      />
      <el-table-column align="center" label="操作" min-width="150" fixed="right">
        <template #default="{ row }">
          <el-button
            type="primary"
            size="small"
            :icon="useRenderIcon(Edit)"
            @click="handleEdit(row)"
          >
            编辑
          </el-button>
          <el-button
            type="danger"
            size="small"
            :icon="useRenderIcon(Delete)"
            @click="handleDelete(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="listQuery.page"
        v-model:page-size="listQuery.limit"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        background
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'edit' ? '编辑应用' : '新应用'"
      width="600px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="application"
        :rules="rules"
        label-width="150px"
        label-position="left"
      >
        <el-form-item label="应用ID" prop="id">
          <el-input
            v-model="application.id"
            placeholder="应用ID"
            :readonly="dialogType === 'edit'"
            minlength="3"
            maxlength="32"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="应用名称" prop="name">
          <el-input
            v-model="application.name"
            placeholder="应用名称"
            minlength="5"
            maxlength="64"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="描述" prop="description">
          <el-input
            v-model="application.description"
            placeholder="应用描述"
            maxlength="256"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="应用密钥" prop="secret">
          <el-input v-model="application.secret" placeholder="应用密钥(oauth2)" readonly>
            <template #append>
              <el-button
                v-if="showBtnShow"
                :icon="useRenderIcon(View)"
                @click="showSecret(application.id)"
              >
                显示
              </el-button>
              <el-button
                v-if="showBtnReset"
                :icon="useRenderIcon(Refresh)"
                @click="resetSecret"
              >
                重置
              </el-button>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="重定向URI" prop="redirectUris" class="redirect-uris-item">
          <div class="redirect-uris-container">
            <el-tag
              v-for="uri in application.redirectUris"
              :key="uri"
              closable
              size="large"
              @close="handleRedirectUriDelete(uri)"
            >
              {{ uri }}
            </el-tag>
            <el-input
              v-if="redirectUriInputVisible"
              ref="saveRedirectUriInput"
              v-model="redirectUriInputValue"
              placeholder="重定向URI(oauth2)"
              maxlength="256"
              show-word-limit
              class="input-new-redirect-uri"
              size="small"
              @keyup.enter="handleRedirectUriInputConfirm"
              @blur="handleRedirectUriInputConfirm"
            />
            <el-button
              v-else
              size="small"
              @click="showRedirectUriInput"
            >
              添加重定向URI
            </el-button>
          </div>
        </el-form-item>

        <el-form-item label="AccessToken存活时间" prop="accessTokenLifetime" class="lifetime-item">
          <el-input
            v-model.number="application.accessTokenLifetime"
            placeholder="Access token存活时间(秒)"
            type="number"
            style="width: 180px"
          />
          <el-tag size="large" class="ml-2">{{ accessTokenLifetimePrompt }}</el-tag>
        </el-form-item>

        <el-form-item label="RefreshToken存活时间" prop="refreshTokenLifetime" class="lifetime-item">
          <el-input
            v-model.number="application.refreshTokenLifetime"
            placeholder="Refresh token存活时间(秒)"
            type="number"
            style="width: 180px"
          />
          <el-tag size="large" class="ml-2">{{ refreshTokenLifetimePrompt }}</el-tag>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="validateAndSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.main-content {
  padding: 20px;
  background: var(--el-bg-color);
  border-radius: 4px;
}

.search-bar {
  display: flex;
  gap: 10px;
  align-items: center;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.redirect-uris-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;

  .el-tag {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.input-new-redirect-uri {
  width: 100%;
}

.lifetime-item {
  :deep(.el-form-item__content) {
    display: flex;
    align-items: center;
  }
}
</style>

