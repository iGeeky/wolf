
const mocha = require('./util/mocha')
const util = require('./util/util')
const config = require('../conf/config')
const { server, setLdapEntities } = require('../src/ldap/LDAPMockServer')
const { utils } = require('mocha')

const AuthType = {
  PASSWORD: 1,
  LDAP: 2,
}


const headers = util.adminHeaders()

function getListResponseSchema(minItems) {
  const schema = util.okSchema({
    type: "object",
    properties: {
        userInfos: {
            type: "array",
            items: {
                type: "object",
            }
        },
        total: {"type":"integer", "enum": [minItems]}
    },
    required: ["userInfos","total"]
  })
  return schema
}

function getLoginOptions(ldapEnums) {
  const ldapSchema = {
    type: "object",
    properties: {
      supported: {type: "boolean"},
      label: {"type":"string"},
      syncedFields: {"type": "array"},
    },
    required: ["supported","label", "syncedFields"]
  }
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
      ldap: ldapSchema,
    },
    required: ["password","ldap"]
  }
  if (ldapEnums) {
    util.setDefaultOfSchema(ldapSchema, ldapEnums, ["supported","label", "syncedFields"])
  }
  const schema = util.okSchema(dataSchema)
  return schema
}

function dynamic_clean_ldap_config() {
  config.ldapConfig = undefined
}


function dynamic_set_ldap_config() {
  config.ldapConfig = {
    label: 'Mock LDAP',
    url: 'ldap://127.0.0.1:1389',
    baseDn: 'dc=example,dc=org',
    adminDn: 'cn=admin,dc=example,dc=org',
    adminPassword: '123456',
    userIdBase: 10000 * 100, // wolf user id = ldap user id + userIdBase
    fieldsMap: { // key=wolf-fieldname, value=ldap-fieldname
      id: 'uidNumber',
      username: 'uid',
      nickname: 'dn',
      email: 'mail',
    },
  }
}

function dynamic_set_ldap_mock_entities() {
  const ldapObjects = [
    {
      dn: 'cn=admin,dc=example,dc=org',
      attributes: {
        uid: 'admin',
        cn: 'admin',
        objectClass: ['inetOrgPerson', 'posixAccount', 'top'],
        userPassword: '123456',
        uidNumber: 1000,
      },
    },
    {
      dn: 'cn=ldaptest,dc=example,dc=org',
      attributes: {
        uid: 'ldaptest',
        cn: ['ldaptest', 'test1'],
        mail: ['ldaptest@example.com', 'ldaptest2021@example.com'],
        objectClass: ['inetOrgPerson', 'posixAccount', 'top'],
        userPassword: '123456',
        uidNumber: 1002,
      },
    },
    {
      dn: 'cn=str-id,dc=example,dc=org',
      attributes: {
        uid: 'str-id',
        cn: 'str-id',
        objectClass: ['inetOrgPerson', 'posixAccount', 'top'],
        userPassword: '123456',
        uidNumber: 'not-int-id',
      },
    },
  ]
  setLdapEntities(ldapObjects)
}

