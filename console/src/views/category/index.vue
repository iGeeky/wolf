<template>
  <div class="app-container">

    <div class="filter-container">
      <div class="filter-item">App:</div>
      <current-app class="current-app filter-item" />
      <el-input
        v-model="listQuery.key"
        placeholder="Category Name"
        style="width: 200px;"
        class="filter-item"
        maxlength="32"
        clearable
        @keyup.enter.native="handleFilter"
      />
      <el-button class="filter-item" type="primary" icon="el-icon-search" @click="handleFilter">
        Search
      </el-button>
      <el-button class="filter-item" type="primary" @click="handleAdd">New Category</el-button>
    </div>

    <el-table :data="categorys" style="margin-top:30px; " border>
      <el-table-column align="center" label="ID" min-width="15" show-overflow-tooltip>
        <template slot-scope="scope">
          {{ scope.row.id }}
        </template>
      </el-table-column>
      <el-table-column align="center" label="Name" min-width="20" show-overflow-tooltip>
        <template slot-scope="scope">
          {{ scope.row.name }}
        </template>
      </el-table-column>
      <el-table-column align="center" label="App" min-width="20" show-overflow-tooltip>
        <template slot-scope="scope">
          {{ scope.row.appID }}
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
      <pagination v-show="total>0" :total="total" :page.sync="listQuery.page" :limit.sync="listQuery.limit" @pagination="listCategorys" />
    </div>

    <el-dialog :visible.sync="dialogVisible" :title="dialogType==='edit'?'Edit Category':'New Category'" custom-class="rbac-edit-dialog">
      <el-form ref="category" :model="category" :rules="rules" label-width="120px" label-position="left">
        <el-form-item v-if="dialogType==='edit'" label="Category ID" prop="id">
          <el-input
            v-model="category.id"
            placeholder="Category ID"
            readonly
          />
        </el-form-item>
        <el-form-item label="Name" prop="name">
          <el-input
            v-model="category.name"
            placeholder="Category Name"
            minlength="5"
            maxlength="64"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="App" prop="appID">
          <el-select v-model="category.appID" placeholder="Change App" size="small" style="display: block">
            <!-- <el-option
              v-for="application in applications"
              :key="application.appID"
              :label="application.name"
              :value="application.appID"
            /> -->
          </el-select>
        </el-form-item>
      </el-form>
      <div style="text-align:right;">
        <el-button type="danger" @click="dialogVisible=false">Cancel</el-button>
        <el-button type="primary" @click="validateAndSubmit('category');">Confirm</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
// import path from 'path'
import CurrentApp from '@/components/CurrentApp'
import { deepClone } from '@/utils'
import { listCategorys, addCategory, deleteCategory, updateCategory, checkCategoryNameExist } from '@/api/category'
import Pagination from '@/components/Pagination' // secondary package based on el-pagination

const defaultCategory = {
  id: '',
  appID: '',
  name: '',
}

export default {
  name: 'Category',
  components: { CurrentApp, Pagination },
  props: {},
  data() {
    return {
      category: Object.assign({}, defaultCategory),
      routes: [],
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
        category: 'title',
      },

      rules: {
        name: [
          { required: true, message: 'Please Input Category Name', trigger: ['blur', 'change'] },
          { min: 2, max: 32, message: 'Length must be between 2 and 32 characters', trigger: ['blur', 'change'] },
          { validator: this.validateCategoryName, trigger: ['blur', 'change'] },
        ],
      },
    }
  },
  computed: {
    currentApp: function() {
      return this.$store.getters.currentApp
    },
  },
  watch: {
    currentApp: function(val) {
      this.listCategorys()
    },
  },
  created() {
    this.listCategorys()
  },
  mounted() {},
  methods: {
    async listCategorys() {
      this.listQuery.appID = this.currentApp
      const res = await listCategorys(this.listQuery)
      if (res.ok) {
        this.total = res.data.total
        this.categorys = res.data.categorys
      }
    },
    async validateCategoryName(rule, value, callback) {
      const res = await checkCategoryNameExist(this.currentApp, value, this.category.id)
      if (res.ok && res.exist) {
        callback(new Error(`Category Name '${value}' already exists`))
      } else {
        callback()
      }
    },

    handleFilter() {
      this.listQuery.page = 1
      this.listCategorys()
    },

    handleAdd() {
      this.category = Object.assign({}, defaultCategory)
      this.category.appID = this.currentApp
      this.dialogType = 'new'
      this.dialogVisible = true
    },
    handleEdit(scope) {
      this.dialogType = 'edit'
      this.dialogVisible = true
      this.checkStrictly = true
      this.category = deepClone(scope.row)
    },
    handleDelete({ $index, row }) {
      this.$confirm('Confirm to remove the category?', 'Warning', {
        confirmButtonText: 'Confirm',
        cancelButtonText: 'Cancel',
        type: 'warning',
      })
        .then(async() => {
          const res = await deleteCategory(row.id)
          if (res.ok) {
            this.listCategorys()
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
          await this.submitCategory()
        } else {
          return false
        }
      })
    },

    async submitCategory() {
      const isEdit = this.dialogType === 'edit'

      if (isEdit) {
        const res = await updateCategory(this.category.id, this.category)
        if (!res.ok) {
          return
        }
        this.listCategorys()

        const { name } = this.category
        this.dialogVisible = false
        this.$notify({
          title: 'Success',
          dangerouslyUseHTMLString: true,
          message: `
            <div>Alter Category '${name}' success.</div>
          `,
          type: 'success',
        })
      } else {
        const res = await addCategory(this.category)
        if (!res.ok) {
          return
        }
        this.listCategorys()
        this.category = res.data.category
        const { name } = this.category
        this.dialogVisible = false
        this.$notify({
          title: 'Success',
          dangerouslyUseHTMLString: true,
          message: `<div>Category '${name}' added.</div>`,
          type: 'success',
        })
      }
    },
    appChange(val) {
      this.listCategorys()
    },
  },
}
</script>

<style lang="scss" scoped>

</style>
