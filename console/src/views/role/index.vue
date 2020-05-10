<template>
  <div class="app-container">

    <div class="filter-container">
      <div class="filter-item">App:</div>
      <current-app class="current-app filter-item" />
      <el-input
        v-model="listQuery.key"
        placeholder="Role id or name"
        style="width: 200px;"
        class="filter-item"
        maxlength="32"
        clearable
        @keyup.enter.native="handleFilter"
      />
      <el-button class="filter-item" type="primary" icon="el-icon-search" @click="handleFilter">
        Search
      </el-button>
      <el-button class="filter-item" type="primary" @click="handleAdd">New Role</el-button>
    </div>

    <el-table :data="roles" style="margin-top:30px; " border>
      <el-table-column align="center" label="ID" min-width="25" show-overflow-tooltip>
        <template slot-scope="scope">
          {{ scope.row.id }}
        </template>
      </el-table-column>
      <el-table-column align="center" label="Name" min-width="25" show-overflow-tooltip>
        <template slot-scope="scope">
          {{ scope.row.name }}
        </template>
      </el-table-column>
      <el-table-column align="center" label="Description" min-width="40" show-overflow-tooltip>
        <template slot-scope="scope">
          {{ scope.row.description }}
        </template>
      </el-table-column>
      <el-table-column align="center" label="App" min-width="20" show-overflow-tooltip>
        <template slot-scope="scope">
          {{ scope.row.appID }}
        </template>
      </el-table-column>
      <el-table-column align="center" label="Permissions" min-width="20" show-overflow-tooltip>
        <template slot-scope="scope">
          <el-button type="primary" size="small" @click="handleView(scope)">View</el-button>
        </template>
      </el-table-column>
      <el-table-column align="center" label="Create Time" min-width="20" show-overflow-tooltip prop="createTime" :formatter="unixtimeFormat" />
      <el-table-column align="center" label="Operations" min-width="20" show-overflow-tooltip>
        <template slot-scope="scope">
          <el-button type="primary" size="small" @click="handleEdit(scope)">Edit</el-button>
          <el-button type="danger" size="small" @click="handleDelete(scope)">Delete</el-button>
        </template>
      </el-table-column>
    </el-table>
    <div class="pagination pagination-center">
      <pagination v-show="total>0" :total="total" :page.sync="listQuery.page" :limit.sync="listQuery.limit" @pagination="listRoles" />
    </div>

    <el-dialog :visible.sync="dialogVisible" :title="dialogTitle" custom-class="rbac-edit-dialog">
      <el-form ref="role" :model="role" :rules="rules" label-width="120px" label-position="left">
        <el-form-item label="ID" prop="id">
          <el-input
            v-model="role.id"
            placeholder="ID"
            :readonly="dialogType==='edit'||dialogType==='view'"
          />
        </el-form-item>
        <el-form-item label="Name" prop="name">
          <el-input
            v-model="role.name"
            placeholder="Role Name"
            minlength="5"
            maxlength="64"
            show-word-limit
            :readonly="inputReadonly"
          />
        </el-form-item>
        <el-form-item label="Description" prop="description">
          <el-input
            v-model="role.description"
            placeholder="Description"
            maxlength="256"
            show-word-limit
            :readonly="inputReadonly"
          />
        </el-form-item>
        <el-form-item label="App" prop="appID" :readonly="inputReadonly">
          <el-select v-model="role.appID" placeholder="Change App" size="small" style="display: block" />
        </el-form-item>
        <el-form-item label="Permissions" prop="permIDs">
          <permission-select :value.sync="role.permIDs" multiple :readonly="dialogType==='view'" />
        </el-form-item>
      </el-form>
      <div style="text-align:right;">
        <el-button type="danger" @click="dialogVisible=false">Cancel</el-button>
        <el-button v-if="dialogType!=='view'" type="primary" @click="validateAndSubmit('role');">Confirm</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
// import path from 'path'
import CurrentApp from '@/components/CurrentApp'
import PermissionSelect from '@/components/PermissionSelect'

import { deepClone } from '@/utils'
import { listRoles, addRole, deleteRole, updateRole, checkRoleIDExist, checkRoleNameExist } from '@/api/role'

import Pagination from '@/components/Pagination' // secondary package based on el-pagination

const defaultRole = {
  id: '',
  appID: '',
  name: '',
  description: '',
  permIDs: [],
}

