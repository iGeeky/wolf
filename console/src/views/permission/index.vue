<template>
  <div class="app-container">

    <div class="filter-container">
      <div class="filter-item">App:</div>
      <current-app class="current-app filter-item" />
      <el-input
        v-model="listQuery.key"
        placeholder="Permission id or name"
        style="width: 200px;"
        class="filter-item"
        maxlength="32"
        clearable
        @keyup.enter.native="handleFilter"
      />
      <el-button class="filter-item" type="primary" icon="el-icon-search" @click="handleFilter">
        Search
      </el-button>
      <el-button class="filter-item" type="primary" @click="handleAdd">New Permission</el-button>
    </div>

    <el-table :data="permissions" style="margin-top:30px; " border>
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
      <el-table-column align="center" label="Category" min-width="20" show-overflow-tooltip>
        <template slot-scope="scope">
          {{ scope.row.category_name }}
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
      <pagination v-show="total>0" :total="total" :page.sync="listQuery.page" :limit.sync="listQuery.limit" @pagination="listPermissions" />
    </div>

    <el-dialog :visible.sync="dialogVisible" :title="dialogType==='edit'?'Edit Permission':'New Permission'" custom-class="rbac-edit-dialog">
      <el-form ref="permission" :model="permission" :rules="rules" label-width="120px" label-position="left">
        <el-form-item label="ID" prop="id">
          <el-input
            v-model="permission.id"
            placeholder="ID"
            :readonly="dialogType==='edit'"
          />
        </el-form-item>
        <el-form-item label="Name" prop="name">
          <el-input
            v-model="permission.name"
            placeholder="Permission Name"
            minlength="5"
            maxlength="64"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="Description" prop="description">
          <el-input
            v-model="permission.description"
            placeholder="Description"
            maxlength="256"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="App" prop="appID">
          <el-select v-model="permission.appID" placeholder="Change App" size="small" style="display: block" />
        </el-form-item>
        <el-form-item label="Category" prop="categoryID">
          <el-select v-model="permission.categoryID" placeholder="Change Category" size="small" style="display: block" clearable filterable>
            <el-option
              v-for="category in categorys"
              :key="category.id"
              :label="category.name"
              :value="category.id"
            />
          </el-select>
        </el-form-item>

      </el-form>
      <div style="text-align:right;">
        <el-button type="danger" @click="dialogVisible=false">Cancel</el-button>
        <el-button type="primary" @click="validateAndSubmit('permission');">Confirm</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
// import path from 'path'
import { mapGetters } from 'vuex'
import CurrentApp from '@/components/CurrentApp'
import { deepClone } from '@/utils'
import { listPermissions, addPermission, deletePermission, updatePermission, checkPermissionIDExist, checkPermissionNameExist } from '@/api/permission'
import { listCategorys } from '@/api/category'
import Pagination from '@/components/Pagination' // secondary package based on el-pagination

const defaultPermission = {
  id: '',
  appID: '',
  name: '',
}

export default {
  name: 'Permission',
  components: { CurrentApp, Pagination },
  props: {},
  data() {
    return {
      permission: Object.assign({}, defaultPermission),
      routes: [],
      permissions: [],
      categorys: [],
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
          { required: true, message: 'Please input permission ID', trigger: ['blur', 'change'] },
          { min: 2, max: 32, message: 'Length must be between 2 and 32 characters', trigger: ['blur', 'change'] },
          { pattern: /^[a-zA-Z0-9_-]*$/, message: 'Permission ID can only contain letters(a-zA-Z), numbers(0-9), underline(_)', trigger: ['blur', 'change'] },
          { validator: this.validatePermissionId, trigger: ['blur', 'change'] },
        ],
        name: [
          { required: true, message: 'Please input permission name', trigger: ['blur', 'change'] },
          { min: 2, max: 32, message: 'Length must be between 2 and 32 characters', trigger: ['blur', 'change'] },
          { validator: this.validatePermissionName, trigger: ['blur', 'change'] },
        ],
      },
    }
  },
  computed: {
    ...mapGetters([
      'applications',
    ]),
    currentApp: function() {
      return this.$store.getters.currentApp
    },
    categoryMap: function() {
      const categoryMaps = {}
      this.categorys.forEach((category) => {
        categoryMaps[category.id] = category.name
      })
      return categoryMaps
    },
  },
  watch: {
    currentApp: function(val) {
      this.listPermissions()
    },
  },
  created() {
    this.listCategorys().then((res) => {
      this.listPermissions()
    })
  },
  mounted() {},
  methods: {
    async listPermissions() {
      this.listQuery.appID = this.currentApp
      const res = await listPermissions(this.listQuery)
      if (res.ok) {
        this.total = res.data.total
        this.permissions = res.data.permissions
        this.permissions.forEach((ele) => {
          if (ele.categoryID > 0) {
            ele.category_name = this.categoryMap[String(ele.categoryID)] || 'unknow:' + ele.categoryID
          }
        })
      }
    },

    async listCategorys() {
      const res = await listCategorys({ appID: this.currentApp, limit: 256 })
      if (res.ok) {
        this.categorys = res.data.categorys
      }
    },

    async validatePermissionId(rule, value, callback) {
      if (this.dialogType === 'edit') {
        callback()
        return
      }
      const res = await checkPermissionIDExist(this.currentApp, value)
      if (res.ok && res.exist) {
        callback(new Error(`Permission Name '${value}' already exists`))
      } else {
        callback()
      }
    },

    async validatePermissionName(rule, value, callback) {
      const res = await checkPermissionNameExist(this.currentApp, value, this.permission.id)
      if (res.ok && res.exist) {
        callback(new Error(`Permission Name '${value}' already exists`))
      } else {
        callback()
      }
    },

    handleFilter() {
      this.listQuery.page = 1
      this.listPermissions()
    },

    handleAdd() {
      this.permission = Object.assign({}, defaultPermission)
      this.permission.appID = this.currentApp
      this.dialogType = 'new'
      this.dialogVisible = true
      this.listCategorys()
    },
    handleEdit(scope) {
      this.dialogType = 'edit'
      this.dialogVisible = true
      this.checkStrictly = true
      this.permission = deepClone(scope.row)
      this.listCategorys()
    },
    handleDelete({ $index, row }) {
      this.$confirm('Confirm to remove the permission?', 'Warning', {
        confirmButtonText: 'Confirm',
        cancelButtonText: 'Cancel',
        type: 'warning',
      })
        .then(async() => {
          const res = await deletePermission(row.id, row.appID)
          if (res.ok) {
            this.listPermissions()
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
          await this.submitPermission()
        } else {
          return false
        }
      })
    },

    async submitPermission() {
      const isEdit = this.dialogType === 'edit'

      if (isEdit) {
        const res = await updatePermission(this.permission.id, this.permission)
        if (!res.ok) {
          return
        }
        this.listPermissions()

        const { name } = this.permission
        this.dialogVisible = false
        this.$notify({
          title: 'Success',
          dangerouslyUseHTMLString: true,
          message: `
            <div>Alter Permission '${name}' success.</div>
          `,
          type: 'success',
        })
      } else {
        const res = await addPermission(this.permission)
        if (!res.ok) {
          return
        }
        this.listPermissions()
        this.permission = res.data.permission
        const { name } = this.permission
        this.dialogVisible = false
        this.$notify({
          title: 'Success',
          dangerouslyUseHTMLString: true,
          message: `<div>Permission '${name}' added.</div>`,
          type: 'success',
        })
      }
    },
    appChange(val) {
      this.listPermissions()
    },
  },
}
</script>

<style lang="scss" scoped>

</style>
