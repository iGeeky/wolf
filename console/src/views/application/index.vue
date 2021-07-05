<template>
  <div class="app-container">

    <div class="filter-container">
      <el-input
        v-model="listQuery.key"
        :placeholder="$t('wolf.appSearchPrompt')"
        style="width: 200px;"
        class="filter-item"
        maxlength="32"
        clearable
        @keyup.enter.native="handleFilter"
      />
      <el-button class="filter-item" type="primary" icon="el-icon-search" @click="handleFilter">
        {{ $t('wolf.search') }}
      </el-button>
      <el-button class="filter-item" type="primary" @click="handleAdd">{{ $t('wolf.appNewApplication') }}</el-button>
    </div>

    <el-table :data="applications" style="margin-top:30px; " border>
      <el-table-column align="center" :label="$t('wolf.titleId')" min-width="15" show-overflow-tooltip>
        <template slot-scope="scope">
          {{ scope.row.id }}
        </template>
      </el-table-column>
      <el-table-column align="center" :label="$t('wolf.titleName')" min-width="20" show-overflow-tooltip>
        <template slot-scope="scope">
          {{ scope.row.name }}
        </template>
      </el-table-column>
      <el-table-column align="center" :label="$t('wolf.titleDescription')" min-width="40" show-overflow-tooltip>
        <template slot-scope="scope">
          {{ scope.row.description }}
        </template>
      </el-table-column>

      <el-table-column align="center" :label="$t('wolf.appTitleRedirectUris')" min-width="40" show-overflow-tooltip prop="redirectUris" :formatter="redirectUrisFormat" />
      <el-table-column align="center" :label="$t('wolf.appTitleAccessTokenLifetime')" min-width="20" show-overflow-tooltip prop="accessTokenLifetime" :formatter="lifetimeFormat" />
      <el-table-column align="center" :label="$t('wolf.appTitleRefreshTokenLifetime')" min-width="20" show-overflow-tooltip prop="refreshTokenLifetime" :formatter="lifetimeFormat" />
      <el-table-column align="center" :label="$t('wolf.appTitleDiagram')" min-width="10">
        <template slot-scope="scope">
          <el-button type="primary" size="small" @click="handleDiagram(scope)">{{ $t('wolf.btnShow') }}</el-button>
        </template>
      </el-table-column>

      <el-table-column align="center" :label="$t('wolf.titleCreateTime')" min-width="20" show-overflow-tooltip prop="createTime" :formatter="unixtimeFormat" />
      <el-table-column align="center" :label="$t('wolf.titleOperations')" min-width="20">
        <template slot-scope="scope">
          <el-button type="primary" size="small" @click="handleEdit(scope)">{{ $t('wolf.btnEdit') }}</el-button>
          <el-button type="danger" size="small" @click="handleDelete(scope)">{{ $t('wolf.btnDelete') }}</el-button>
        </template>
      </el-table-column>
    </el-table>
    <div class="pagination pagination-center">
      <pagination v-show="total>0" :total="total" :page.sync="listQuery.page" :limit.sync="listQuery.limit" @pagination="listApplications" />
    </div>

    <el-dialog :visible.sync="dialogVisible" :title="dialogType==='edit'?$t('wolf.appEditApplication'):$t('wolf.appNewApplication')" custom-class="application-edit-dialog">
      <el-form ref="application" :model="application" :rules="rules" label-width="150px" label-position="left">
        <el-form-item :label="$t('wolf.newAppLabelAppID')" prop="id">
          <el-input
            v-model="application.id"
            :placeholder="$t('wolf.newAppPromptAppID')"
            :readonly="dialogType==='edit'"
            minlength="3"
            maxlength="32"
            show-word-limit
          />
        </el-form-item>
        <el-form-item :label="$t('wolf.newAppLabelAppName')" prop="name">
          <el-input
            v-model="application.name"
            :placeholder="$t('wolf.newAppPromptAppName')"
            minlength="5"
            maxlength="64"
            show-word-limit
          />
        </el-form-item>
        <el-form-item :label="$t('wolf.newAppLabelDescription')" prop="description">
          <el-input
            v-model="application.description"
            :placeholder="$t('wolf.newAppPromptDescription')"
            maxlength="256"
            show-word-limit
          />
        </el-form-item>
        <el-form-item :label="$t('wolf.newAppLabelAppSecret')" prop="secret">
          <el-input
            v-model="application.secret"
            :placeholder="$t('wolf.newAppPromptAppSecret')"
            maxlength="64"
            :readonly="true"
            show-word-limit
          >
            <el-button v-if="showBtnShow" slot="append" @click="showSecret(application.id);">{{ $t('wolf.btnShow') }}</el-button>
            <el-button
              v-if="showBtnReset"
              slot="append"
              @click="resetSecret();"
            >{{ $t('wolf.btnReset') }}</el-button>
          </el-input>
        </el-form-item>
        <el-form-item :label="$t('wolf.newAppLabelRedirectUris')" prop="redirectUris" class="redirect-uris-item">
          <el-tag
            v-for="redirectUri in application.redirectUris"
            :key="redirectUri"
            closable
            :disable-transitions="false"
            size="medium"
            @close="handleRedirectUriDelete(redirectUri)"
          >
            {{ redirectUri }}
          </el-tag>
          <el-input
            v-if="redirectUriInputVisible"
            ref="saveRedirectUriInput"
            v-model="redirectUriInputValue"
            :placeholder="$t('wolf.newAppPromptRedirectUris')"
            maxlength="256"
            show-word-limit
            class="input-new-redirect-uri"
            size="small"
            @keyup.enter.native="handleRedirectUriInputConfirm"
            @blur="handleRedirectUriInputConfirm"
          />
          <el-button v-else class="button-new-redirect-uri" size="small" @click="showRedirectUriInput">{{ $t('wolf.newAppPromptRedirectUrisBtn') }}</el-button>
        </el-form-item>
        <el-form-item :label="$t('wolf.newAppLabelAccessTokenLifetime')" prop="accessTokenLifetime" label-width="200px" class="lifetime-item">
          <el-input
            v-model="application.accessTokenLifetime"
            :placeholder="$t('wolf.newAppPromptAccessTokenLifetime')"
            maxlength="10"
            type="number"
          />
          <el-tag size="medium">{{ accessTokenLifetimePrompt }}</el-tag>
        </el-form-item>
        <el-form-item :label="$t('wolf.newAppLabelRefreshTokenLifetime')" prop="refreshTokenLifetime" label-width="200px" class="lifetime-item">
          <el-input
            v-model="application.refreshTokenLifetime"
            :placeholder="$t('wolf.newAppPromptRefreshTokenLifetime')"
            maxlength="10"
            type="number"
          />
          <el-tag size="medium">{{ refreshTokenLifetimePrompt }}</el-tag>
        </el-form-item>
      </el-form>
      <div style="text-align:right;">
        <el-button type="danger" @click="dialogVisible=false">{{ $t('wolf.btnCancel') }}</el-button>
        <el-button type="primary" @click="validateAndSubmit('application');">{{ $t('wolf.btnConfirm') }}</el-button>
      </div>
    </el-dialog>

    <el-dialog
      id="diagram"
      :title="$t('wolf.appDiagramTitle')"
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
import { lifetimeFormatter } from '@/utils/formatter'
import { listApplications, addApplication, deleteApplication, updateApplication, checkAppIdExist, checkAppNameExist, applicationDiagram, getSecret } from '@/api/application'
import Pagination from '@/components/Pagination' // secondary package based on el-pagination
import RbacDiagram from '@/components/RbacDiagram'
import i18n from '@/i18n/i18n'

