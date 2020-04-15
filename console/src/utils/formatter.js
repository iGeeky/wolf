var moment = require('moment')

export function lifetimeFormatter(lifetime) {
  if (!lifetime) {
    return '0'
  }
  const duration = moment.duration(lifetime * 1000)
  const days = duration.days()
  const hours = duration.hours()
  const minutes = duration.minutes()
  const seconds = duration.seconds()
  const items = []
  if (days > 0) {
    items.push(`${days} days`)
  }
  if (hours > 0) {
    items.push(`${hours} hours`)
  }
  if (minutes > 0) {
    items.push(`${minutes} minutes`)
  }
  if (seconds > 0) {
    items.push(`${seconds} seconds`)
  }

  return items.join(',')
}

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
    redirectUrisFormat: function(row, column) {
      const redirectUris = row[column.property]
      if (redirectUris && redirectUris.length > 0) {
        return redirectUris.join(',')
      }
      return ''
    },
    lifetimeFormat: function(row, column) {
      const lifetime = row[column.property]
      return lifetimeFormatter(lifetime)
    },
  },
}
