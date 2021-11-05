const config = require('../../conf/config')

function ldapOptions() {
  let supported = false
  let label = 'LDAP'
  let syncedFields = [] // fields synced from ldap
  const ldapConfig = config.ldapConfig
  if (ldapConfig) {
    supported = true
    label = ldapConfig.label
    if (ldapConfig.fieldsMap) {
      syncedFields = Object.keys(ldapConfig.fieldsMap)
    }
  }
  return { supported, label, syncedFields }
}

exports.ldapOptions = ldapOptions