const defaultApplication = {
  id: '',
  name: '',
  description: '',
  secret: '',
  redirectUris: [],
  accessTokenLifetime: 0,
  refreshTokenLifetime: 0,
}

export default {
  name: 'Application',
  components: { Pagination, RbacDiagram },
  props: {},
  data() {
    return {
      application: Object.assign({}, defaultApplication),
      secretMask: '**********',
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
      showBtnShow: false,
      showBtnReset: false,
      diagramDialogVisible: false,
      dialogVisible: false,
      dialogType: 'new',
      checkStrictly: false,
      defaultProps: {
        children: 'children',
        label: 'title',
      },
      redirectUriInputVisible: false,
      redirectUriInputValue: '',
      rules: {
        id: [
          { required: true, message: i18n.t('wolf.appRulesMessageIDRequired'), trigger: ['blur', 'change'] },
          { min: 2, max: 32, message: i18n.t('wolf.pubRulesMessageLength_2_32'), trigger: ['blur', 'change'] },
          { pattern: /^[a-zA-Z0-9_-]*$/, message: i18n.t('wolf.pubRulesMessageIDFormat'), trigger: ['blur', 'change'] },
          { validator: this.validateAppId, trigger: ['blur', 'change'] },
        ],
        name: [
          { required: true, message: i18n.t('wolf.appRulesMessageNameRequired'), trigger: ['blur', 'change'] },
          { validator: this.validateAppName, trigger: ['blur', 'change'] },
        ],
        redirectUris: [
          { type: 'array', defaultField: { 'type': 'url' }, trigger: ['change'] },
        ],
      },
    }
  },
  computed: {
    accessTokenLifetimePrompt: function() {
      return lifetimeFormatter(this.application.accessTokenLifetime)
    },
    refreshTokenLifetimePrompt: function() {
      return lifetimeFormatter(this.application.refreshTokenLifetime)
    },
  },
  created() {
    this.listApplications()
  },
  mounted() {},
  methods: {
    handleRedirectUriDelete(redirectUri) {
      this.application.redirectUris.splice(this.application.redirectUris.indexOf(redirectUri), 1)
    },

    randomSecret() {
      const chars = '23456789abcdefghijkmnpqrstuvwxyzABCDEFJHIJKLMNOPQRSTUVWXYZ'
      const secret = []
      for (let i = 0; i < 40; i++) {
        const rand = Math.floor((Math.random() * chars.length))
        secret.push(chars[rand])
      }
      return secret.join('')
    },

    resetSecret() {
      const prompt = i18n.t('wolf.appPromptConfirmResetSecret')
      const textConfirm = i18n.t('wolf.btnConfirm')
      const textCancel = i18n.t('wolf.btnCancel')
      this.$confirm(prompt, 'Warning', {
        confirmButtonText: textConfirm,
        cancelButtonText: textCancel,
        type: 'warning',
      })
        .then(async() => {
          this.application.secret = this.randomSecret()
          this.showBtnReset = false
          return true
        })
        .catch(err => { console.error(err) })
    },

    async showSecret(id) {
      const res = await getSecret({ id })
      if (res.ok) {
        this.application.secret = res.data.secret
        this.showBtnShow = false
        this.showBtnReset = true
      }
    },

    showRedirectUriInput() {
      this.redirectUriInputVisible = true
      this.$nextTick(_ => {
        this.$refs.saveRedirectUriInput.$refs.input.focus()
      })
    },

    handleRedirectUriInputConfirm() {
      const redirectUriInputValue = this.redirectUriInputValue
      if (redirectUriInputValue) {
        this.application.redirectUris.push(redirectUriInputValue)
      }
      this.redirectUriInputVisible = false
      this.redirectUriInputValue = ''
    },
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
        callback(new Error(i18n.t('wolf.appPromptAppIDExist')))
      } else {
        callback()
      }
    },

    async validateAppName(rule, value, callback) {
      const res = await checkAppNameExist(value, this.application.id)
      if (res.ok && res.exist) {
        callback(new Error(i18n.t('wolf.appPromptAppNameExist')))
      } else {
        callback()
      }
    },

    handleFilter() {
      this.listQuery.page = 1
      this.listApplications()
    },

    handleAdd() {
      this.dialogVisible = true
      this.application = Object.assign({}, defaultApplication)
      this.application.secret = this.randomSecret()
      this.dialogType = 'new'
      this.showBtnShow = false
      this.showBtnReset = false
    },
    handleEdit(scope) {
      this.dialogType = 'edit'
      this.dialogVisible = true
      this.checkStrictly = true
      scope.row.secret = this.secretMask
      this.application = deepClone(scope.row)
      this.showBtnShow = true
      this.showBtnReset = false
      if (!this.application.redirectUris) {
        this.application.redirectUris = []
      }
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
      const prompt = i18n.t('wolf.appPromptConfirmRemoveApplication')
      const textConfirm = i18n.t('wolf.btnConfirm')
      const textCancel = i18n.t('wolf.btnCancel')
      this.$confirm(prompt, 'Warning', {
        confirmButtonText: textConfirm,
        cancelButtonText: textCancel,
        type: 'warning',
      })
        .then(async() => {
          const res = await deleteApplication(row.id)
          if (res.ok) {
            this.listApplications()
            this.$message({
              type: 'success',
              message: i18n.t('wolf.appPromptRemoveSuccess'),
            })
            await this.$store.dispatch('user/getInfo')
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
      if (this.application.secret === this.secretMask) {
        delete (this.application.secret)
      }
      if (isEdit) {
        const res = await updateApplication(this.application.id, this.application)
        if (!res.ok) {
          return
        }
        this.listApplications()
        // const { name } = this.application
        this.dialogVisible = false
        await this.$store.dispatch('user/getInfo')
        this.$notify({
          title: 'Success',
          dangerouslyUseHTMLString: true,
          message: i18n.t('wolf.appPromptUpdateSuccess'),
          type: 'success',
        })
      } else {
        const res = await addApplication(this.application)
        if (!res.ok) {
          return
        }
        this.listApplications()

        // const { name } = this.application
        this.dialogVisible = false
        await this.$store.dispatch('user/getInfo')
        this.$notify({
          title: 'Success',
          dangerouslyUseHTMLString: true,
          message: i18n.t('wolf.appPromptAddSuccess'),
          type: 'success',
        })
      }
    },
  },
}
</script>

<style>
  .redirect-uris-item .el-tag + .el-tag {
    margin-top: 10px;
  }
  .button-new-redirect-uri {
    margin-top: 10px;
    height: 32px;
    line-height: 30px;
    padding-top: 0;
    padding-bottom: 0;
  }
  .input-new-redirect-uri {
    margin-top: 10px;
    vertical-align: bottom;
  }
  .redirect-uris-item .el-form-item__content{
    display: flex;
    flex-direction: column;
  }
  .lifetime-item .el-form-item__content{
    display: flex;
    flex-direction: row;
  }
  .lifetime-item .el-form-item__content .el-input {
    width: 150px;
    min-width: 120px;
    margin-right: 10px;
  }
  .lifetime-item .el-form-item__content .el-tag {
    width: 100%;
    height: 36px;
    line-height: 36px;
  }

  .application-edit-dialog {
    max-width: 600px;
  }
</style>
<style rel="stylesheet/scss" lang="scss" scoped>
#diagram .diagram-dialog {
  width: 80%;
  min-width: 900px;
  min-height: 500px;
}
</style>
