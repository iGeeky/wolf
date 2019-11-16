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
  },
}
