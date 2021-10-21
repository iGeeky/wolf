<template>
  <div class="app-container">
    <div class="filter-container">
      <el-input
        v-model="listQuery.key"
        :placeholder="$t('wolf.userSearchPrompt')"
        style="width: 200px;"
        class="filter-item"
        maxlength="32"
        clearable
        @keyup.enter.native="handleFilter"
      />
      <el-button class="filter-item" type="primary" icon="el-icon-search" @click="handleFilter">
        {{ $t('wolf.search') }}
      </el-button>
      <el-button class="filter-item" type="primary" :disabled="ldapOptions.supported" @click="handleAdd">{{ $t('wolf.userNewUser') }}</el-button>
    </div>
    <el-table
      :data="users"
      style="margin-top:30px;"
      :row-class-name="tableRowClassName"
      border
      fit
      highlight-current-row
    >
      <el-table-column align="center" label="ID" min-width="10" show-overflow-tooltip>
        <template slot-scope="scope">
          {{ scope.row.id }}
        </template>
      </el-table-column>
      <el-table-column align="center" :label="$t('wolf.userTitleUserName')" min-width="20" show-overflow-tooltip>
        <template slot-scope="scope">
          {{ scope.row.username }}
        </template>
      </el-table-column>
      <el-table-column align="center" :label="$t('wolf.userTitleNickName')" min-width="20" show-overflow-tooltip>
        <template slot-scope="scope">
          {{ scope.row.nickname }}
        </template>
      </el-table-column>
      <el-table-column align="center" :label="$t('wolf.userTitleManager')" min-width="10" show-overflow-tooltip>
        <template slot-scope="scope">
          {{ scope.row.manager }}
        </template>
      </el-table-column>
      <el-table-column align="center" :label="$t('wolf.userTitleAppIds')" min-width="25" show-overflow-tooltip prop="appIDs" :formatter="appIdsFormat" />
      <el-table-column align="center" :label="$t('wolf.userTitleStatus')" min-width="10" prop="status" :formatter="userStatusFormat" />
      <el-table-column align="center" :label="$t('wolf.titleCreateTime')" min-width="18" show-overflow-tooltip prop="createTime" :formatter="unixtimeFormat" />
      <el-table-column align="center" :label="$t('wolf.userTitlePermissions')" min-width="15">
        <template slot-scope="scope">
          <role-detail :user="scope.row" />
        </template>
      </el-table-column>
      <el-table-column align="center" :label="$t('wolf.titleOperations')" min-width="25">
        <template slot-scope="scope">
          <el-tooltip class="item" effect="dark" content="Reset password" placement="top">
            <el-button type="primary" size="small" :disabled="!userEditable(scope.row)" @click="handleReset(scope)">{{ $t('wolf.btnReset') }}</el-button>
          </el-tooltip>
          <el-button type="primary" size="small" @click="handleEdit(scope)">{{ $t('wolf.btnEdit') }}</el-button>
          <el-button type="danger" size="small" @click="handleDelete(scope)">{{ $t('wolf.btnDelete') }}</el-button>
        </template>
      </el-table-column>
    </el-table>
    <div class="pagination pagination-center">
      <pagination v-show="total>0" :total="total" :page.sync="listQuery.page" :limit.sync="listQuery.limit" @pagination="listUsers" />
    </div>
    <el-dialog :visible.sync="dialogVisible" :title="dialogType==='edit'?$t('wolf.userEditUser'):$t('wolf.userNewUser')" custom-class="rbac-edit-dialog">
      <el-form ref="user" :model="user" :rules="rules()" label-width="120px" label-position="left">
        <el-form-item :label="$t('wolf.newUserLabelUsername')" prop="username">
          <el-input v-model="user.username" :disabled="fieldDisabled(user, 'username')" :placeholder="$t('wolf.newUserPromptUsername')" />
        </el-form-item>
        <el-form-item :label="$t('wolf.newUserLabelNickname')" prop="nickname">
          <el-input v-model="user.nickname" :disabled="fieldDisabled(user, 'nickname')" :placeholder="$t('wolf.newUserPromptNickname')" />
        </el-form-item>
        <el-form-item :label="$t('wolf.newUserLabelEmail')" prop="email">
          <el-input v-model="user.email" :disabled="fieldDisabled(user, 'email')" :placeholder="$t('wolf.newUserPromptEmail')" />
        </el-form-item>
        <el-form-item :label="$t('wolf.newUserLabelTel')" prop="tel">
          <el-input v-model="user.tel" :disabled="fieldDisabled(user, 'tel')" :placeholder="$t('wolf.newUserPromptTel')" />
        </el-form-item>
        <el-form-item :label="$t('wolf.labelApp')" prop="appIDs">
          <el-select v-model="user.appIDs" multiple filterable :placeholder="$t('wolf.newUserPromptAppID')" style="display: block">
            <el-option v-for="application in applications" :key="application.id" :label="application.name" :value="application.id" />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('wolf.newUserLabelManager')" prop="manager">
          <el-radio-group v-model="user.manager" size="small">
            <el-radio-button label="super"> {{ $t('wolf.newUserLabelManagerSuper') }} </el-radio-button>
            <el-radio-button label="admin"> {{ $t('wolf.newUserLabelManagerAdmin') }} </el-radio-button>
            <el-radio-button label="none"> {{ $t('wolf.newUserLabelManagerNone') }} </el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="$t('wolf.newUserLabelStatus')" prop="status">
          <el-radio-group v-model="user.status" size="small">
            <el-radio-button label="0">{{ $t('wolf.newUserLabelStatusNormal') }}</el-radio-button>
            <el-radio-button label="-1">{{ $t('wolf.newUserLabelStatusDisabled') }}</el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <div style="text-align:right;">
        <el-button type="danger" @click="dialogVisible=false">{{ $t('wolf.btnCancel') }}</el-button>
        <el-button type="primary" @click="validateAndSubmit('user')">{{ $t('wolf.btnConfirm') }}</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import { deepClone, format } from '@/utils'
