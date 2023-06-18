
const mocha = require('./util/mocha')
const util = require('./util/util')
const config = require('../conf/config')
const {redisClient} = require('../src/util/redis-util')
const headers = util.adminHeaders()


function getLoginOptionsSchema() {
  const dataSchema = {
    type: "object",
    properties: {
      password: {
        type: "object",
        properties: {
          supported: {type: "boolean", enum: [true]},
        },
        required: ["supported"]
      },
      consoleLoginWithCaptcha: {type: "boolean", enum: [true]},
    },
    required: ["password", "consoleLoginWithCaptcha"]
  }

  const schema = util.okSchema(dataSchema)
  return schema
}

function getCaptchaSchema() {
  const dataSchema = {
    type: "object",
    properties: {
      cid: {type: "string", },
      captcha: {type: "string"},
    },
    required: ["cid", "captcha"]
  }

  const schema = util.okSchema(dataSchema)
  return schema
}

async function getCaptchaText(cid) {
  const key = `cha:${cid}`;
  const text = await redisClient.get(key)
  if (!text) {
    console.error("Couldn't get captcha from redis: " + key)
  }
  return text || 'not-found'
}

describe('captcha', function() {
  let cid = undefined;
  before(function() {
    config.consoleLoginWithCaptcha = true
  });


  it('ldap options, ', async function() {
    const schema = getLoginOptionsSchema()
    const args = {}
    const url = '/wolf/user/loginOptions';
    await mocha.get({url, headers, args, schema})
  });

  it('get captcha', async function() {
    const schema = getCaptchaSchema();
    const args = {}
    const url = '/wolf/captcha'
    const res = await mocha.get({url, headers, args, schema})
    cid = res.body.data.cid
  });

  it('captcha cid missing', async function() {
    const schema = util.failSchema('ERR_ARGS_ERROR', "cid missing, it's required.")
    const username = 'root'
    const password = 'error-password'
    const body = {username, password}
    const url = '/wolf/user/login';
    await mocha.post({url, headers, body, status:400, schema})
  });

  it('captcha text missing', async function() {
    const schema = util.failSchema('ERR_ARGS_ERROR', "captchaText missing, it's required.")
    const username = 'root'
    const password = 'error-password'
    const body = {username, password, cid, captchaText: ''}
    const url = '/wolf/user/login';
    await mocha.post({url, headers, body, status:400, schema})
  });

  it('captcha error', async function() {
    const schema = util.failSchema('ERR_CAPTCHA_INVALID')
    const username = 'root'
    const password = 'error-password'
    const body = {username, password, cid, captchaText: 'error'}
    const url = '/wolf/user/login';
    await mocha.post({url, headers, body, schema})
  });

  it('captcha success', async function() {
    const schema = util.failSchema('ERR_PASSWORD_ERROR')
    const username = 'root'
    const password = 'error-password'
    const captchaText = await getCaptchaText(cid)
    const body = {username, password, cid, captchaText: captchaText}
    const url = '/wolf/user/login';
    await mocha.post({url, headers, body, schema})
  });

  after(async function() {
    config.consoleLoginWithCaptcha = false
  });

});


