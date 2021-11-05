'use strict'

const { server, setLdapEntities } = require('../../src/ldap/LDAPMockServer')
const { ldapLogin } = require('../../src/ldap/LDAPClient')

// mock data for OpenLDAP
const ldapObjects = [
  {
    dn: 'cn=admin,dc=example,dc=org',
    attributes: {
      uid: 'admin',
      cn: 'admin',
      objectClass: ['inetOrgPerson', 'posixAccount', 'top'],
      userPassword: '123456',
      uidNumber: 1000,
    },
  },
  {
    dn: 'cn=zhangsan,dc=example,dc=org',
    attributes: {
      uid: 'zhangsan',
      cn: ['zhangsan', 'zhs'],
      mail: ['zhangsan@example.com', 'zhs@example.com'],
      objectClass: ['inetOrgPerson', 'posixAccount', 'top'],
      userPassword: '123456',
      uidNumber: 1002,
    },
  },
]

setLdapEntities(ldapObjects)

server.start(1389, () => {
  ldapLogin('zhangsan', '123456').then(console.log)
})

