<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

interface Props {
  modelValue: string[];
  readonly?: boolean;
  all: { id: string; name: string }[];
  visible: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false
});

const emit = defineEmits<{
  "update:modelValue": [value: string[]];
  "update:visible": [value: boolean];
}>();

const selPermIDs = ref<string[]>([]);

const permIDs = computed({
  get: () => selPermIDs.value,
  set: (value: string[]) => {
    selPermIDs.value = value;
  }
});

const transferVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value)
});

const allPerms = computed(() => {
  return props.all.map(permission => ({
    key: permission.id,
    label: permission.name
  }));
});

watch(
  () => props.visible,
  val => {
    if (val) {
      selPermIDs.value = [...props.modelValue];
    }
  }
);

const filterMethod = (query: string, item: { key: string; label: string }) => {
  return item.key.indexOf(query) > -1 || item.label.indexOf(query) > -1;
};

const submit = () => {
  emit("update:modelValue", selPermIDs.value);
  transferVisible.value = false;
  selPermIDs.value = [];
};
</script>

<template>
  <div class="perm-transfer-container">
    <el-dialog
      v-model="transferVisible"
      :title="t('wolf.permTransferTitle')"
      class="transfer-dialog"
      center
      append-to-body
    >
      <el-transfer
        v-model="permIDs"
        filterable
        :filter-method="filterMethod"
        :filter-placeholder="t('wolf.permTransferFilterPrompt')"
        :titles="[
          t('wolf.permTransferLabelAllPerm'),
          t('wolf.permTransferLabelSelPerm')
        ]"
        :data="allPerms"
      />
      <div class="transfer-button-bar">
        <el-button type="danger" @click="transferVisible = false">
          {{ t("wolf.btnCancel") }}
        </el-button>
        <el-button type="primary" @click="submit">
          {{ t("wolf.btnConfirm") }}
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.perm-transfer-container {
  padding: 0;
  display: flex;
}
.transfer-dialog {
  min-width: 660px;
  max-width: 700px;
}
:deep(.el-dialog__body) {
  display: flex;
  flex-direction: column;
  align-items: center;
}
:deep(.el-transfer) {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
}
:deep(.el-transfer-panel) {
  width: 250px;
}
.transfer-button-bar {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: flex-end;
  height: 50px;
  width: 100%;
}
</style>

