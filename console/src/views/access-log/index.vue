<template>
  <div class="app-container">

    <div class="filter-container">
      <div class="filter-item">App:</div>
      <current-app class="current-app filter-item" add-rbac-console-item />

      <el-select v-model="listQuery.action" class="filter-item" placeholder="Http Method" size="small" clearable style="width: 140px;">
        <el-option v-for="action in actions" :key="action" :label="action" :value="action" />
      </el-select>
      <!-- <div class="filter-item">Request Status:</div> -->
      <el-select v-model="listQuery.status" class="filter-item" placeholder="Request status" size="small" clearable style="width: 150px;">
        <el-option v-for="status in statuses" :key="status.status" :label="status.description" :value="status.status" />
      </el-select>
      <!-- <div class="filter-item">Url:</div> -->
      <el-input
        v-model="listQuery.resName"
        placeholder="Url for full match"
        style="width: 200px;"
        class="filter-item"
        maxlength="128"
        clearable
        @keyup.enter.native="handleFilter"
      />
      <!-- <div class="filter-item">Client IP:</div> -->
      <el-input
        v-model="listQuery.ip"
        placeholder="client ip"
        style="width: 150px;"
        class="filter-item"
        maxlength="64"
        clearable
        @keyup.enter.native="handleFilter"
      />
      <el-input
        v-model="listQuery.username"
        placeholder="username or nickname for full match"
        style="width: 200px;"
        class="filter-item"
        maxlength="128"
        clearable
        @keyup.enter.native="handleFilter"
      />
      <DatetimePicker :value.sync="datetimeRange" class="filter-item" />
      <el-button class="filter-item" type="primary" icon="el-icon-search" @click="handleFilter">
        Search
      </el-button>
    </div>

    <el-table :data="accessLogs" style="margin-top:30px; " border>
      <el-table-column align="center" label="ID" min-width="8" show-overflow-tooltip>
        <template slot-scope="scope">
          {{ scope.row.id }}
        </template>
      </el-table-column>
      <el-table-column align="center" label="Username" min-width="25" prop="username" show-overflow-tooltip :formatter="usernameFormat" />
      <el-table-column align="center" label="Method" min-width="10" show-overflow-tooltip>
        <template slot-scope="scope">
          {{ scope.row.action }}
        </template>
      </el-table-column>
      <el-table-column align="center" label="Url" min-width="50" show-overflow-tooltip>
        <template slot-scope="scope">
          {{ scope.row.resName }}
        </template>
      </el-table-column>
      <el-table-column align="center" label="Status" min-width="10" show-overflow-tooltip>
        <template slot-scope="scope">
          {{ scope.row.status }}
        </template>
      </el-table-column>
      <el-table-column align="center" label="Access Time" min-width="20" show-overflow-tooltip prop="accessTime" :formatter="unixtimeFormat" />
      <el-table-column align="center" label="Client IP" min-width="15" show-overflow-tooltip prop="ip" />
      <el-table-column align="center" label="Operations" min-width="10" show-overflow-tooltip>
        <template slot-scope="scope">
          <el-button v-if="!jsonIsEmpty(scope.row.body)" type="primary" size="small" @click="handleJsonView(scope)">View Body</el-button>
        </template>
      </el-table-column>
    </el-table>
    <div class="pagination pagination-center">
      <pagination v-show="total>0" :total="total" :page.sync="listQuery.page" :limit.sync="listQuery.limit" @pagination="listAccessLogs" />
    </div>

    <el-dialog
      id="jsonViewer"
      title="Json Viewer"
      :visible.sync="jsonViewerVisible"
      center
    >
      <json-viewer
        :value="accessLog.body"
        :expand-depth="5"
        copyable
      />
    </el-dialog>
  </div>
</template>

<script>
import { deepClone } from '@/utils'
import JsonViewer from 'vue-json-viewer'
import CurrentApp from '@/components/CurrentApp'
import DatetimePicker from '@/components/DatetimePicker'
import { listAccessLogs } from '@/api/access-log'
import Pagination from '@/components/Pagination' // secondary package based on el-pagination
const moment = require('moment')

const defaultAccessLog = {

}

export default {
  name: 'AccessLog',
  components: { CurrentApp, Pagination, DatetimePicker, JsonViewer },
  props: {},
  data() {
    return {
      jsonViewerVisible: false,
      accessLog: Object.assign({}, defaultAccessLog),
      routes: [],
      accessLogs: [],
      total: 0,
      listQuery: {
        page: 1,
        limit: 10,
        appID: undefined,
        username: undefined,
        action: undefined,
        resName: undefined,
        ip: undefined,
        status: undefined,
        startTime: undefined,
        endTime: undefined,
        sort: '-id',
      },
      datetimeRange: [],
      actions: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH'],
      statuses: [
        // { status: 0, description: 'ALL' },
        { status: 200, description: 'HTTP OK' },
        { status: 401, description: 'Unauthorized' },
        { status: 403, description: 'Forbidden' },
        { status: 400, description: 'Bad Request' },
      ],
    }
  },
  computed: {
    currentApp: function() {
      return this.$store.getters.currentApp
    },
    queryProperty() {
      this.listQuery.username
      this.listQuery.action
      this.listQuery.resName
      this.listQuery.status
      this.listQuery.ip
      this.listQuery.startTime
      this.listQuery.endTime
      return Date.now()
    },
  },
  watch: {
    currentApp: function(val) {
      this.listAccessLogs()
    },
    queryProperty: function(val) {
      this.listAccessLogs()
    },
    datetimeRange: function(val) {
      if (val && val.length === 2) {
        this.listQuery.startTime = moment(val[0]).format()
        this.listQuery.endTime = moment(val[1]).format()
      } else {
        this.listQuery.startTime = undefined
        this.listQuery.endTime = undefined
      }
    },
  },
  created() {
    this.listAccessLogs()
  },
  methods: {
    async listAccessLogs() {
      this.listQuery.appID = this.currentApp
      const res = await listAccessLogs(this.listQuery)
      if (res.ok) {
        this.total = res.data.total
        this.accessLogs = res.data.accessLogs
      }
    },
    usernameFormat: function(row, column) {
      let username = row[column.property]
      const nickname = row.nickname
      if (nickname) {
        username = username + '/' + nickname
      }
      return username
    },
    handleFilter() {
      this.listQuery.page = 1
      this.listAccessLogs()
    },
    handleJsonView(scope) {
      this.accessLog = deepClone(scope.row)
      this.jsonViewerVisible = true
    },

    handleEdit(scope) {
      this.dialogType = 'edit'
      this.dialogVisible = true
      this.checkStrictly = true
      this.application = deepClone(scope.row)
    },

    jsonIsEmpty(jso) {
      if (!jso || Object.keys(jso).length === 0) {
        return true
      }
      return false
    },
  },
}
</script>

<style lang="scss" scoped>

</style>
