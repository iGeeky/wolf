<template>
  <div class="app-container">
    <div class="filter-container">
      <el-input
        v-model="listQuery.key"
        placeholder="username/nickname or mobile"
        style="width: 200px;"
        class="filter-item"
        maxlength="32"
        clearable
        @keyup.enter.native="handleFilter"
      />
      <el-button class="filter-item" type="primary" icon="el-icon-search" @click="handleFilter">
        Search
      </el-button>
      <el-button class="filter-item" type="primary" @click="handleAdd">New User</el-button>
    </div>
    <el-table
      :data="users"
      style="margin-top:30px;"
      :row-class-name="tableRowClassName"
      border
      fit
      highlight-current-row
    >
      <el-table-column align="center" label="ID" min-width="5" show-overflow-tooltip>
        <template slot-scope="scope">
          {{ scope.row.id }}
        </template>
      </el-table-column>
      <el-table-column align="center" label="User Name" min-width="20" show-overflow-tooltip>
        <template slot-scope="scope">
          {{ scope.row.username }}
        </template>
      </el-table-column>
      <el-table-column align="center" label="Nick Name" min-width="20" show-overflow-tooltip>
        <template slot-scope="scope">
          {{ scope.row.nickname }}
        </template>
      </el-table-column>
      <el-table-column align="center" label="Manager" min-width="10" show-overflow-tooltip>
        <template slot-scope="scope">
          {{ scope.row.manager }}
        </template>
      </el-table-column>
      <el-table-column align="center" label="App Ids" min-width="25" show-overflow-tooltip prop="appIDs" :formatter="appIdsFormat" />
      <el-table-column align="center" label="Status" min-width="10" prop="status" :formatter="userStatusFormat" />
      <el-table-column align="center" label="Create Time" min-width="18" show-overflow-tooltip prop="createTime" :formatter="unixtimeFormat" />
      <el-table-column align="center" label="Permissions" min-width="15">
        <template slot-scope="scope">
          <role-detail :user="scope.row" />
        </template>
      </el-table-column>
      <el-table-column align="center" label="Operations" min-width="25">
        <template slot-scope="scope">
          <el-tooltip class="item" effect="dark" content="Reset password" placement="top">
            <el-button type="primary" size="small" @click="handleReset(scope)">Reset</el-button>
          </el-tooltip>
          <el-button type="primary" size="small" @click="handleEdit(scope)">Edit</el-button>
          <el-button type="danger" size="small" @click="handleDelete(scope)">Delete</el-button>
        </template>
      </el-table-column>
    </el-table>
    <div class="pagination pagination-center">
      <pagination v-show="total>0" :total="total" :page.sync="listQuery.page" :limit.sync="listQuery.limit" @pagination="listUsers" />
    </div>
    <el-dialog :visible.sync="dialogVisible" :title="dialogType==='edit'?'Edit User':'New User'" custom-class="rbac-edit-dialog">
      <el-form ref="user" :model="user" :rules="rules" label-width="120px" label-position="left">
        <el-form-item label="Username" prop="username">
          <el-input v-model="user.username" placeholder="User Name" />
        </el-form-item>
        <el-form-item label="Nickname" prop="nickname">
          <el-input v-model="user.nickname" placeholder="Nick Name" />
        </el-form-item>
        <el-form-item label="Email" prop="email">
          <el-input v-model="user.email" placeholder="Email" />
        </el-form-item>
        <el-form-item label="Tel" prop="tel">
          <el-input v-model="user.tel" placeholder="Tel" />
        </el-form-item>
        <el-form-item label="App ID" prop="appIDs">
          <el-select v-model="user.appIDs" multiple filterable placeholder="Management Apps" style="display: block">
            <el-option v-for="application in applications" :key="application.id" :label="application.name" :value="application.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="Manager" prop="manager">
          <el-radio-group v-model="user.manager" size="small">
            <el-radio-button label="super" />
            <el-radio-button label="admin" />
            <el-radio-button label="none" />
          </el-radio-group>
        </el-form-item>
        <el-form-item label="Status" prop="status">
          <el-radio-group v-model="user.status" size="small">
            <el-radio-button label="0">normal</el-radio-button>
            <el-radio-button label="-1">disabled</el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <div style="text-align:right;">
        <el-button type="danger" @click="dialogVisible=false">Cancel</el-button>
        <el-button type="primary" @click="validateAndSubmit('user')">Confirm</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import { deepClone } from '@/utils'
