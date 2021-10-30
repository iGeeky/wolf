<template>
  <el-select
    v-model="permIDs"
    :placeholder="$t('wolf.promptChangePermission')"
    size="small"
    style="display: block"
    :multiple="multiple"
    :clearable="clearable"
    :disabled="readonly"
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
</template>

<script>
import { listPermissions } from '@/api/permission'
import i18n from '@/i18n/i18n'

export default {
  name: 'PermissionSelect',
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
      const res = await listPermissions({ appID: this.currentApp, limit: 512 })
      if (res && res.ok) {
        const permissions = res.data.permissions
        if (!this.multiple) {
          const denyAll = { id: 'DENY_ALL', name: i18n.t('wolf.labelDenyAll') }
          const allowAll = { id: 'ALLOW_ALL', name: i18n.t('wolf.labelAllowAll') }
          permissions.unshift(allowAll)
          permissions.unshift(denyAll)
        }
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
  },
}
</script>
