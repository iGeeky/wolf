<template>
  <el-select v-model="currentApp" placeholder="Change App" size="small">
    <el-option v-if="addRbacConsoleItem" :key="rbacConsoleItem.id" :label="rbacConsoleItem.name" :value="rbacConsoleItem.id" />
    <el-option
      v-for="application in applications"
      :key="application.id"
      :label="application.name"
      :value="application.id"
    />
  </el-select>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  name: 'CurrentApp',
  props: {
    addRbacConsoleItem: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      rbacConsoleItem: {
        id: 'rbac-console',
        name: 'Wolf Console',
      },
    }
  },
  computed: {
    currentApp: {
      get() {
        return this.$store.getters.currentApp
      },
      set(value) {
        this.$store.dispatch('currentApp/setCurrentApp', value)
      },
    },
    ...mapGetters([
      'applications',
    ]),
  },
  created: function() {
    if (!this.$store.getters.currentApp) { // if it's null, set to the first of applications
      if (this.$store.getters.applications && this.$store.getters.applications.length > 0) {
        this.$store.dispatch('currentApp/setCurrentApp', this.$store.getters.applications[0].id)
      }
    }
  },
  methods: {

  },
}
</script>
