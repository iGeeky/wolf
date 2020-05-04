const config = require('../../conf/config')
const Chksum = require('./chksum')
const cryptor = require('./cryptor')
const magic = cryptor.sha1hex(config.cryptKey)
const OAuthMagic = magic.substr(0, 12)
const oauthUserIDAesKey = cryptor.md5hex('G04a#2lom:' + config.cryptKey)
const secretAesKey = cryptor.md5hex('W150x*4#p:' + config.cryptKey)
const userIDChkSum = new Chksum(OAuthMagic, 4, 'base64')

function encryptSecret(secret) {
  return cryptor.aesEncrypt(secret, secretAesKey)
}

function decryptSecret(encryptedSecret) {
  return cryptor.aesDecrypt(encryptedSecret, secretAesKey)
}

function OAuthUserID(userID, clientID) {
  const originalID = `v1:${clientID}:${userID}`
  const encryptedID = cryptor.aesEncrypt(originalID, oauthUserIDAesKey)
  const newUserID = userIDChkSum.add(encryptedID)
  // console.log('>>>OAuthUserID(userID: %s, clientID: %s) = oauthUserID: %s', userID, clientID, newUserID)
  return newUserID
}

function parseOAuthUserID(oauthUserID) {
  const { error, output: encryptedID } = userIDChkSum.check(oauthUserID)
  if (error) {
    return { error: 'ERR_USER_ID_INVALID' }
  }
  const originalID = cryptor.aesDecrypt(encryptedID, oauthUserIDAesKey)
  const values = originalID.split(':', 3)
  if (values.length !== 3) {
    return { error: 'ERR_USER_ID_INVALID' }
  }
  const clientID = values[1]
  const userID = parseInt(values[2])
  // console.log('>>>parseOAuthUserID(oauthUserID: %s) = {userID: %s, clientID: %s} = ', oauthUserID, userID, clientID)
  return { clientID, userID }
}

exports.OAuthUserID = OAuthUserID
exports.parseOAuthUserID = parseOAuthUserID
exports.encryptSecret = encryptSecret
exports.decryptSecret = decryptSecret
