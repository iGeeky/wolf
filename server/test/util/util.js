const mocha = require('./mocha');
const config = require('../../conf/config')

const headers = {

}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function okSchema(dataSchema) {
  const resultSchema = {
    type: 'object',
    properties: {
      ok: {type: 'boolean', enum: [true]},
      reason: {type: 'string', enum: ['']},
      data: dataSchema,
    },
    required: ['ok', 'reason', 'data'],
  }
  return resultSchema;
}

function okSchema2(reason, dataSchema) {
  const resultSchema = {
    type: 'object',
    properties: {
      ok: {type: 'boolean', enum: [true]},
      reason: {type: 'string', enum: [reason]},
      data: dataSchema,
    },
    required: ['ok', 'reason', 'data'],
  }
  return resultSchema;
}


function failSchema(reason) {
  const resultSchema = {
    type: 'object',
    properties: {
      ok: {type: 'boolean', enum: [false]},
      reason: {type: 'string', enum: [reason]},
    },
    required: ['ok', 'reason'],
  }
  return resultSchema;
}

function defPassword() {
  return config.rootUserInitialPassword
}

function adminHeaders() {
  return headers;
}

function getAdminLoginResponseSchema() {
  const schema = okSchema({
    type: 'object',
    properties: {
      token: {type: 'string'},
      userInfo: {type: 'object'},
    },
    required: ['token', 'userInfo'],
  })
  return schema
}

async function adminLoginInternal(headers, username, password) {
  const schema = getAdminLoginResponseSchema();
  const body = {'username': username, 'password': password}
  const url = `/wolf/user/login`;
  const res = await mocha.post({url, headers, body, schema})
  const token = res.body.data.token;
  // console.log('>>> admin[%s] token:::', username, token)
  return {token}
}


before(async () => {
  if (exports.ignoreInit) {
    return
  }
  // super user
  const {token: adminToken} = await adminLoginInternal(headers, 'root', defPassword())
  headers['x-rbac-token'] = adminToken
})


exports.sleep = sleep;
exports.okSchema = okSchema;
exports.okSchema2 = okSchema2;
exports.failSchema = failSchema;
exports.defPassword = defPassword;
exports.adminHeaders = adminHeaders;