export default {
  name: 'Role',
  components: { CurrentApp, Pagination, PermissionSelect },
  props: {},
  data() {
    return {
      role: Object.assign({}, defaultRole),
      routes: [],
      roles: [],
      total: 0,
      listQuery: {
        page: 1,
        limit: 10,
        key: undefined,
        appID: null,
        sort: '-createTime',
      },
      dialogVisible: false,
      dialogType: 'new',
      checkStrictly: false,
      defaultProps: {
        children: 'children',
        label: 'title',
      },

      rules: {
        id: [
          { required: true, message: 'Please input role ID', trigger: ['blur', 'change'] },
          { min: 2, max: 32, message: 'length must be between 2 and 32 characters', trigger: ['blur', 'change'] },
          { pattern: /^[a-zA-Z0-9_-]*$/, message: 'Role ID can only contain letters(a-zA-Z), numbers(0-9), underline(_)', trigger: ['blur', 'change'] },
          { validator: this.validateRoleId, trigger: ['blur', 'change'] },
        ],
        name: [
          { required: true, message: 'Please input role name', trigger: ['blur', 'change'] },
          { min: 2, max: 32, message: 'length must be between 2 and 32 characters', trigger: ['blur', 'change'] },
          { validator: this.validateRoleName, trigger: ['blur', 'change'] },
        ],
      },
    }
  },
  computed: {
    currentApp: function() {
      return this.$store.getters.currentApp
    },
    dialogTitle: function() {
      switch (this.dialogType) {
        case 'edit':
          return 'Edit Role'
        case 'view':
          return 'View Role'
        default:
          return 'New Role'
      }
    },
    inputReadonly: function() {
      return this.dialogType === 'view'
    },

  },
  watch: {
    currentApp: function(val) {
      this.listRoles()
    },
  },
  created() {
    this.listRoles()
  },
  mounted() {},
  methods: {
    async listRoles() {
      this.listQuery.appID = this.currentApp
      const res = await listRoles(this.listQuery)
      if (res.ok) {
        this.total = res.data.total
        this.roles = res.data.roles
        if (this.roles) {
          this.roles.forEach(role => {
            role.permIDs = role.permIDs || []
          })
        }
      }
    },

    async validateRoleId(rule, value, callback) {
      if (this.dialogType === 'edit' || this.dialogType === 'view') {
        callback()
        return
      }
      const res = await checkRoleIDExist(this.currentApp, value)
      if (res.ok && res.exist) {
        callback(new Error(`Role Name '${value}' already exists`))
      } else {
        callback()
      }
    },

    async validateRoleName(rule, value, callback) {
      const res = await checkRoleNameExist(this.currentApp, value, this.role.id)
      if (res.ok && res.exist) {
        callback(new Error(`Role Name '${value}' already exists`))
      } else {
        callback()
      }
    },

    handleFilter() {
      this.listQuery.page = 1
      this.listRoles()
    },

    handleAdd() {
      this.role = Object.assign({}, defaultRole)
      this.role.appID = this.currentApp
      this.dialogType = 'new'
      this.dialogVisible = true
    },
    handleEdit(scope) {
      this.dialogType = 'edit'
      this.dialogVisible = true
      this.checkStrictly = true
      this.role = deepClone(scope.row)
    },
    handleView(scope) {
      this.dialogType = 'view'
      this.dialogVisible = true
      this.checkStrictly = true
      this.role = deepClone(scope.row)
    },
    handleDelete({ $index, row }) {
      this.$confirm('Confirm to remove the role?', 'Warning', {
        confirmButtonText: 'Confirm',
        cancelButtonText: 'Cancel',
        type: 'warning',
      })
        .then(async() => {
          const res = await deleteRole(row.id, row.appID)
          if (res.ok) {
            this.listRoles()
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
          await this.submitRole()
        } else {
          return false
        }
      })
    },

    async submitRole() {
      const isEdit = this.dialogType === 'edit'

      if (isEdit) {
        const res = await updateRole(this.role.id, this.role)
        if (!res.ok) {
          return
        }
        this.listRoles()

        const { name } = this.role
        this.dialogVisible = false
        this.$notify({
          title: 'Success',
          dangerouslyUseHTMLString: true,
          message: `
            <div>Alter Role '${name}' success.</div>
          `,
          type: 'success',
        })
      } else {
        const res = await addRole(this.role)
        if (!res.ok) {
          return
        }
        this.listRoles()
        this.role = res.data.role
        const { name } = this.role
        this.dialogVisible = false
        this.$notify({
          title: 'Success',
          dangerouslyUseHTMLString: true,
          message: `<div>Role '${name}' added.</div>`,
          type: 'success',
        })
      }
    },
    appChange(val) {
      this.listRoles()
    },
  },
}
</script>

<style lang="scss" scoped>

</style>
