
const config = require('../../conf/config')
const jwt = require('jsonwebtoken');
const log4js = require('./log4js')

const ERR_TOKEN_INVALID = 'ERR_TOKEN_INVALID';

function tokenEncrypt(userInfo) {
  const tokenKey = config.tokenKey;
  const expiresIn = config.tokenExpireTime;
  const payload = {id: parseInt(userInfo.id), username: userInfo.username, manager: userInfo.manager}
  const token = jwt.sign(payload, tokenKey, {expiresIn} );
  return token
}

function tokenDecrypt(token) {
  const tokenKey = config.tokenKey;
  try {
    const userInfo = jwt.verify(token, tokenKey)
    if (!userInfo) {
      log4js.error('jwt.verify(token: %s) failed!', token)
      return {error: ERR_TOKEN_INVALID}
    }
    log4js.info('token [%s], decode userInfo: %s', token, JSON.stringify(userInfo))
    return userInfo;
  } catch (err) {
    log4js.warn('jwt.verify(%s) failed! err: %s', token, err)
    return {error: ERR_TOKEN_INVALID}
  }
}

exports.tokenEncrypt = tokenEncrypt;
exports.tokenDecrypt = tokenDecrypt