describe('user', function() {
  let id = null;
  const username = 'ldaptest'
  const username2 = 'str-id'
  const password = '123456'
  const authType = AuthType.LDAP
  const appIDs = ['test-appid-for-user-test', 'test-appid-for-user-test2']

  before(async function() {
    await server.start(1389);
    for (let appID of appIDs) {
      const application = {id: appID, name: appID, description: ''}
      await util.addApplication(application, headers)
    }
  });

  it('ldap options, not supported', async function() {
    dynamic_clean_ldap_config()
    const schema = getLoginOptions({"supported":false,"label":"LDAP","syncedFields":[]})
    const args = {}
    const url = '/wolf/user/loginOptions';
    await mocha.get({url, headers, args, schema})
  });

  it('login failed, ldap config not found', async function() {
    const schema = util.failSchema('ERR_LDAP_CONFIG_NOT_FOUND');
    const username = 'user-not-found'
    const password = 'password'
    const body = {username, password, authType}
    const url = '/wolf/user/login';

    await mocha.post({url, headers, body, schema})
  });

  it('login failed, user not found', async function() {
    dynamic_set_ldap_config();
    const schema = util.failSchema('ERR_USER_NOT_FOUND');
    const username = 'user-not-found'
    const password = 'password'
    const body = {username, password, authType}
    const url = '/wolf/user/login';

    await mocha.post({url, headers, body, schema})
  });

  it('ldap options', async function() {
    const schema = getLoginOptions({
      "supported":true,"label":"Mock LDAP",
      "syncedFields":["id","username","nickname","email"]
    })
    const args = {}
    const url = '/wolf/user/loginOptions';
    await mocha.get({url, headers, args, schema})
  });

  it('login failed, password error', async function() {
    dynamic_set_ldap_config();
    dynamic_set_ldap_mock_entities()
    const schema = util.failSchema('ERR_PASSWORD_ERROR');
    const username = 'ldaptest'
    const password = 'password-error'
    const body = {username, password, authType}
    const url = '/wolf/user/login';

    await mocha.post({url, headers, body, schema})
  });

  it('login failed, server error', async function() {
    dynamic_set_ldap_config();
    dynamic_set_ldap_mock_entities()
    const schema = util.failSchema('ERR_SERVER_ERROR');
    const username = 'server-error'
    const password = 'password'
    const body = {username, password, authType}
    const url = '/wolf/user/login';

    await mocha.post({url, headers, body, schema})
  });

  it('login success', async function() {
    dynamic_set_ldap_config();
    dynamic_set_ldap_mock_entities()
    var schema = util.failSchema('ERR_ACCESS_DENIED');
    var body = {username, password, authType}
    const url_login = '/wolf/user/login';
    await mocha.post({url: url_login, headers, body, schema, status: 403})
    // query user by name
    var schema = getListResponseSchema(1)
    const res = await mocha.get({url: '/wolf/user/list', headers, args: {key: username}, schema})
    var userInfo = res.body.data.userInfos[0]
    id = userInfo.id

    // change user manager role and appIds
    const url_update_user = "/wolf/user"
    const appid = appIDs[0];
    var body = {id: userInfo.id, manager: 'admin', appIDs: [appid]}
    var schema = util.okSchema()
    await mocha.put({url: url_update_user, headers, body, schema})

    // loign success
    var body = {username, password, authType}
    var schema = util.okSchema()
    await mocha.post({url: url_login, headers, body, schema})
  });

  it('login success, str id', async function() {
    dynamic_set_ldap_config();
    dynamic_set_ldap_mock_entities()
    var schema = util.failSchema('ERR_ACCESS_DENIED');
    var body = {username: username2, password, authType}
    const url_login = '/wolf/user/login';
    await mocha.post({url: url_login, headers, body, schema, status: 403})
  });

  it('reset password failed', async function() {
    if(!id) {
      this.skip();
    }
    const schema = util.failSchema('ERR_NOT_ALLOWED_RESET_PWD')
    const body = { id }
    const url = '/wolf/user/reset_pwd';
    const res = await mocha.put({url, headers: util.adminHeaders(), body, schema, status: 400})
  });

  it('login by password failed', async function() {
    if(!id) {
      this.skip();
    }
    const url_login = '/wolf/user/login';
    const schema = util.failSchema('ERR_USER_NOT_FOUND')
    var body = {username, password, authType: 1}
    await mocha.post({url: url_login, headers, body, schema})
  });

  it('agent login success', async function() {
    if(!id) {
      this.skip();
    }

    const schema = util.okSchema()
    const appid = appIDs[0];
    var body = {username, password, authType, appid}
    const url_login = '/wolf/rbac/login.rest';
    await mocha.post({url: url_login, headers, body, schema})
  });

  it('disable user, login failed', async function() {
    if(!id) {
      this.skip();
    }
    await util.updateUserStatus(id, -1)

    const schema = util.failSchema('ERR_USER_DISABLED')
    var body = {username, password, authType}
    const url_login = '/wolf/user/login';
    await mocha.post({url: url_login, headers, body, schema})
  });

  it('disable user, agent login failed', async function() {
    if(!id) {
      this.skip();
    }
    await util.updateUserStatus(id, -1)

    const schema = util.failSchema('ERR_USER_DISABLED')
    const appid = appIDs[0];
    var body = {username, password, authType, appid}
    const url_login = '/wolf/rbac/login.rest';
    await mocha.post({url: url_login, headers, body, schema})
  });

  after(async function() {
    for (let appID of appIDs) {
      await util.deleteApplication(appID, headers)
    }
    const schema = util.okSchema({type: 'object'});
    for (let tmpUsername of [username, username2]) {
      const body = {username: tmpUsername}
      const url = '/wolf/user';
      await mocha.delete({url, headers, body, schema})
    }
    server.stop()
  });
});
