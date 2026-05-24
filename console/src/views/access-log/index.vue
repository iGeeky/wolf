<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useUserStoreHook } from "@/store/modules/user";
import CurrentApp from "@/components/CurrentApp/index.vue";
import { listAccessLogs, type WolfAccessLog } from "@/api/access-log";
import { deepClone, formatUnixTime } from "@/utils/wolf";
import dayjs from "dayjs";

const { t } = useI18n();
const userStore = useUserStoreHook();

const accessLogs = ref<WolfAccessLog[]>([]);
const total = ref(0);
const accessLog = ref<WolfAccessLog | null>(null);
const jsonViewerVisible = ref(false);
const datetimeRange = ref<[Date, Date] | []>([]);

const listQuery = reactive({
  page: 1,
  limit: 10,
  appID: "",
  username: "",
  action: "",
  resName: "",
  ip: "",
  status: undefined as number | undefined,
  startTime: "",
  endTime: "",
  sort: "-id"
});

const currentApp = computed(() => userStore.currentApp);

const actions = ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS", "PATCH"];
const statuses = [
  { status: 200, description: "HTTP OK" },
  { status: 401, description: "Unauthorized" },
  { status: 403, description: "Forbidden" },
  { status: 400, description: "Bad Request" }
];

const unixtimeFormat = (
  _row: WolfAccessLog,
  _column: any,
  cellValue: number
): string => {
  return formatUnixTime(cellValue);
};

const usernameFormat = (
  row: WolfAccessLog,
  column: { property: keyof WolfAccessLog }
): string => {
  let username = String(row[column.property] || "");
  const nickname = row.nickname;
  if (nickname) {
    username = username + "/" + nickname;
  }
  return username;
};

const jsonIsEmpty = (obj: object | undefined): boolean => {
  if (!obj || Object.keys(obj).length === 0) {
    return true;
  }
  return false;
};

const fetchAccessLogs = async () => {
  listQuery.appID = currentApp.value;
  const res = await listAccessLogs(listQuery);
  if (res?.ok) {
    total.value = res.data?.total || 0;
    accessLogs.value = res.data?.accessLogs || [];
  }
};

watch(currentApp, () => {
  fetchAccessLogs();
});

watch(datetimeRange, val => {
  if (val && val.length === 2) {
    listQuery.startTime = dayjs(val[0]).format();
    listQuery.endTime = dayjs(val[1]).format();
  } else {
    listQuery.startTime = "";
    listQuery.endTime = "";
  }
});

const handleFilter = () => {
  listQuery.page = 1;
  fetchAccessLogs();
};

const handleJsonView = (row: WolfAccessLog) => {
  accessLog.value = deepClone(row);
  jsonViewerVisible.value = true;
};

const handlePageChange = () => {
  fetchAccessLogs();
};

onMounted(() => {
  fetchAccessLogs();
});
</script>

<template>
  <div class="app-container">
    <div class="filter-container">
      <div class="filter-item">{{ t("wolf.app") }}:</div>
      <CurrentApp class="current-app filter-item" add-rbac-console-item />

      <el-select
        v-model="listQuery.action"
        class="filter-item"
        :placeholder="t('wolf.alogPromptHttpMethod')"
        size="small"
        clearable
        style="width: 140px"
      >
        <el-option
          v-for="action in actions"
          :key="action"
          :label="action"
          :value="action"
        />
      </el-select>

      <el-select
        v-model="listQuery.status"
        class="filter-item"
        :placeholder="t('wolf.alogPromptRequestStatus')"
        size="small"
        clearable
        style="width: 150px"
      >
        <el-option
          v-for="status in statuses"
          :key="status.status"
          :label="status.description"
          :value="status.status"
        />
      </el-select>

      <el-input
        v-model="listQuery.resName"
        :placeholder="t('wolf.alogPromptUrl')"
        style="width: 200px"
        class="filter-item"
        maxlength="128"
        clearable
        @keyup.enter="handleFilter"
      />

      <el-input
        v-model="listQuery.ip"
        :placeholder="t('wolf.alogPromptIp')"
        style="width: 150px"
        class="filter-item"
        maxlength="64"
        clearable
        @keyup.enter="handleFilter"
      />

      <el-input
        v-model="listQuery.username"
        :placeholder="t('wolf.alogPromptUsername')"
        style="width: 200px"
        class="filter-item"
        maxlength="128"
        clearable
        @keyup.enter="handleFilter"
      />

      <el-date-picker
        v-model="datetimeRange"
        type="datetimerange"
        :range-separator="t('wolf.alogDateRangeSeparator')"
        :start-placeholder="t('wolf.alogDateStartPlaceholder')"
        :end-placeholder="t('wolf.alogDateEndPlaceholder')"
        class="filter-item"
        style="width: 380px"
      />

      <el-button class="filter-item" type="primary" @click="handleFilter">
        {{ t("wolf.search") }}
      </el-button>
    </div>

    <el-table :data="accessLogs" style="margin-top: 30px" border>
      <el-table-column
        align="center"
        label="ID"
        min-width="80"
        show-overflow-tooltip
        prop="id"
      />
      <el-table-column
        align="center"
        :label="t('wolf.alogTitleUsername')"
        min-width="150"
        prop="username"
        show-overflow-tooltip
        :formatter="usernameFormat"
      />
      <el-table-column
        align="center"
        :label="t('wolf.alogTitleMethod')"
        min-width="80"
        show-overflow-tooltip
        prop="action"
      />
      <el-table-column
        align="center"
        :label="t('wolf.alogTitleUrl')"
        min-width="250"
        show-overflow-tooltip
        prop="resName"
      />
      <el-table-column
        align="center"
        :label="t('wolf.alogTitleStatus')"
        min-width="80"
        show-overflow-tooltip
        prop="status"
      />
      <el-table-column
        align="center"
        :label="t('wolf.alogTitleAccessTime')"
        min-width="150"
        show-overflow-tooltip
        prop="accessTime"
        :formatter="unixtimeFormat"
      />
      <el-table-column
        align="center"
        :label="t('wolf.alogTitleClientIP')"
        min-width="120"
        show-overflow-tooltip
        prop="ip"
      />
      <el-table-column
        align="center"
        :label="t('wolf.titleOperations')"
        min-width="100"
      >
        <template #default="{ row }">
          <el-button
            v-if="!jsonIsEmpty(row.body)"
            type="primary"
            size="small"
            @click="handleJsonView(row)"
          >
            {{ t("wolf.alogBtnViewBody") }}
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

    <el-dialog v-model="jsonViewerVisible" title="Json Viewer" center>
      <pre v-if="accessLog?.body" class="json-viewer">{{
        JSON.stringify(accessLog.body, null, 2)
      }}</pre>
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
.json-viewer {
  background: #f5f5f5;
  padding: 16px;
  border-radius: 4px;
  overflow: auto;
  max-height: 400px;
  font-family: monospace;
  font-size: 12px;
}
</style>