import { listUsers, addUser, deleteUser, updateUser, checkUsernameExist, resetPwd } from '@/api/user'

import Pagination from '@/components/Pagination' // secondary package based on el-pagination
import RoleDetail from '@/views/user/roleDetail'

const defaultUser = {
  username: '',
  nickname: '',
  email: '',
  tel: '',
  appIDs: [],
  manager: '',
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
      // rules: {
      // appIDs: [
      //   { required: true, message: 'Please select a management application.', trigger: ['blur', 'change'] },
      // ],
      // },
    }
  },
  computed: {
    ...mapGetters([
      'applications',
    ]),
    rules() {
      return {
        username: [
          { required: true, message: 'Please input username', trigger: ['blur', 'change'] },
          { min: 2, max: 32, message: 'length must be between 2 and 32 characters', trigger: ['blur', 'change'] },
          { pattern: /^[a-zA-Z0-9_-]*$/, message: 'App ID can only contain letters(a-zA-Z), numbers(0-9), underline(_)', trigger: ['blur', 'change'] },
          { validator: this.validateUsername, trigger: ['blur', 'change'] },
        ],
        nickname: [
          { required: true, message: 'Please input nickname', trigger: ['blur', 'change'] },
          { min: 2, max: 32, message: 'length must be between 2 and 32 characters', trigger: ['blur', 'change'] },
        ],
        email: [{ type: 'email', message: 'Please input Valid Email', trigger: ['blur', 'change'] }],
        tel: [
          { pattern: /^\d{6,12}$/, message: 'Please input valid phone number', trigger: ['blur', 'change'] },
        ],
        appIDs: this.appIdsRules,
      }
    },
  },
  watch: {
    'user.manager': function(val) {
      if (val === 'admin') {
        this.appIdsRules = [
          { required: true, message: 'Please select a management application.', trigger: ['blur', 'change'] },
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

    async validateUsername(rule, value, callback) {
      const res = await checkUsernameExist(value, this.user.id)
      if (res.ok && res.exist) {
        callback(new Error(`Username '${value}' already exists`))
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
      this.$confirm('Confirm to reset the password of user?', 'Warning', {
        confirmButtonText: 'Confirm',
        cancelButtonText: 'Cancel',
        type: 'warning',
      })
        .then(async() => {
          const res = await resetPwd(row.id)
          if (res.ok) {
            const password = res.data.password
            this.$notify({
              title: 'Success',
              dangerouslyUseHTMLString: true,
              message: `
            <div>Success to reset password! New password: ${password}</div>
            <div>This information is only displayed once, please be sure to save this new password.</div>
          `,
              type: 'success',
              duration: 0,
            })
          }
        })
        .catch(err => { console.error(err) })
    },
    handleDelete({ $index, row }) {
      this.$confirm('Confirm to remove the user?', 'Warning', {
        confirmButtonText: 'Confirm',
        cancelButtonText: 'Cancel',
        type: 'warning',
      })
        .then(async() => {
          const res = await deleteUser(row.id)
          if (res.ok) {
            this.listUsers()
            this.$message({
              type: 'success',
              message: 'Delete succed!',
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
        const { username } = this.user
        this.dialogVisible = false
        this.$notify({
          title: 'Success',
          dangerouslyUseHTMLString: true,
          message: `
            <div>Alter user ${username} success.</div>
          `,
          type: 'success',
        })
      } else {
        const { data } = await addUser(this.user)
        this.user.id = data.userInfo.id
        const password = data.password
        const { username } = this.user
        this.listUsers()
        this.dialogVisible = false
        this.$notify({
          title: 'Success',
          dangerouslyUseHTMLString: true,
          message: `
            <div>User name: ${username}</div>
            <div>Password: ${password}</div>
            <div>This information is only displayed once, please be sure to save this account and password.</div>
          `,
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
