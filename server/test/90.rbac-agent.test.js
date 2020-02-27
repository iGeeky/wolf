const mocha = require('./util/mocha')
const util = require('./util/util')
const rbacUtil = require('./init/0-rbac-util')
const policyFileName = './test/init/0-rbac-data-unittest.md'
const data = rbacUtil.rbacDataRead(policyFileName)
const argv = require('minimist')(process.argv.slice(2))

function userInfoSchema() {
  const schema = {
    type: 'object',
    properties: {
      id: { 'type': 'integer' },
      username: { 'type': 'string' },
      nickname: { 'type': 'string' },
      email: { 'type': ['string', 'null'] },
      appIDs: { 'type': 'array', minItems: 1 },
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
  const schema = util.okSchema(dataSchema)
  return schema;
}

function getLoginSuccessSchema() {
  const dataSchema = {
    type: 'object',
    properties: {
      userInfo: {
        type: 'object',
        properties: { 'id': { 'type': 'integer' }, 'username': { 'type': 'string' }, 'nickname': { 'type': 'string' }},
        required: ['id', 'username', 'nickname'],
      },
      token: { type: 'string' },
    },
    required: ['userInfo', 'token'],
  }
  const schema = util.okSchema(dataSchema)
  return schema
}

function get302Status(matchOn200) {
  const options = {}
  if (argv.server) {
    // for chai-http.
    options.status = 200
    options.match = matchOn200
  } else {
    // for supertest
    options.status = 302
  }
  return options
}

describe('rbac', function() {
  const password = 'd22f6718ff24'
  const appID = data.applications[0].id

  if (argv.rbacInit) {
    const opts = { quiet: true }
    rbacUtil.rbacInit(data, password, opts)
    process.exit(0)
  }

  if (argv.rbacDestroy) {
    rbacUtil.rbacDestroy(data)
  }

  describe('rbac-init', function() {
    const opts = { quiet: true }
    rbacUtil.rbacInit(data, password, opts)
  })

  describe('diagram', function() {
    const headers = util.adminHeaders()
    it('diagram', async function() {
      const schema = util.okSchema()
      const url = '/wolf/application/diagram'
      const args = {id: appID}
      await mocha.get({url, headers, args, schema})
    });

    it('diagram not found', async function() {
      const schema = util.failSchema('ERR_OBJECT_NOT_FOUND')
      const url = '/wolf/application/diagram'
      const args = {id: 'not-exist-app-id'}
      await mocha.get({url, headers, args, schema})
    });
  });

  describe('agent restful api', function() {
    const headers = {}
    let userID = null;
    const newPassword = '123456'
    it('change password failed, login required', async function() {
      const url = '/wolf/rbac/change_pwd'
      const body = {}
      const options = Object.assign({url, headers, body, status: 401})
      await mocha.post(options)
    });

    it('login failed, username missing', async function() {
      const schema = util.failSchema('ERR_USERNAME_MISSING')
      const url = '/wolf/rbac/login'
      const body = {}
      await mocha.post({url, headers, body, schema})
    });

    it('login failed, password missing', async function() {
      const schema = util.failSchema('ERR_PASSWORD_MISSING')
      const url = '/wolf/rbac/login'
      const body = {username: 'unit-user'}
      await mocha.post({url, headers, body, schema})
    });

    it('login failed, appid missing', async function() {
      const schema = util.failSchema('ERR_APPID_MISSING')
      const url = '/wolf/rbac/login'
      const body = {username: 'unit-user', password}
      await mocha.post({url, headers, body, schema})
    });

    it('login failed, user not found', async function() {
      const schema = util.failSchema('ERR_USER_NOT_FOUND')
      const url = '/wolf/rbac/login'
      const body = {username: 'not-exist-user', password, appid: appID}
      await mocha.post({url, headers, body, schema})
    });

    it('login failed, password error', async function() {
      const schema = util.failSchema('ERR_PASSWORD_ERROR')
      const url = '/wolf/rbac/login'
      const body = {username: 'unit-user', password: 'password error', appid: appID}
      await mocha.post({url, headers, body, schema})
    });

    it('login success', async function() {
      const schema = getLoginSuccessSchema();
      const url = '/wolf/rbac/login'
      const body = {username: 'unit-user', password, appid: appID}
      const res = await mocha.post({url, headers, body, status: 200, schema})
      const token = res.body.data.token;
      userID = res.body.data.userInfo.id
      headers['x-rbac-token'] = token;
    });


    it('get userInfo success', async function() {
      const schema = getUserInfoSchema()
      const url = '/wolf/rbac/user_info'
      const args = {}
      await mocha.get({url, headers, args, schema})
    });

    it('disable unittest', async function() {
      if(!userID) {
        this.skip();
      }
      await util.updateUserStatus(userID, -1)
    });

    it('get userInfo failed, user is disabled', async function() {
      const schema = util.failSchema('ERR_TOKEN_INVALID')
      const url = '/wolf/rbac/user_info'
      const args = {}
      await mocha.get({url, headers, args, status: 401, schema})
    });

    it('enable unittest', async function() {
      if(!userID) {
        this.skip();
      }
      await util.updateUserStatus(userID, 0)
    });

    it('change password failed, old password missing', async function() {
      const schema = util.failSchema('ERR_OLD_PASSWORD_REQUIRED')
      const url = '/wolf/rbac/change_pwd'
      const body = {}
      await mocha.post({url, headers, body, schema})
    });

    it('change password failed, new password missing', async function() {
      const schema = util.failSchema('ERR_NEW_PASSWORD_REQUIRED')
      const url = '/wolf/rbac/change_pwd'
      const body = {oldPassword: '123456'}
      await mocha.post({url, headers, body, schema})
    });

    it('change password failed, old password incorrect', async function() {
      const schema = util.failSchema('ERR_OLD_PASSWORD_INCORRECT')
      const url = '/wolf/rbac/change_pwd'
      const body = {oldPassword: '123456', newPassword: '123456', reNewPassword: '123456'}
      await mocha.post({url, headers, body, schema})
    });

    it('change password success', async function() {
      const schema = util.okSchema()
      const url = '/wolf/rbac/change_pwd'
      const body = {oldPassword: password, newPassword: newPassword, reNewPassword: newPassword}
      await mocha.post({url, headers, body, schema})
    });

    it('old password login failed', async function() {
      const schema = util.failSchema('ERR_PASSWORD_ERROR')
      const url = '/wolf/rbac/login'
      const body = {username: 'unit-user', password: password, appid: appID}
      await mocha.post({url, headers, body, schema})
    });

    it('new password login success', async function() {
      const schema = getLoginSuccessSchema();
      const url = '/wolf/rbac/login'
      const body = {username: 'unit-user', password: newPassword, appid: appID}
      await mocha.post({url, headers, body, schema})
    });

    it('change password to original', async function() {
      const schema = util.okSchema()
      const url = '/wolf/rbac/change_pwd'
      const body = {oldPassword: newPassword, newPassword: password, reNewPassword: password}
      await mocha.post({url, headers, body, schema})
    });


    it('disable unittest', async function() {
      if(!userID) {
        this.skip();
      }
      await util.updateUserStatus(userID, -1)
    });

    it('login failed, user is disabled', async function() {
      const schema = util.failSchema('ERR_USER_DISABLED')
      const url = '/wolf/rbac/login'
      const body = {username: 'unit-user', password, appid: appID}
      await mocha.post({url, headers, body,  schema})
    });

    it('enable unittest', async function() {
      if(!userID) {
        this.skip();
      }
      await util.updateUserStatus(userID, 0)
    });

  });

  describe('agent page', function() {
    const headers = {redirects: 0}
    const newPassword = '123456'

    function getCookie(cookies) {
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
    it('login render', async function() {
      const url = '/wolf/rbac/login.html'
      const args = {username: 'root', password: '123456', appid: appID}
      const res = await mocha.get({url, headers, args, status: 200, match: 'form.*/wolf/rbac/login'})
      // console.log(res.text)
    });

    it('login failed, username missing', async function() {
      const url = '/wolf/rbac/login.post'
      const body = {}
      await mocha.post({url, headers, body, match: 'Username missing'})
    });

    it('login failed, password missing', async function() {
      const url = '/wolf/rbac/login.post'
      const body = {username: 'unit-user'}
      await mocha.post({url, headers, body, match: ['Password missing', 'RBAC Login']})
    });

    it('login failed, user not found', async function() {
      const url = '/wolf/rbac/login.post'
      const body = {username: 'not-exist-user', password, appid: appID}
      await mocha.post({url, headers, body, match: 'User not found'})
    });

    it('login failed, password error', async function() {
      const url = '/wolf/rbac/login.post'
      const body = {username: 'unit-user', password: 'password error', appid: appID}
      await mocha.post({url, headers, body, match: 'Password error'})
    });

    it('login success', async function() {
      const url = '/wolf/rbac/login.post'
      const body = {username: 'unit-user', password, appid: appID}
      const res = await mocha.post({url, headers, body, status: 302})
      const cookie = getCookie(res.headers['set-cookie'])
      headers['Cookie'] = cookie;
    });

    it('index', async function() {
      const url = '/wolf/rbac/index'
      const args = {}
      await mocha.get({url, headers, args, status: 200, match: 'index'})
    });

    it('change password render', async function() {
      const url = '/wolf/rbac/change_pwd.html'
      const args = {}
      await mocha.get({url, headers, args, status: 200, match: 'Change Password'})
    });

    it('no permission page', async function() {
      const url = '/wolf/rbac/no_permission.html'
      const args = {username: 'test', reason: 'no permission to access this page.'}
      await mocha.get({url, headers, args, status: 200, match: args.reason})
    });

    it('change password failed, old password missing', async function() {
      const url = '/wolf/rbac/change_pwd.post'
      const body = {}
      await mocha.post({url, headers, body, match: 'Old password is required'})
    });

    it('change password failed, new password missing', async function() {
      const url = '/wolf/rbac/change_pwd.post'
      const body = {oldPassword: '123456'}
      await mocha.post({url, headers, body, match: 'New password is required'})
    });

    it('change password failed, repeat password incorrent', async function() {
      const url = '/wolf/rbac/change_pwd.post'
      const body = {oldPassword: '123456', newPassword: '123456', reNewPassword: 'abcdef'}
      await mocha.post({url, headers, body, match: 'The password you entered repeatedly is incorrect'})
    });

    it('change password failed, Old password is incorrect', async function() {
      const url = '/wolf/rbac/change_pwd.post'
      const body = {oldPassword: 'error-password', newPassword: newPassword, reNewPassword: newPassword}
      await mocha.post({url, headers, body, match: 'Old password is incorrect'})
    });

    it('change password success', async function() {
      const url = '/wolf/rbac/change_pwd.post'
      const body = {oldPassword: password, newPassword: newPassword, reNewPassword: newPassword}
      await mocha.post({url, headers, body, match: 'change password successfully'})
    });

    it('change password to original success', async function() {
      const url = '/wolf/rbac/change_pwd.post'
      const body = {oldPassword: newPassword, newPassword: password, reNewPassword: password}
      await mocha.post({url, headers, body, match: 'change password successfully'})
    });

    it('logout', async function() {
      const url = '/wolf/rbac/logout'
      const body = {}
      await mocha.post({url, headers, body, status: 302})
    });
  });

  describe('rbac policy test', function() {
    const repeat = argv.repeat || 1
    this.timeout(1000*600)
    for (const access of data.accesses) {
      const username = access.username;
      const accessCheckUrl = '/wolf/rbac/access_check'
      describe(`user ${username}`, function() {
        const headers = {}
        let token = null;
        const actions = access.actions;
        it(`login`, async function(){
          const schema = getLoginSuccessSchema();
          const url = '/wolf/rbac/login'
          const body = {username, password, appid: appID}
          const res = await mocha.post({url, headers, body, schema})
          token = res.body.data.token;
          headers['x-rbac-token'] = token;
        })
        if (actions && actions.length > 0) {
          for (const actionInfo of actions) {
            const {method, url: resName, status} = actionInfo;
            it(`access [${method} ${resName}] expected status ${status}`, async function(){
              if(!token) {
                this.skip();
              }
              const action = method;
              const ip = '192.168.168.168'
              const args = {appID, action, resName, ip}
              for(let i=0; i< repeat; i++) {
                await mocha.get({url: accessCheckUrl, headers, args, status})
              }
            })
          }
        }
        it(`logout`, async function(){
          const url = '/wolf/rbac/logout'
          const body = {}
          const options = Object.assign({url, headers, body}, get302Status('RBAC Login'))
          await mocha.post(options)
        })
      });
    }
  });

  describe('rbac-destroy', function() {
    rbacUtil.rbacDestroy(data)
  });
})