import { listUsers, addUser, deleteUser, updateUser, checkUsernameExist, resetPwd } from '@/api/user'

import Pagination from '@/components/Pagination' // secondary package based on el-pagination
import RoleDetail from '@/views/user/roleDetail'
import i18n from '@/i18n/i18n'

const defaultUser = {
  username: '',
  nickname: '',
  email: '',
  tel: '',
  appIDs: [],
  manager: '',
  authType: 1,
  routes: [],
  status: 0,
}

export default {
  name: 'User',
  components: { Pagination, RoleDetail },
  props: {},
  data() {
    return {
      user: Object.assign({}, defaultUser),
      routes: [],
      users: [],
      total: 0,
      listQuery: {
        page: 1,
        limit: 10,
        key: undefined,
        sort: '-id',
      },
      dialogVisible: false,
      dialogType: 'new',
      checkStrictly: false,
      defaultProps: {
        children: 'children',
        label: 'title',
      },
      appIdsRules: [],
    }
  },
  computed: {
    ...mapGetters([
      'applications',
      'ldapOptions',
    ]),
  },
  watch: {
    'user.manager': function(val) {
      if (val === 'admin') {
        this.appIdsRules = [
          { required: true, message: i18n.t('wolf.userRulesMessageAppIDRequired'), trigger: ['blur', 'change'] },
        ]
        if (this.dialogVisible) {
          setTimeout(() => {
            this.$refs.user.validateField('appIDs')
          }, 0)
        }
      } else {
        this.appIdsRules = []
        if (this.dialogVisible) {
          setTimeout(() => {
            this.$refs.user.clearValidate(['appIDs'])
          }, 0)
        }
      }
    },
  },
  created() {
    this.listUsers()
  },
  mounted() {},
  methods: {
    tableRowClassName({ row, rowIndex }) {
      if (row.status === -1) {
        return 'disabled-row'
      }
      return ''
    },
    appIdsFormat(row, column, cellValue, index) {
      if (cellValue == null || cellValue === '') {
        return ''
      }
      const values = cellValue.join('|')
      return values
    },

    rules() {
      const rules_all = {
        username: [
          { required: true, message: i18n.t('wolf.userRulesMessageUsernameRequired'), trigger: ['blur', 'change'] },
          { min: 2, max: 32, message: i18n.t('wolf.pubRulesMessageLength_2_32'), trigger: ['blur', 'change'] },
          { pattern: /^[a-zA-Z0-9_-]*$/, message: i18n.t('wolf.pubRulesMessageIDFormat'), trigger: ['blur', 'change'] },
          { validator: this.validateUsername, trigger: ['blur', 'change'] },
        ],
        nickname: [
          { required: true, message: i18n.t('wolf.userRulesMessageNicknameRequired'), trigger: ['blur', 'change'] },
          { min: 2, max: 32, message: i18n.t('wolf.pubRulesMessageLength_2_32'), trigger: ['blur', 'change'] },
        ],
        email: [{ type: 'email', message: i18n.t('wolf.userRulesMessageEmailFormat'), trigger: ['blur', 'change'] }],
        tel: [
          { pattern: /^[\d- ]{6,15}$/, message: i18n.t('wolf.userRulesMessageTelFormat'), trigger: ['blur', 'change'] },
        ],
        appIDs: this.appIdsRules,
      }
      let rules = {}
      if (this.user && this.user.authType === 1) {
        rules = rules_all
      } else {
        const syncedFields = this.ldapOptions.syncedFields || []
        for (const field of Object.keys(rules_all)) {
          if (!syncedFields.includes(field)) { // ignore
            const rule = rules_all[field]
            rules[field] = rule
          }
        }
      }
      return rules
    },
    async validateUsername(rule, value, callback) {
      const res = await checkUsernameExist(value, this.user.id)
      if (res.ok && res.exist) {
        callback(new Error(i18n.t('wolf.userPromptUsernameExist')))
      } else {
        callback()
      }
    },

    async listUsers() {
      const res = await listUsers(this.listQuery)
      if (res.ok) {
        this.total = res.data.total
        this.users = res.data.userInfos
      }
    },
    handleFilter() {
      this.listQuery.page = 1
      this.listUsers()
    },
    userEditable(user) {
      return user.authType === 1
    },
    fieldDisabled(user, field) {
      if (user.authType === 2) {
        if (this.ldapOptions.syncedFields) {
          const disabled = this.ldapOptions.syncedFields.includes(field)
          return disabled
        }
      }
      return false
    },
    handleAdd() {
      this.user = Object.assign({}, defaultUser)
      this.dialogType = 'new'
      this.dialogVisible = true
    },
    handleEdit(scope) {
      this.dialogType = 'edit'
      this.dialogVisible = true
      this.checkStrictly = true
      this.user = deepClone(scope.row)
    },
    handleReset({ $index, row }) {
      const prompt = i18n.t('wolf.userPromptConfirmResetPassword')
      const textConfirm = i18n.t('wolf.btnConfirm')
      const textCancel = i18n.t('wolf.btnCancel')
      this.$confirm(prompt, 'Warning', {
        confirmButtonText: textConfirm,
        cancelButtonText: textCancel,
        type: 'warning',
      })
        .then(async() => {
          const res = await resetPwd(row.id)
          if (res.ok) {
            const password = res.data.password
            const prompt = format(i18n.t('wolf.userPromptResetPasswordSuccess'), { password })
            this.$notify({
              title: 'Success',
              dangerouslyUseHTMLString: true,
              message: prompt,
              type: 'success',
              duration: 0,
            })
          }
        })
        .catch(err => { console.error(err) })
    },
    handleDelete({ $index, row }) {
      const prompt = i18n.t('wolf.userPromptConfirmRemove')
      const textConfirm = i18n.t('wolf.btnConfirm')
      const textCancel = i18n.t('wolf.btnCancel')
      this.$confirm(prompt, 'Warning', {
        confirmButtonText: textConfirm,
        cancelButtonText: textCancel,
        type: 'warning',
      })
        .then(async() => {
          const res = await deleteUser(row.id)
          if (res.ok) {
            this.listUsers()
            this.$message({
              type: 'success',
              message: i18n.t('wolf.userPromptRemoveSuccess'),
            })
          }
        })
        .catch(err => { console.error(err) })
    },

    async validateAndSubmit(formName) {
      this.$refs[formName].validate(async(valid) => {
        if (valid) {
          await this.submitUser()
        } else {
          return false
        }
      })
    },

    async submitUser() {
      const isEdit = this.dialogType === 'edit'
      if (isEdit) {
        await updateUser(this.user.id, this.user)
        this.listUsers()
        this.dialogVisible = false
        this.$notify({
          title: 'Success',
          dangerouslyUseHTMLString: true,
          message: i18n.t('wolf.userPromptUpdateSuccess'),
          type: 'success',
        })
      } else {
        const { data } = await addUser(this.user)
        this.user.id = data.userInfo.id
        const password = data.password
        const { username } = this.user
        this.listUsers()
        this.dialogVisible = false
        const message = format(i18n.t('wolf.userPromptAddSuccess'), { username, password })
        this.$notify({
          title: 'Success',
          dangerouslyUseHTMLString: true,
          message: message,
          type: 'success',
          duration: 0,
        })
      }
    },
  },
}
</script>

<style lang="scss">
  .el-table .disabled-row {
    background: #ededef;
    color: #9e1433;
  }
</style>
