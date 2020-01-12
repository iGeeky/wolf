const Chksum = require('./chksum')
const NodeRSA = require('node-rsa')
const crypto = require('crypto');
const moment = require('moment')

const devIdChksum = new Chksum('e843c143d7ba52f8', 4)
const randomKeyChksum = new Chksum('09450607debe9d', 4, 'hex')
const FirstEncryptKey = 'cf4d2264af312228486cba9a72d66efb';

function sha1hex(data) {
  const sha1 = crypto.createHash('sha1');
  return sha1.update(data).digest('hex')
}

function encodePassword(password) {
  return sha1hex('AJ53MCdmPJM|' + password)
}

function randomDeviceId() {
  const md5 = crypto.createHash('md5');
  const rand = moment().format('x') + ':' + Math.random()
  let deviceID = md5.update(rand).digest('base64')
  deviceID = devIdChksum.add(deviceID)
  // console.log('rand: %s, deviceID: %s', rand, deviceID)

  return deviceID;
}

async function getRandomKey(publicKey) {
  // console.log('publicKey: %s', publicKey)
  const md5 = crypto.createHash('md5');
  const rand = moment().format('x') + ':' + Math.random()
  let randomKey = md5.update(rand).digest('hex').substr(0, 28)
  randomKey = randomKeyChksum.add(randomKey)

  const encryptRandomKey = rsaEncrypt(randomKey, publicKey)

  // console.log('randomKey: %s, encrypt: %s', randomKey, encryptRandomKey)
  return {randomKey, encryptRandomKey}
}


function rsaEncrypt(data, publicKey) {
  const key = new NodeRSA(publicKey)
  key.setOptions({encryptionScheme: 'pkcs1'})
  const encryptData = key.encrypt(data, 'base64')
  return encryptData
}

// function createAesDecipher(key) {

// }

function aesDecrypt(data, key) {
  const iv = '';
  const clearEncoding = 'utf8';
  const cipherEncoding = 'base64';
  const cipherChunks = [];
  const decipher = crypto.createDecipheriv('aes-256-ecb', key, iv);
  decipher.setAutoPadding(true);

  cipherChunks.push(decipher.update(data, cipherEncoding, clearEncoding));
  // console.log('############ 444')
  cipherChunks.push(decipher.final(clearEncoding));
  // console.log('>>> cipherChunks:::', cipherChunks)
  return cipherChunks.join('');
}

function aesEncrypt(data, key) {
  const iv = '';
  const clearEncoding = 'utf8';
  const cipherEncoding = 'base64';
  const cipherChunks = [];
  const cipher = crypto.createCipheriv('aes-256-ecb', key, iv);
  cipher.setAutoPadding(true);
  cipherChunks.push(cipher.update(data, clearEncoding, cipherEncoding));
  cipherChunks.push(cipher.final(cipherEncoding));

  return cipherChunks.join('');
}

function getEncryptKey(url) {
  if (url === '/wolf/device/reg' || url === '/wolf/config') {
    return FirstEncryptKey
  } else {
    if (!exports.EncryptKey) {
      throw new Error(`request [${url}] EncryptKey is missing, need init first`)
    }
    return exports.EncryptKey
  }
}

function encryptBody(data, url) {
  if (url.startsWith('/wolf/man/')) {
    return undefined
  }

  const encryptKey = getEncryptKey(url)
  // console.log('data: ', data, ", encryptKey: ", encryptKey)
  return aesEncrypt(data, encryptKey)
}

function decryptBody(data, url) {
  if (url.startsWith('/wolf/man/')) {
    return undefined
  }
  const encryptKey = getEncryptKey(url)
  // console.log('data: ', data, ", encryptKey: ", encryptKey)
  // console.log('data len: ', data.length)
  return aesDecrypt(data, encryptKey)
}

exports.sha1hex = sha1hex;
exports.encodePassword = encodePassword;
exports.randomDeviceId = randomDeviceId;
exports.getRandomKey = getRandomKey;
exports.rsaEncrypt = rsaEncrypt;
exports.aesDecrypt = aesDecrypt;
exports.aesEncrypt = aesEncrypt;
exports.encryptBody = encryptBody;
exports.decryptBody = decryptBody;
