const mocha = require('./mocha');
const config = require('../../conf/config')

const headers = {

}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setDefaultOfSchema(schema, data, fields) {
  const properties = schema.properties;
  if(!data || !properties) {
    return
  }
  for (let field of fields) {
    if(data[field] != undefined) {
      properties[field]["enum"] = [data[field]]
    }
  }
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


function failSchema(reason, errmsg) {
  const resultSchema = {
    type: 'object',
    properties: {
      ok: {type: 'boolean', enum: [false]},
      reason: {type: 'string', enum: [reason]},
    },
    required: ['ok', 'reason'],
  }
  if(errmsg) {
    resultSchema.properties['errmsg'] = {type: 'string', enum: [errmsg]}
  }
  return resultSchema;
}

function defPassword() {
  return config.rootUserInitialPassword
}

function adminHeaders() {
  return headers;
}

function getSimpleUserInfoSchema() {
  const userInfoSchema = {
    type: "object",
    properties: {
        id: {"type":"integer"},
        username: {"type":"string"},
        nickname: {"type":"string"},
        email: {"type": ["string", "null"]},
        appIDs: {"type":"array","items":{"type":"string"}},
        manager: {"type": ["string", "null"]},
        createTime: {"type":"integer"}
    },
    required: ["id","username","nickname","email","appIDs","manager","createTime"]
  }
  return userInfoSchema;
}

function userInfoSchema() {
  const schema = {
    type: 'object',
    properties: {
      id: { 'type': ['integer','string'] },
      username: { 'type': 'string' },
      nickname: { 'type': 'string' },
      email: { 'type': ['string', 'null'] },
      appIDs: { 'type': ['array', 'null'] },
      manager: { 'type': ['string', 'null'] },
      lastLogin: { 'type': 'number' },
      profile: { 'type': ['object', 'null'] },
      createTime: { 'type': 'number' },
      permissions: { 'type': 'object' },
      roles: { 'type': 'object' },
    },
    required: ['id', 'username', 'nickname'],
  }
  return schema;
}

function getUserInfoSchema() {
  const dataSchema = {
    type: 'object',
    properties: {
      userInfo: userInfoSchema()
    },
    required: ['userInfo'],
  }
  const schema = okSchema(dataSchema)
  return schema;
}


function getAdminLoginResponseSchema() {
  const schema = okSchema({
    type: 'object',
    properties: {
      token: {type: 'string'},
      userInfo: getSimpleUserInfoSchema(),
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

async function updateUserStatus(userID, status) {
  const schema = okSchema({
    type: "object",
    properties: {
        userInfo: getSimpleUserInfoSchema()
    },
    required: ["userInfo"]
  })
  const body = {id: userID, status}
  const url = '/wolf/user';
  await mocha.put({url, headers: adminHeaders(), body, status: 200, schema})
}

function getAddResponseSchema(values) {
  const applicationSchema = {
    type: "object",
    properties: {
        id: {"type":"string"},
        name: {"type":"string"},
        description: {"type":"string"},
        redirectUris: {"type":"array","items":{"type":"string"}},
        grants: {"type":"array","items":{"type":"string"}},
        accessTokenLifetime: {"type":"integer"},                                                                                                                                          refreshTokenLifetime: {"type":"integer"},
        createTime: {"type":"integer"},
        updateTime: {"type":"integer"}
    },
    required: ["id","name","description","redirectUris","grants","accessTokenLifetime","refreshTokenLifetime","createTime","updateTime"]
  }

  setDefaultOfSchema(applicationSchema, values, applicationSchema.required)
  const schema = okSchema({
    type: "object",
    properties: {
        application: applicationSchema
    },
    required: ["application"]
  })
  return schema
}


async function addApplication(body, headers) {
  const url = '/wolf/application';
  await mocha.post({url, headers, body})
}

async function deleteApplication(appID, headers) {
  const body = {id: appID}
  const url = '/wolf/application';
  await mocha.delete({url, headers, body})
}

async function addPermission(body, headers) {
  const url = '/wolf/permission';
  await mocha.post({url, headers, body})
}

async function deletePermission(permID, appID, headers) {
  const body = {id: permID, appID}
  const url = '/wolf/permission';
  await mocha.delete({url, headers, body})
}

function getRbacCookie(cookies) {
  let cookie = '';
  if(cookies && cookies.length > 0) {
    cookie = cookies[0]
    const regex = new RegExp('x-rbac-token=[^;]*')
    const arr = regex.exec(cookie);
    if(arr) {
      cookie = arr[0]
    }
  }
  return cookie;
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
exports.setDefaultOfSchema = setDefaultOfSchema;
exports.defPassword = defPassword;
exports.adminHeaders = adminHeaders;
exports.updateUserStatus = updateUserStatus;
exports.getSimpleUserInfoSchema = getSimpleUserInfoSchema
exports.getUserInfoSchema = getUserInfoSchema;
exports.getRbacCookie = getRbacCookie;
exports.getAddResponseSchema = getAddResponseSchema;
exports.addApplication = addApplication;
exports.deleteApplication = deleteApplication;
exports.addPermission = addPermission;
exports.deletePermission = deletePermission;
