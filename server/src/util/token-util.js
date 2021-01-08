
const config = require('../../conf/config')
const jwt = require('jsonwebtoken')
const log4js = require('./log4js')

const ERR_TOKEN_INVALID = 'ERR_TOKEN_INVALID'

const tokenVersion = 2

function tokenEncrypt(userInfo, appid) {
  const tokenKey = config.tokenKey
  const expiresIn = appid ? config.rbacTokenExpireTime : config.consoleTokenExpireTime
  const payload = { id: parseInt(userInfo.id), username: userInfo.username, manager: userInfo.manager, version: tokenVersion }
  if (appid) {
    payload.appid = appid
  }
  const token = jwt.sign(payload, tokenKey, { expiresIn })
  return { token, expiresIn }
}

function tokenDecrypt(token) {
  const tokenKey = config.tokenKey
  try {
    const userInfo = jwt.verify(token, tokenKey)
    if (!userInfo) {
      log4js.error('jwt.verify(token: %s) failed!', token)
      return { error: ERR_TOKEN_INVALID }
    }
    log4js.info('token [%s], decode userInfo: %s', token, JSON.stringify(userInfo))
    // token version is not matched
    if (!userInfo.version || userInfo.version < tokenVersion) {
      log4js.error('token version: ', userInfo.version, ' is not match current version:', tokenVersion)
      return { error: ERR_TOKEN_INVALID }
    }
    return userInfo
  } catch (err) {
    log4js.warn('jwt.verify(%s) failed! err: %s', token, err)
    return { error: ERR_TOKEN_INVALID }
  }
}

exports.tokenEncrypt = tokenEncrypt
exports.tokenDecrypt = tokenDecrypt
