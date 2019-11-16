<template>
  <el-select
    v-model="roleIDs"
    placeholder="Change Role"
    size="small"
    style="display: block"
    multiple
    clearable
    filterable
  >
    <el-option
      v-for="role in roles"
      :key="role.id"
      :label="role.name"
      :value="role.id"
    />
  </el-select>
</template>

<script>
import { listRoles } from '@/api/role'

export default {
  name: 'RoleSelect',
  props: {
    value: {
      type: Array,
      default: () => [],
    },
    application: {
      type: String,
      default: '',
    },
  },
  data: function() {
    return {
      roles: [],
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
    roleIDs: {
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
      this.listRoles()
    },
  },
  created: function() {
    this.listRoles()
  },
  methods: {
    async listRoles() {
      const res = await listRoles({ appID: this.currentApp, limit: 256 })
      if (res && res.ok) {
        this.roles = res.data.roles
      }
    },
  },
}
</script>
