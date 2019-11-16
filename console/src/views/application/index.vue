<template>
  <div class="app-container">

    <div class="filter-container">
      <el-input
        v-model="listQuery.key"
        placeholder="App ID or App Name"
        style="width: 200px;"
        class="filter-item"
        maxlength="32"
        clearable
        @keyup.enter.native="handleFilter"
      />
      <el-button class="filter-item" type="primary" icon="el-icon-search" @click="handleFilter">
        Search
      </el-button>
      <el-button class="filter-item" type="primary" @click="handleAdd">New Application</el-button>
    </div>

    <el-table :data="applications" style="margin-top:30px; " border>
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
      <el-table-column align="center" label="Description" min-width="40" show-overflow-tooltip>
        <template slot-scope="scope">
          {{ scope.row.description }}
        </template>
      </el-table-column>
      <el-table-column align="center" label="Diagram" min-width="10">
        <template slot-scope="scope">
          <el-button type="primary" size="small" @click="handleDiagram(scope)">Show</el-button>
        </template>
      </el-table-column>

      <el-table-column align="center" label="Create Time" min-width="20" show-overflow-tooltip prop="createTime" :formatter="unixtimeFormat" />
      <el-table-column align="center" label="Operations" min-width="20">
        <template slot-scope="scope">
          <el-button type="primary" size="small" @click="handleEdit(scope)">Edit</el-button>
          <el-button type="danger" size="small" @click="handleDelete(scope)">Delete</el-button>
        </template>
      </el-table-column>
    </el-table>
    <div class="pagination pagination-center">
      <pagination v-show="total>0" :total="total" :page.sync="listQuery.page" :limit.sync="listQuery.limit" @pagination="listApplications" />
    </div>

    <el-dialog :visible.sync="dialogVisible" :title="dialogType==='edit'?'Edit Application':'New Application'" custom-class="rbac-edit-dialog">
      <el-form ref="application" :model="application" :rules="rules" label-width="100px" label-position="left">
        <el-form-item label="App ID" prop="id">
          <el-input
            v-model="application.id"
            placeholder="Application ID"
            :readonly="dialogType==='edit'"
            minlength="3"
            maxlength="32"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="App Name" prop="name">
          <el-input
            v-model="application.name"
            placeholder="Application Name"
            minlength="5"
            maxlength="64"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="Description" prop="description">
          <el-input
            v-model="application.description"
            placeholder="Description"
            maxlength="256"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <div style="text-align:right;">
        <el-button type="danger" @click="dialogVisible=false">Cancel</el-button>
        <el-button type="primary" @click="validateAndSubmit('application');">Confirm</el-button>
      </div>
    </el-dialog>

    <el-dialog
      id="diagram"
      title="Application Diagram"
      :visible.sync="diagramDialogVisible"
      custom-class="diagram-dialog"
      center
    >
      <rbac-diagram ref="diagram" :model-data="diagramData" />
    </el-dialog>
  </div>
</template>

<script>
// import path from 'path'
import { deepClone } from '@/utils'
import { listApplications, addApplication, deleteApplication, updateApplication, checkAppIdExist, checkAppNameExist, applicationDiagram } from '@/api/application'
import Pagination from '@/components/Pagination' // secondary package based on el-pagination
import RbacDiagram from '@/components/RbacDiagram'

const defaultApplication = {
  id: '',
  name: '',
  description: '',
}

export default {
  name: 'Application',
  components: { Pagination, RbacDiagram },
  props: {},
  data() {
    return {
      application: Object.assign({}, defaultApplication),
      diagramData: {},
      routes: [],
      applications: [],
      total: 0,
      listQuery: {
        page: 1,
        limit: 10,
        key: undefined,
        sort: '-createTime',
      },
      diagramDialogVisible: false,
      dialogVisible: false,
      dialogType: 'new',
      checkStrictly: false,
      defaultProps: {
        children: 'children',
        label: 'title',
      },

      rules: {
        id: [
          { required: true, message: 'Please Input Application ID', trigger: ['blur', 'change'] },
          { min: 2, max: 32, message: 'Length must be between 2 and 32 characters', trigger: ['blur', 'change'] },
          { pattern: /^[a-zA-Z0-9_-]*$/, message: 'App ID can only contain letters(a-zA-Z), numbers(0-9), underline(_)', trigger: ['blur', 'change'] },
          { validator: this.validateAppId, trigger: ['blur', 'change'] },
        ],
        name: [
          { required: true, message: 'Please Input Application Name', trigger: ['blur', 'change'] },
          { validator: this.validateAppName, trigger: ['blur', 'change'] },
        ],
      },
    }
  },
  created() {
    this.listApplications()
  },
  mounted() {},
  methods: {
    async listApplications() {
      const res = await listApplications(this.listQuery)
      if (res.ok) {
        this.total = res.data.total
        this.applications = res.data.applications
      }
    },

    async validateAppId(rule, value, callback) {
      if (this.dialogType === 'edit') {
        callback()
        return
      }

      const res = await checkAppIdExist(value)
      if (res.ok && res.exist) {
        callback(new Error(`App ID '${value}' already exists`))
      } else {
        callback()
      }
    },

    async validateAppName(rule, value, callback) {
      const res = await checkAppNameExist(value, this.application.id)
      if (res.ok && res.exist) {
        callback(new Error(`App Name '${value}' already exists`))
      } else {
        callback()
      }
    },

    handleFilter() {
      this.listQuery.page = 1
      this.listApplications()
    },

    handleAdd() {
      this.application = Object.assign({}, defaultApplication)
      this.dialogType = 'new'
      this.dialogVisible = true
    },
    handleEdit(scope) {
      this.dialogType = 'edit'
      this.dialogVisible = true
      this.checkStrictly = true
      this.application = deepClone(scope.row)
    },
    async handleDiagram({ $index, row }) {
      const res = await applicationDiagram(row.id)
      if (res.ok && res.data) {
        Object.assign(this.diagramData, res.data)
      }
      if (this.$refs.diagram) {
        this.$refs.diagram.refreshDiagram()
      }
      this.diagramDialogVisible = true
    },
    handleDelete({ $index, row }) {
      this.$confirm('Confirm to remove the application?', 'Warning', {
        confirmButtonText: 'Confirm',
        cancelButtonText: 'Cancel',
        type: 'warning',
      })
        .then(async() => {
          const res = await deleteApplication(row.id)
          if (res.ok) {
            this.listApplications()
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
          await this.submitApplication()
        } else {
          return false
        }
      })
    },

    async submitApplication() {
      const isEdit = this.dialogType === 'edit'

      if (isEdit) {
        const res = await updateApplication(this.application.id, this.application)
        if (!res.ok) {
          return
        }
        this.listApplications()
        const { name } = this.application
        this.dialogVisible = false
        this.$notify({
          title: 'Success',
          dangerouslyUseHTMLString: true,
          message: `
            <div>Alter application '${name}' success.</div>
          `,
          type: 'success',
        })
      } else {
        const res = await addApplication(this.application)
        if (!res.ok) {
          return
        }
        this.listApplications()

        const { name } = this.application
        this.dialogVisible = false
        this.$notify({
          title: 'Success',
          dangerouslyUseHTMLString: true,
          message: `<div>Application '${name}' added.</div>`,
          type: 'success',
        })
      }
    },
  },
}
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
#diagram .diagram-dialog {
  width: 80%;
  min-width: 900px;
  min-height: 500px;
}
</style>
