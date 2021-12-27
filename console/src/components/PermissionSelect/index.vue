<template>
  <div class="permission-select-container">
    <el-select
      v-model="limitedPermIDs"
      :placeholder="$t('wolf.promptChangePermission')"
      size="small"
      :multiple="multiple"
      :clearable="clearable"
      :disabled="readonly || selectDisabled"
      class="permission-select"
      filterable
    >
      <el-option-group
        v-for="categoryPermission in categoryPermissions"
        :key="categoryPermission.category"
        :label="categoryPermission.category"
      >
        <el-option
          v-for="permission in categoryPermission.permissions"
          :key="permission.id"
          :label="permission.name"
          :value="permission.id"
        />
      </el-option-group>
    </el-select>
    <el-button v-if="!readonly && multiple" plain @click="showTransferDialog()">{{ $t('wolf.btnEdit') }}</el-button>
    <permission-transfer :value.sync="permIDs" :readonly="false" :all="allPermissions" :visible.sync="transferVisible" />
  </div>
</template>

<script>
import PermissionTransfer from '@/components/PermissionTransfer'

import { listPermissions, getSysPermissions } from '@/api/permission'
// import i18n from '@/i18n/i18n'

export default {
  name: 'PermissionSelect',
  components: { PermissionTransfer },
  props: {
    value: {
      type: [Array, String],
      required: true,
    },
    multiple: {
      type: Boolean,
      default: false,
    },
    readonly: {
      type: Boolean,
      default: false,
    },
    application: {
      type: String,
      default: '',
    },
  },
  data: function() {
    return {
      categoryPermissions: [],
      allPermissions: [],
      transferVisible: false,
    }
  },
  computed: {
    currentApp: function() {
      if (this.application) {
        return this.application
      } else {
        return this.$store.getters.currentApp
      }
    },
    clearable: function() {
      return this.multiple
    },
    permIDs: {
      get() {
        return this.value
      },
      set(value) {
        this.$emit('update:value', value)
      },
    },
    limitedPermIDs: {
      get() {
        if (this.selectDisabled) {
          const tmpPermIDs = this.permIDs.slice(0, 16)
          if (this.permIDs.length > 16) {
            tmpPermIDs.push('...')
          }
          return tmpPermIDs
        }
        return this.permIDs
      },
      set(value) {
        this.permIDs = value
      },
    },
    selectDisabled: {
      get() {
        if (!this.multiple) { // for resource
          return false
        }
        if (this.allPermissions && this.allPermissions.length >= 128) {
          return true
        }
        if (this.permIDs && this.permIDs.length >= 128) {
          return true
        }
        return false
      },
    },
  },
  watch: {
    currentApp: function(val) {
      this.listPermissions()
    },
  },
  created: function() {
    this.listPermissions()
  },
  methods: {
    async listPermissions() {
      const res = await listPermissions({ appID: this.currentApp, limit: 10000 })
      if (res && res.ok) {
        let permissions = res.data.permissions
        if (!this.multiple) {
          const sysPermissions = await getSysPermissions()
          permissions = sysPermissions.concat(permissions)
        }
        this.allPermissions = permissions

        const categoryPermissionMap = {}
        permissions.forEach(permission => {
          const category = permission.category ? permission.category.name : ''
          const categoryPermission = categoryPermissionMap[category] || {}
          categoryPermission.category = category
          categoryPermission.permissions = categoryPermission.permissions || []
          categoryPermission.permissions.push(permission)
          categoryPermissionMap[category] = categoryPermission
        })
        const categoryPermissions = []
        Object.keys(categoryPermissionMap).forEach(category => {
          const categoryPermission = categoryPermissionMap[category]
          if (category === '') {
            categoryPermissions.unshift(categoryPermission)
          } else {
            categoryPermissions.push(categoryPermission)
          }
        })
        this.categoryPermissions = categoryPermissions
      }
    },
    showTransferDialog() {
      this.transferVisible = true
    },
  },
}
</script>

<style>
  .permission-select-container {
    display: flex;
    flex-direction: row;
  }
  .permission-select {
    width: 100%;
  }
</style>
