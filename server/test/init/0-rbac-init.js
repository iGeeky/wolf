const rbacUtil = require('./0-rbac-util')
const argv = require('minimist')(process.argv.slice(2))
const policyFileName = argv.policyFile || './test/init/0-rbac-data-or.md'
const data = rbacUtil.rbacDataRead(policyFileName)

describe('rbac-init', function() {
  rbacUtil.rbacInit(data, argv.userPassword)
})
