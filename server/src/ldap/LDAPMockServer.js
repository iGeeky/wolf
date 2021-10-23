'use strict'

const ldap = require('ldapjs')

const server = ldap.createServer()

let _ldapEntities = []

function setLdapEntities(ldapEntities) {
  _ldapEntities = ldapEntities
}

server.add('dc=org', (req, res, next) => {
  console.log('---- add %s -----', req.dn.toString())
  console.log('Entry: ' + JSON.stringify(req.toObject().attributes))
  next()
})

server.bind('cn=root,dc=example,dc=org', (req, res, next) => {
  if (req.dn.toString() !== 'cn=admin,dc=example,dc=org' || req.credentials !== '123456') {
    return next(new ldap.InvalidCredentialsError())
  }
  res.end()
  return next()
})

server.bind('dc=example,dc=org', (req, res, next) => {
  const dn = req.dn.toString().replace(/ /g, '')
  const password = req.credentials
  console.info('LDAP login: {dn: "%s", password: "%s"}', dn, password)
  let loginEntry
  for (const ldapEntry of _ldapEntities) {
    if (ldapEntry.dn === dn) {
      if (ldapEntry.attributes.userPassword === password) {
        loginEntry = ldapEntry
      }
      break
    }
  }
  if (loginEntry) {
    res.end()
    return next()
  } else {
    return next(new ldap.InvalidCredentialsError())
  }
})

server.search('dc=example,dc=org', (req, res, next) => {
  let loginEntry
  for (const ldapEntry of _ldapEntities) {
    if (req.filter.matches(ldapEntry.attributes)) {
      loginEntry = ldapEntry
      break
    }
  }
  console.log('search(filter=%s) -> %s', req.filter, JSON.stringify(loginEntry))
  if (loginEntry) {
    res.send(loginEntry)
  }
  res.end()
})

server.start = (port, done) => {
  port = port || 389
  server.listen(port, () => {
    console.log(`LDAP Mock server listening at ${server.url}`)
    done()
  })
}

server.stop = done => {
  server.emit('close')
  console.log(`LDAP Mock server at ${server.url} now closed`)
  done()
}

exports.server = server
exports.setLdapEntities = setLdapEntities
