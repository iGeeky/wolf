const { authenticate, LdapAuthenticationError } = require('ldap-authentication')
const typeUtil = require('../util/type-util')
const errors = require('../errors/errors')
const log4js = require('../util/log4js')
const ldap = require('ldapjs');
const crc = require('node-crc');
const {ldapConfig} = require('../../conf/config')

function idValueMapping(ldapUserId, userIdBase) {
  let userId = parseInt(ldapUserId)
  if(userId) {
    // the wolf user id = ldapUserId + config.ldapConfig.userIdBase
    return userIdBase + userId
  }
  userId = BigInt('0x' + crc.crc64(Buffer.from(`${userIdBase}:${ldapUserId}`)).toString("hex"))
  return userId
}

async function ldapLogin(username, password) {
  if (!ldapConfig) {
    return {err: errors.ERR_LDAP_CONFIG_NOT_FOUND}
  }

  const ldapBaseDn = ldapConfig.baseDn;
  const ldapUrl = ldapConfig.url;
  const fieldsMap = ldapConfig.fieldsMap
  let options = {
    ldapOpts: {
      url: ldapUrl,
      // tlsOptions: { rejectUnauthorized: false }
    },
    adminDn: ldapConfig.adminDn,
    adminPassword: ldapConfig.adminPassword,
    userSearchBase: ldapBaseDn,
    // usernameAttribute: ldapConfig.fieldsMap.username || 'uid',
    usernameAttribute: 'uid',
    username: username,
    userPassword: password,
  }
  let ldapUser = undefined
  try {
    ldapUser = await authenticate(options)
  } catch (ex) {
    if (ex instanceof ldap.InvalidCredentialsError) {
      log4js.info("LDAP authenticate(%s) failed! ex: %s", username, ex)
      return {err: errors.ERR_PASSWORD_ERROR}
    } else if (ex instanceof LdapAuthenticationError) {
      log4js.warn("LDAP authenticate(%s) failed! ex: %s", username, ex)
      return {err: errors.ERR_USER_NOT_FOUND}
    } else {
      if (ex.admin) {
        ex = ex.admin
      }
      log4js.error("LDAP authenticate(%s) failed! ex: %s", username, ex)
      return {err: errors.ERR_SERVER_ERROR}
    }
  }

  let userInfo = {}
  for (var field in fieldsMap) {
    if (field == 'username') {
      continue
    }
    let ldapField = fieldsMap[field]
    let value = ldapUser[ldapField]
    if (field == 'id') {
      value = idValueMapping(value, ldapConfig.userIdBase)
    }
    if (typeUtil.isArray(value)) {
      value = value.join('; ')
    }
    userInfo[field] = value
  }
  userInfo.username = username
  return {userInfo};
}

// ldapLogin('lisi', '123456').then(console.log)
// ldapLogin('zhangsan', '123456').then(console.log)

exports.ldapLogin = ldapLogin
