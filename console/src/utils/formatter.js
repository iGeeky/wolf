var moment = require('moment')

export const formatterMixin = {
  methods: {
    unixtimeFormat: function(row, column) {
      const unixtime = row[column.property]
      if (unixtime === undefined) {
        return ''
      }
      return moment.unix(unixtime).format('YYYY-MM-DD HH:mm')
    },
    userStatusFormat: function(row, column) {
      const status = row[column.property]
      switch (status) {
        case 0:
          return 'Normal'
        case -1:
          return 'Disabled'
        default:
          return 'Unknow:' + status
      }
    },
  },
}
