<template>
  <div class="app-container">

    <div class="filter-container">
      <div class="filter-item">{{ $t('wolf.app') }}:</div>
      <current-app class="current-app filter-item" />
      <el-input
        v-model="listQuery.key"
        :placeholder="$t('wolf.roleSearchPrompt')"
        style="width: 200px;"
        class="filter-item"
        maxlength="32"
        clearable
        @keyup.enter.native="handleFilter"
      />
      <el-button class="filter-item" type="primary" icon="el-icon-search" @click="handleFilter">
        {{ $t('wolf.search') }}
      </el-button>
      <el-button class="filter-item" type="primary" @click="handleAdd">{{ $t('wolf.roleNewRole') }}</el-button>
    </div>

    <el-table :data="roles" style="margin-top:30px; " border>
      <el-table-column align="center" label="ID" min-width="25" show-overflow-tooltip>
        <template slot-scope="scope">
          {{ scope.row.id }}
        </template>
      </el-table-column>
      <el-table-column align="center" :label="$t('wolf.titleName')" min-width="25" show-overflow-tooltip>
        <template slot-scope="scope">
          {{ scope.row.name }}
        </template>
      </el-table-column>
      <el-table-column align="center" :label="$t('wolf.titleDescription')" min-width="40" show-overflow-tooltip>
        <template slot-scope="scope">
          {{ scope.row.description }}
        </template>
      </el-table-column>
      <el-table-column align="center" :label="$t('wolf.titleApp')" min-width="20" show-overflow-tooltip>
        <template slot-scope="scope">
          {{ scope.row.appID }}
        </template>
      </el-table-column>
      <el-table-column align="center" :label="$t('wolf.roleTitlePermissions')" min-width="20" show-overflow-tooltip>
        <template slot-scope="scope">
          <el-button type="primary" size="small" @click="handleView(scope)">{{ $t('wolf.btnView') }}</el-button>
        </template>
      </el-table-column>
      <el-table-column align="center" :label="$t('wolf.titleCreateTime')" min-width="20" show-overflow-tooltip prop="createTime" :formatter="unixtimeFormat" />
      <el-table-column align="center" :label="$t('wolf.titleOperations')" min-width="20" show-overflow-tooltip>
        <template slot-scope="scope">
          <el-button type="primary" size="small" @click="handleEdit(scope)">{{ $t('wolf.btnEdit') }}</el-button>
          <el-button type="danger" size="small" @click="handleDelete(scope)">{{ $t('wolf.btnDelete') }}</el-button>
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
        <el-form-item :label="$t('wolf.newRoleLabelName')" prop="name">
          <el-input
            v-model="role.name"
            :placeholder="$t('wolf.newRolePromptName')"
            minlength="5"
            maxlength="64"
            show-word-limit
            :readonly="inputReadonly"
          />
        </el-form-item>
        <el-form-item :label="$t('wolf.newRoleLabelDescription')" prop="description">
          <el-input
            v-model="role.description"
            :placeholder="$t('wolf.newRolePromptDescription')"
            maxlength="256"
            show-word-limit
            :readonly="inputReadonly"
          />
        </el-form-item>
        <el-form-item :label="$t('wolf.labelApp')" prop="appID" :readonly="inputReadonly">
          <el-select v-model="role.appID" :placeholder="$t('wolf.promptChangeApp')" size="small" style="display: block" />
        </el-form-item>
        <el-form-item :label="$t('wolf.newRoleLabelPermissions')" prop="permIDs">
          <permission-select :value.sync="role.permIDs" multiple :readonly="dialogType==='view'" />
        </el-form-item>
      </el-form>
      <div style="text-align:right;">
        <el-button type="danger" @click="dialogVisible=false">{{ $t('wolf.btnCancel') }}</el-button>
        <el-button v-if="dialogType!=='view'" type="primary" @click="validateAndSubmit('role');">{{ $t('wolf.btnConfirm') }}</el-button>
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
import i18n from '@/i18n/i18n'

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
          { required: true, message: i18n.t('wolf.roleRulesMessageIDRequired'), trigger: ['blur', 'change'] },
          { min: 2, max: 32, message: i18n.t('wolf.pubRulesMessageLength_2_32'), trigger: ['blur', 'change'] },
          { pattern: /^[a-zA-Z0-9_-]*$/, message: i18n.t('wolf.pubRulesMessageIDFormat'), trigger: ['blur', 'change'] },
          { validator: this.validateRoleId, trigger: ['blur', 'change'] },
        ],
        name: [
          { required: true, message: i18n.t('wolf.roleRulesMessageNameRequired'), trigger: ['blur', 'change'] },
          { min: 2, max: 32, message: i18n.t('wolf.pubRulesMessageLength_2_32'), trigger: ['blur', 'change'] },
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
          return i18n.t('wolf.roleEditRole')
        case 'view':
          return i18n.t('wolf.roleViewRole')
        default:
          return i18n.t('wolf.roleNewRole')
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
        callback(new Error(i18n.t('wolf.rolePromptIDExist')))
      } else {
        callback()
      }
    },

    async validateRoleName(rule, value, callback) {
      const res = await checkRoleNameExist(this.currentApp, value, this.role.id)
      if (res.ok && res.exist) {
        callback(new Error(i18n.t('wolf.rolePromptNameExist')))
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
      const prompt = i18n.t('wolf.rolePromptConfirmRemove')
      const textConfirm = i18n.t('wolf.btnConfirm')
      const textCancel = i18n.t('wolf.btnCancel')
      this.$confirm(prompt, 'Warning', {
        confirmButtonText: textConfirm,
        cancelButtonText: textCancel,
        type: 'warning',
      })
        .then(async() => {
          const res = await deleteRole(row.id, row.appID)
          if (res.ok) {
            this.listRoles()
            this.$message({
              type: 'success',
              message: i18n.t('wolf.rolePromptRemoveSuccess'),
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

        this.dialogVisible = false
        this.$notify({
          title: 'Success',
          dangerouslyUseHTMLString: true,
          message: i18n.t('wolf.rolePromptUpdateSuccess'),
          type: 'success',
        })
      } else {
        const res = await addRole(this.role)
        if (!res.ok) {
          return
        }
        this.listRoles()
        this.role = res.data.role
        this.dialogVisible = false
        this.$notify({
          title: 'Success',
          dangerouslyUseHTMLString: true,
          message: i18n.t('wolf.rolePromptAddSuccess'),
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

<style type="text/scss" scoped>

</style>
