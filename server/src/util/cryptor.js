const crypto = require('crypto')
const URLSafeBase64 = require('urlsafe-base64')

function sha1hex(data) {
  const sha1 = crypto.createHash('sha1')
  return sha1.update(data).digest('hex')
}

function md5hex(data) {
  const md5 = crypto.createHash('md5')
  return md5.update(data).digest('hex')
}

function encodePassword(password) {
  return sha1hex('AJ53MCdmPJM|' + password)
}

function aesDecrypt(data, key) {
  if (!URLSafeBase64.validate(data)) {
    console.error('data [%s] is not urlsafed base64 string', data)
    return data
  }
  const iv = ''
  const clearEncoding = 'utf8'
  const cipherEncoding = 'base64'
  const cipherChunks = []
  const decipher = crypto.createDecipheriv('aes-256-ecb', key, iv)
  decipher.setAutoPadding(true)

  cipherChunks.push(decipher.update(URLSafeBase64.decode(data), cipherEncoding, clearEncoding))
  cipherChunks.push(decipher.final(clearEncoding))
  return cipherChunks.join('')
}

function aesEncrypt(data, key) {
  const iv = ''
  const clearEncoding = 'utf8'
  const cipherEncoding = 'base64'
  const cipherChunks = []
  const cipher = crypto.createCipheriv('aes-256-ecb', key, iv)
  cipher.setAutoPadding(true)
  cipherChunks.push(cipher.update(data, clearEncoding, cipherEncoding))
  cipherChunks.push(cipher.final(cipherEncoding))
  return URLSafeBase64.encode(cipherChunks.join(''))
}

exports.sha1hex = sha1hex
exports.md5hex = md5hex
exports.encodePassword = encodePassword
exports.aesDecrypt = aesDecrypt
exports.aesEncrypt = aesEncrypt
