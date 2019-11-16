<template>
  <el-date-picker
    v-model="datetimeRange"
    type="datetimerange"
    :picker-options="pickerOptions"
    range-separator="to"
    start-placeholder="Start Time"
    end-placeholder="End Time"
    format="yyyy-MM-dd HH:mm"
    style="width: 360px;"
  />
</template>

<script>
const moment = require('moment')
export default {
  props: {
    value: {
      type: Array,
      default: undefined,
    },
  },
  data() {
    return {
      pickerOptions: {
        shortcuts: [
          {
            text: 'Today',
            onClick(picker) {
              const start = moment().startOf('day')
              const end = new Date()
              picker.$emit('pick', [start, end])
            },
          },
          {
            text: '24hours',
            onClick: (picker) => {
              picker.$emit('pick', this.getDatetimeRange(1))
            },
          },
          {
            text: 'One week',
            onClick: (picker) => {
              picker.$emit('pick', this.getDatetimeRange(7))
            },
          },
          {
            text: 'One month',
            onClick: (picker) => {
              picker.$emit('pick', this.getDatetimeRange(30))
            },
          },
          {
            text: 'Three month',
            onClick: (picker) => {
              picker.$emit('pick', this.getDatetimeRange(90))
            },
          },
        ],
      },
    }
  },
  computed: {
    datetimeRange: {
      get() {
        return this.value
      },
      set(value) {
        this.$emit('update:value', value)
      },
    },
  },
  methods: {
    getDatetimeRange(days) {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * days)
      return [start, end]
    },
  },
}
</script>
