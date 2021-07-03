<!-- i18n -->
<template>
  <div>
    <span>{{ $t('wolf.language') }}</span>
    <el-select v-model="selectValue" placeholder="please select" size="small" class="lang-changer" @change="langChange">
      <el-option v-for="item in options" :key="item.value" :label="item.label" :value="item.value" />
    </el-select>
  </div>
</template>

<script>
export default {
  data() {
    return {
      // init from cookie
      selectValue: 'en',
      options: [
        {
          value: 'zhcn',
          label: '简体中文',
        },
        {
          value: 'en',
          label: 'English',
        },
      ],
    }
  },
  created() {
    const that = this
    that.selectValue = localStorage.lang === undefined ? 'en' : localStorage.lang
  },
  methods: {
    langChange(e) {
      localStorage.setItem('lang', e)
      this.$i18n.locale = e
    },
  },
}
</script>

<style lang="scss" scoped>

.lang-changer {
  width: 100px;
}

</style>
