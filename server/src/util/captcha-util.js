
const config = require('../../conf/config')
const svgCaptcha = require('svg-captcha')
const log4js = require('./log4js')
const {redisClient} = require('./redis-util')
const util = require('./util')

const ERR_CAPTCHA_INVALID = 'ERR_CAPTCHA_INVALID'

function captchaKey(cid) {
  return `cha:${cid}`
}


async function newCaptcha() {
  const newCaptcha = svgCaptcha.create({
    size: 4,
    fontSize: 45,
    noise: Math.floor(Math.random() * 4) + 1,
    ignoreChars: '0o1i',
    width: 120,
    height: 40,
    color: true,
    background: '#ccc',
  })
  const text = newCaptcha.text;
  const cid = util.randomString(20);
  const key = captchaKey(cid);
  const expiresIn = 60 * 5;
  const res = await redisClient.set(key, text, 'EX', expiresIn);
  if (res !== 'OK') {
    throw new Error('redis set error');
  }
  const data = newCaptcha.data;
  return {cid, data}
}

async function captchaValidate(cid, text) {
  const key = captchaKey(cid);
  const captchaText = await redisClient.get(key);
  if (!captchaText) {
    log4js.log("captcha {cid: %s} not found", cid);
    return {valid: false, errmsg: ERR_CAPTCHA_INVALID}
  }
  if (captchaText != text) {
    return {valid: false, errmsg: ERR_CAPTCHA_INVALID}
  }
  return {valid: true, errmsg: ''}
}


exports.newCaptcha = newCaptcha
exports.captchaValidate = captchaValidate
