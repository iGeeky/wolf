<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { message } from "@/utils/message";
import { ElMessageBox } from "element-plus";
import type { FormInstance, FormRules } from "element-plus";
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

const { t } = useI18n();

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
const oauthCollapseActive = ref<string[]>([]);

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

const formRef = ref<FormInstance>();

function formatLifetimePart(
  n: number,
  oneKey: string,
  manyKey: string
): string {
  return n === 1 ? t(oneKey, { n }) : t(manyKey, { n });
}

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
      callback(new Error(t("wolf.appPromptAppIDExist")));
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
      callback(new Error(t("wolf.appPromptAppNameExist")));
    } else {
      callback();
    }
  } catch {
    callback();
  }
}

const rules = computed<FormRules>(() => {
  const r: FormRules = {
    id: [
      {
        required: true,
        message: t("wolf.appRulesMessageIDRequired"),
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
      { validator: validateAppId as any, trigger: ["blur", "change"] }
    ],
    name: [
      {
        required: true,
        message: t("wolf.appRulesMessageNameRequired"),
        trigger: ["blur", "change"]
      },
      { validator: validateAppName as any, trigger: ["blur", "change"] }
    ]
  };
  return r;
});

// Token 存活时间格式化
const lifetimeFormatter = (seconds: number): string => {
  if (!seconds || seconds <= 0) return t("wolf.appLifetimeDefault");
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const parts: string[] = [];
  if (days > 0) {
    parts.push(
      formatLifetimePart(days, "wolf.appLifetimeOneDay", "wolf.appLifetimeDays")
    );
  }
  if (hours > 0) {
    parts.push(
      formatLifetimePart(
        hours,
        "wolf.appLifetimeOneHour",
        "wolf.appLifetimeHours"
      )
    );
  }
  if (minutes > 0) {
    parts.push(
      formatLifetimePart(
        minutes,
        "wolf.appLifetimeOneMinute",
        "wolf.appLifetimeMinutes"
      )
    );
  }
  if (secs > 0) {
    parts.push(
      formatLifetimePart(
        secs,
        "wolf.appLifetimeOneSecond",
        "wolf.appLifetimeSeconds"
      )
    );
  }
  return parts.join(" ") || t("wolf.appLifetimeZeroSeconds");
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
const lifetimeFormat = (row: Application, column: { property: string }) => {
  const value = row[column.property as keyof Application] as number;
  return lifetimeFormatter(value);
};

// 随机密钥
const randomSecret = (): string => {
  const chars = "23456789abcdefghijkmnpqrstuvwxyzABCDEFJHIJKLMNOPQRSTUVWXYZ";
  const secret: string[] = [];
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
  oauthCollapseActive.value = [];
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
  const hasOAuthConfig =
    (row.redirectUris && row.redirectUris.length > 0) ||
    (row.accessTokenLifetime && row.accessTokenLifetime > 0) ||
    (row.refreshTokenLifetime && row.refreshTokenLifetime > 0);
  oauthCollapseActive.value = hasOAuthConfig ? ["oauth2"] : [];
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
    await ElMessageBox.confirm(
      t("wolf.appPromptConfirmResetSecret"),
      t("wolf.dialogTitleWarning"),
      {
        confirmButtonText: t("wolf.btnConfirm"),
        cancelButtonText: t("wolf.btnCancel"),
        type: "warning"
      }
    );
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
    await ElMessageBox.confirm(
      t("wolf.appPromptConfirmRemove"),
      t("wolf.dialogTitleWarning"),
      {
        confirmButtonText: t("wolf.btnConfirm"),
        cancelButtonText: t("wolf.btnCancel"),
        type: "warning"
      }
    );
    const res = await deleteApplication(row.id);
    if (res.ok) {
      message(t("wolf.appPromptRemoveSuccess"), { type: "success" });
      fetchApplications();
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

  if (data.secret === secretMask) {
    delete data.secret;
  }

  try {
    if (isEdit) {
      const res = await updateApplication(application.id, data);
      if (res.ok) {
        message(t("wolf.appPromptUpdateSuccess"), { type: "success" });
        dialogVisible.value = false;
        fetchApplications();
        await useUserStoreHook().getUserInfo();
      }
    } else {
      const res = await addApplication(data);
      if (res.ok) {
        message(t("wolf.appPromptAddSuccess"), { type: "success" });
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
    <div class="search-bar">
      <el-input
        v-model="listQuery.key"
        :placeholder="t('wolf.appSearchPrompt')"
        style="width: 200px"
        clearable
        @keyup.enter="handleFilter"
      />
      <el-button
        type="primary"
        :icon="useRenderIcon(Search)"
        @click="handleFilter"
      >
        {{ t("wolf.search") }}
      </el-button>
      <el-button type="primary" :icon="useRenderIcon(Plus)" @click="handleAdd">
        {{ t("wolf.appNewApplication") }}
      </el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="applications"
      border
      style="margin-top: 20px"
    >
      <el-table-column
        align="center"
        :label="t('wolf.appTitleId')"
        prop="id"
        min-width="100"
        show-overflow-tooltip
      />
      <el-table-column
        align="center"
        :label="t('wolf.appTitleName')"
        prop="name"
        min-width="120"
        show-overflow-tooltip
      />
      <el-table-column
        align="center"
        :label="t('wolf.appTitleDescription')"
        prop="description"
        min-width="200"
        show-overflow-tooltip
      />
      <el-table-column
        align="center"
        :label="t('wolf.appTitleRedirectUris')"
        min-width="200"
        show-overflow-tooltip
        :formatter="redirectUrisFormat"
      />
      <el-table-column
        align="center"
        :label="t('wolf.appTitleAccessTokenLifetime')"
        prop="accessTokenLifetime"
        min-width="150"
        :formatter="lifetimeFormat"
      />
      <el-table-column
        align="center"
        :label="t('wolf.appTitleRefreshTokenLifetime')"
        prop="refreshTokenLifetime"
        min-width="150"
        :formatter="lifetimeFormat"
      />
      <el-table-column
        align="center"
        :label="t('wolf.appTitleCreateTime')"
        min-width="160"
        :formatter="unixtimeFormat"
      />
      <el-table-column
        align="center"
        :label="t('wolf.appTitleOperations')"
        min-width="150"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            type="primary"
            size="small"
            :icon="useRenderIcon(Edit)"
            @click="handleEdit(row)"
          >
            {{ t("wolf.btnEdit") }}
          </el-button>
          <el-button
            type="danger"
            size="small"
            :icon="useRenderIcon(Delete)"
            @click="handleDelete(row)"
          >
            {{ t("wolf.btnDelete") }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

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

    <el-dialog
      v-model="dialogVisible"
      :title="
        dialogType === 'edit'
          ? t('wolf.appEditApplication')
          : t('wolf.appNewApplication')
      "
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
        <el-form-item :label="t('wolf.appFormLabelId')" prop="id">
          <el-input
            v-model="application.id"
            :placeholder="t('wolf.appPlaceholderId')"
            :readonly="dialogType === 'edit'"
            minlength="3"
            maxlength="32"
            show-word-limit
          />
        </el-form-item>

        <el-form-item :label="t('wolf.appFormLabelName')" prop="name">
          <el-input
            v-model="application.name"
            :placeholder="t('wolf.appPlaceholderName')"
            minlength="5"
            maxlength="64"
            show-word-limit
          />
        </el-form-item>

        <el-form-item
          :label="t('wolf.appFormLabelDescription')"
          prop="description"
        >
          <el-input
            v-model="application.description"
            :placeholder="t('wolf.appPlaceholderDescription')"
            maxlength="256"
            show-word-limit
          />
        </el-form-item>

        <el-collapse v-model="oauthCollapseActive" class="oauth-collapse">
          <el-collapse-item
            :title="t('wolf.appOAuth2SectionTitle')"
            name="oauth2"
          >
            <el-form-item :label="t('wolf.appFormLabelSecret')" prop="secret">
              <el-input
                v-model="application.secret"
                :placeholder="t('wolf.appPlaceholderSecret')"
                readonly
              >
                <template #append>
                  <el-button
                    v-if="showBtnShow"
                    :icon="useRenderIcon(View)"
                    @click="showSecret(application.id)"
                  >
                    {{ t("wolf.btnShow") }}
                  </el-button>
                  <el-button
                    v-if="showBtnReset"
                    :icon="useRenderIcon(Refresh)"
                    @click="resetSecret"
                  >
                    {{ t("wolf.btnReset") }}
                  </el-button>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item
              :label="t('wolf.appFormLabelRedirectUris')"
              prop="redirectUris"
              class="redirect-uris-item"
            >
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
                  :placeholder="t('wolf.appPlaceholderRedirectUri')"
                  maxlength="256"
                  show-word-limit
                  class="input-new-redirect-uri"
                  size="small"
                  @keyup.enter="handleRedirectUriInputConfirm"
                  @blur="handleRedirectUriInputConfirm"
                />
                <el-button v-else size="small" @click="showRedirectUriInput">
                  {{ t("wolf.appBtnAddRedirectUri") }}
                </el-button>
              </div>
            </el-form-item>

            <el-form-item
              :label="t('wolf.appFormLabelAccessTokenLifetime')"
              prop="accessTokenLifetime"
              class="lifetime-item"
            >
              <el-input
                v-model.number="application.accessTokenLifetime"
                :placeholder="t('wolf.appPlaceholderAccessTokenLifetime')"
                type="number"
                style="width: 180px"
              />
              <el-tag size="large" class="ml-2">{{
                accessTokenLifetimePrompt
              }}</el-tag>
            </el-form-item>

            <el-form-item
              :label="t('wolf.appFormLabelRefreshTokenLifetime')"
              prop="refreshTokenLifetime"
              class="lifetime-item"
            >
              <el-input
                v-model.number="application.refreshTokenLifetime"
                :placeholder="t('wolf.appPlaceholderRefreshTokenLifetime')"
                type="number"
                style="width: 180px"
              />
              <el-tag size="large" class="ml-2">{{
                refreshTokenLifetimePrompt
              }}</el-tag>
            </el-form-item>
          </el-collapse-item>
        </el-collapse>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">{{
          t("wolf.btnCancel")
        }}</el-button>
        <el-button type="primary" @click="validateAndSubmit">{{
          t("wolf.btnConfirm")
        }}</el-button>
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

.oauth-collapse {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  margin-top: 8px;

  :deep(.el-collapse-item__header) {
    padding: 0 16px;
    font-weight: 600;
    color: var(--el-text-color-secondary);
    background-color: var(--el-fill-color-lighter);
    border-radius: 4px;
  }

  :deep(.el-collapse-item__wrap) {
    border-bottom: none;
  }

  :deep(.el-collapse-item__content) {
    padding: 16px 0 0;
  }
}
</style>
