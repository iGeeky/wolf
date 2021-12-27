<template>
  <div class="perm-transfer-container">
    <el-dialog
      id="diagram"
      :title="$t('wolf.permTransferTitle')"
      :visible.sync="transferVisible"
      custom-class="transfer-dialog"
      center
      append-to-body
    >
      <el-transfer
        v-model="permIDs"
        filterable
        :filter-method="filterMethod"
        :filter-placeholder="$t('wolf.permTransferFilterPrompt')"
        :titles="[$t('wolf.permTransferLabelAllPerm'), $t('wolf.permTransferLabelSelPerm')]"
        :data="allPerms"
      />
      <div class="transfer-button-bar">
        <el-button type="danger" @click="transferVisible=false">{{ $t('wolf.btnCancel') }}</el-button>
        <el-button type="primary" @click="submit();">{{ $t('wolf.btnConfirm') }}</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
// import i18n from '@/i18n/i18n'

export default {
  name: 'PermissionSelect',
  props: {
    value: {
      type: [Array, String],
      required: true,
    },
    readonly: {
      type: Boolean,
      default: false,
    },
    all: {
      type: [Array],
      required: true,
    },
    visible: {
      type: Boolean,
      default: false,
    },
  },
  data: function() {
    return {
      selPermIDs: [],
      permChanged: false,
    }
  },
  computed: {
    permIDs: {
      get() {
        return this.selPermIDs
      },
      set(value) {
        this.permChanged = true
        // console.log("permIDs: ", value)
        // this.$emit('update:value', value)
        this.selPermIDs = value
      },
    },
    transferVisible: {
      get() {
        return this.visible
      },
      set(value) {
        this.$emit('update:visible', value)
      },
    },
    allPerms: {
      get() {
        const allPermissions = []
        for (const permission of this.all) {
          allPermissions.push({
            key: permission.id,
            label: permission.name,
          })
        }
        return allPermissions
      },
    },
  },
  watch: {
    visible: function(val) {
      if (val) {
        this.selPermIDs = [].concat(this.value)
      }
    },
  },
  created: function() {
    // this.selPermIDs = [].concat(this.value)
  },
  methods: {
    filterMethod(query, item) {
      return item.key.indexOf(query) > -1 || item.label.indexOf(query) > -1
    },
    async submit() {
      this.$emit('update:value', this.selPermIDs)
      this.transferVisible = false
      this.selPermIDs = []
    },
  },
}
</script>

<style>
.perm-transfer-container {
  padding: 0px;
  display: flex;

}
.transfer-dialog {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  min-width: 660px;
  max-width: 700px;
}
.transfer-button-bar {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: flex-end;
  height: 50px;
}
.el-transfer-panel {
  width: 250px;
}
</style>
