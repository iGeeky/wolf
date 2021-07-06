<template>
  <div>
    <el-dropdown @command="handlePermissionDetail">
      <el-button type="primary">
        {{ $t('wolf.btnDetail') }}<i class="el-icon-arrow-down el-icon--right" />
      </el-button>
      <el-dropdown-menu v-if="appIds && appIds.length > 0" slot="dropdown">
        <el-dropdown-item v-for="appID in appIds" :key="appID" :command="appID">{{ appID }}</el-dropdown-item>
      </el-dropdown-menu>
      <el-dropdown-menu v-else slot="dropdown">
        <el-dropdown-item key="no_app" command="">{{ $t('wolf.roleDetailLabelNoApplication') }}</el-dropdown-item>
      </el-dropdown-menu>
    </el-dropdown>
    <el-dialog :visible.sync="detailDialogVisible" :title="$t('wolf.roleDetailDialogTitle')" custom-class="rbac-edit-dialog">
      <el-form ref="user" :model="user" label-width="120px" label-position="left">
        <el-form-item :label="$t('wolf.roleDetailLabelUsername')" prop="username">
          <el-input v-model="user.username" readonly />
        </el-form-item>
        <el-form-item :label="$t('wolf.roleDetailLabelNickname')" prop="nickname">
          <el-input v-model="user.nickname" readonly />
        </el-form-item>
        <el-form-item :label="$t('wolf.labelApp')" prop="appIDs">
          <el-input v-model="currentApp" readonly />
        </el-form-item>
        <el-form-item :label="$t('wolf.roleDetailLabelPermissions')" prop="permIDs">
          <permission-select :value.sync="userRole.permIDs" :application="currentApp" multiple />
        </el-form-item>
        <el-form-item :label="$t('wolf.roleDetailLabelRoles')" prop="roleIDs">
          <role-select :value.sync="userRole.roleIDs" :application="currentApp" />
        </el-form-item>
      </el-form>
      <div style="text-align:right;">
        <el-button type="danger" @click="detailDialogVisible=false">{{ $t('wolf.btnCancel') }}</el-button>
        <el-button type="primary" @click="submit('user')">{{ $t('wolf.btnConfirm') }}</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { getUserRole, setUserRole } from '@/api/user-role'
import PermissionSelect from '@/components/PermissionSelect'
import RoleSelect from '@/components/RoleSelect'
import i18n from '@/i18n/i18n'

const defaultUserRole = {
  userID: null,
  appID: '',
  permIDs: [],
  roleIDs: [],
}

export default {
  name: 'PermissionDetail',
  components: { PermissionSelect, RoleSelect },
  props: {
    user: {
      type: Object,
      required: true,
    },
  },
  data: function() {
    return {
      currentApp: null,
      userRole: Object.assign({}, defaultUserRole),
      detailDialogVisible: false,
    }
  },
  computed: {
    appIds: function() {
      const appIds = this.user.appIDs || []
      if (this.$store.getters.userInfo.manager === 'super') {
        return appIds
      } else {
        const loginUserAppIds = new Set(this.$store.getters.appIds)
        const intersection = Array.from(new Set(appIds.filter(v => loginUserAppIds.has(v))))
        return intersection
      }
    },
  },
  created: function() {
    // this.listPermissions()
  },
  methods: {
    async getUserRole() {
      const res = await getUserRole(this.user.id, this.currentApp)
      if (res.ok) {
        this.userRole = Object.assign(Object.assign({}, defaultUserRole), (res.data.userRole || defaultUserRole))
      }
      return res
    },
    async permissionClick() {

    },
    async handlePermissionDetail(command) {
      if (!command) {
        return
      }
      this.currentApp = command
      const res = await this.getUserRole()
      if (res.ok) {
        this.detailDialogVisible = true
      } else {
        //
      }
    },
    async submit(formName) {
      const res = await setUserRole(this.userRole)
      if (res.ok) {
        this.userRole = Object.assign({}, defaultUserRole)
        this.detailDialogVisible = false
        this.$notify({
          title: 'Success',
          dangerouslyUseHTMLString: true,
          message: i18n.t('wolf.userPromptUpdateRoleDetailSuccess'),
          type: 'success',
        })
      } else {
        return false
      }
    },
  },
}

</script>
