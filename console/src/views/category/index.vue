<template>
  <div class="app-container">

    <div class="filter-container">
      <div class="filter-item">{{ $t('wolf.app') }}:</div>
      <current-app class="current-app filter-item" />
      <el-input
        v-model="listQuery.key"
        :placeholder="$t('wolf.categorySearchPrompt')"
        style="width: 200px;"
        class="filter-item"
        maxlength="32"
        clearable
        @keyup.enter.native="handleFilter"
      />
      <el-button class="filter-item" type="primary" icon="el-icon-search" @click="handleFilter">
        {{ $t('wolf.search') }}
      </el-button>
      <el-button class="filter-item" type="primary" @click="handleAdd">{{ $t('wolf.categoryNewCategory') }}</el-button>
    </div>

    <el-table :data="categorys" style="margin-top:30px; " border>
      <el-table-column align="center" label="ID" min-width="15" show-overflow-tooltip>
        <template slot-scope="scope">
          {{ scope.row.id }}
        </template>
      </el-table-column>
      <el-table-column align="center" :label="$t('wolf.titleName')" min-width="20" show-overflow-tooltip>
        <template slot-scope="scope">
          {{ scope.row.name }}
        </template>
      </el-table-column>
      <el-table-column align="center" :label="$t('wolf.titleApp')" min-width="20" show-overflow-tooltip>
        <template slot-scope="scope">
          {{ scope.row.appID }}
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
      <pagination v-show="total>0" :total="total" :page.sync="listQuery.page" :limit.sync="listQuery.limit" @pagination="listCategorys" />
    </div>

    <el-dialog :visible.sync="dialogVisible" :title="dialogType==='edit'?$t('wolf.categoryEditCategory'):$t('wolf.categoryNewCategory')" custom-class="rbac-edit-dialog">
      <el-form ref="category" :model="category" :rules="rules" label-width="120px" label-position="left">
        <el-form-item v-if="dialogType==='edit'" :label="$t('wolf.newCategoryLabelID')" prop="id">
          <el-input
            v-model="category.id"
            :placeholder="$t('wolf.newCategoryPromptID')"
            readonly
          />
        </el-form-item>
        <el-form-item :label="$t('wolf.newCategoryLabelName')" prop="name">
          <el-input
            v-model="category.name"
            :placeholder="$t('wolf.newCategoryPromptName')"
            minlength="5"
            maxlength="64"
            show-word-limit
          />
        </el-form-item>
        <el-form-item :label="$t('wolf.labelApp')" prop="appID">
          <el-select v-model="category.appID" :placeholder="$t('wolf.promptChangeApp')" size="small" style="display: block">
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
        <el-button type="danger" @click="dialogVisible=false">{{ $t('wolf.btnCancel') }}</el-button>
        <el-button type="primary" @click="validateAndSubmit('category');">{{ $t('wolf.btnConfirm') }}</el-button>
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
import i18n from '@/i18n/i18n'

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
          { required: true, message: i18n.t('wolf.categoryRulesMessageNameRequired'), trigger: ['blur', 'change'] },
          { min: 2, max: 32, message: i18n.t('wolf.pubRulesMessageLength_2_32'), trigger: ['blur', 'change'] },
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
        callback(new Error(i18n.t('wolf.categoryPromptNameExist')))
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
      const prompt = i18n.t('wolf.categoryPromptConfirmRemove')
      const textConfirm = i18n.t('wolf.btnConfirm')
      const textCancel = i18n.t('wolf.btnCancel')
      this.$confirm(prompt, 'Warning', {
        confirmButtonText: textConfirm,
        cancelButtonText: textCancel,
        type: 'warning',
      })
        .then(async() => {
          const res = await deleteCategory(row.id)
          if (res.ok) {
            this.listCategorys()
            this.$message({
              type: 'success',
              message: i18n.t('wolf.categoryPromptRemoveSuccess'),
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

        this.dialogVisible = false
        this.$notify({
          title: 'Success',
          dangerouslyUseHTMLString: true,
          message: i18n.t('wolf.categoryPromptUpdateSuccess'),
          type: 'success',
        })
      } else {
        const res = await addCategory(this.category)
        if (!res.ok) {
          return
        }
        this.listCategorys()
        this.category = res.data.category
        this.dialogVisible = false
        this.$notify({
          title: 'Success',
          dangerouslyUseHTMLString: true,
          message: i18n.t('wolf.categoryPromptAddSuccess'),
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
