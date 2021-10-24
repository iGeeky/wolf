'use strict'

const ldap = require('ldapjs')
const log4js = require('../util/log4js')

const server = ldap.createServer()

let _ldapEntities = []

function setLdapEntities(ldapEntities) {
  _ldapEntities = ldapEntities
}

server.add('dc=org', (req, res, next) => {
  // log4js.log('---- add %s -----', req.dn.toString())
  // log4js.log('Entry: ' + JSON.stringify(req.toObject().attributes))
  next()
})

// server.bind('cn=admin,dc=example,dc=org', (req, res, next) => {
//   if (req.dn.toString() !== 'cn=admin,dc=example,dc=org' || req.credentials !== '123456') {
//     return next(new ldap.InvalidCredentialsError())
//   }
//   res.end()
//   return next()
// })

server.bind('dc=example,dc=org', (req, res, next) => {
  const dn = req.dn.toString().replace(/ /g, '')
  const password = req.credentials
  log4js.info('LDAP login: {dn: "%s", password: "%s"}', dn, password)
  let errmsg = 'user-not-found'
  for (const ldapEntry of _ldapEntities) {
    if (ldapEntry.dn === dn) {
      if (ldapEntry.attributes.userPassword === password) {
        errmsg = 'OK'
      } else {
        errmsg = 'password-error'
      }
      break
    }
  }
  if (errmsg === 'OK') {
    res.end()
    return next()
  } else {
    if (errmsg === 'user-not-found') {
      return next(new ldap.LdapAuthenticationError())
    } else {
      return next(new ldap.InvalidCredentialsError())
    }
  }
})

server.search('dc=example,dc=org', (req, res, next) => {
  let searchEntry
  if (req.filter.toString().includes('uid=server-error')) {
    return next(new ldap.OtherError('ldap server internal error'))
  }
  for (const ldapEntry of _ldapEntities) {
    if (req.filter.matches(ldapEntry.attributes)) {
      searchEntry = ldapEntry
      break
    }
  }
  log4js.log('search: filter=%s -> %s', req.filter, JSON.stringify(searchEntry))
  if (searchEntry) {
    res.send(searchEntry)
  }
  res.end()
})

server.start = (port) => {
  port = port || 389
  server.listen(port, () => {
    console.log(`LDAP Mock server listening at ${server.url}`)
  })
}

server.stop = () => {
  server.emit('close')
  console.log(`LDAP Mock server at ${server.url} now closed`)
}

exports.server = server
exports.setLdapEntities = setLdapEntities
