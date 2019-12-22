const mocha = require('./util/mocha')
const util = require('./util/util')
const rbacUtil = require('./init/0-rbac-util')
const policyFileName = './test/init/0-rbac-data-unittest.md'
const data = rbacUtil.rbacDataRead(policyFileName)
const argv = require('minimist')(process.argv.slice(2));

describe('rbac', function() {
  const password = 'd22f6718ff24'
  const appID = data.applications[0].id
  // describe('rbac-init', function() {
  //   const opts = { quiet: true }
  //   rbacUtil.rbacInit(data, password, opts)
  // })

  describe('diagram', function() {
    const headers = util.adminHeaders()
    it('diagram', async function() {
      const schema = util.okSchema()
      const url = '/api/v1/application/diagram'
      const args = {id: appID}
      await mocha.get({url, headers, args, schema})
    });

    it('diagram not found', async function() {
      const schema = util.failSchema('ERR_OBJECT_NOT_FOUND')
      const url = '/api/v1/application/diagram'
      const args = {id: 'not-exist-app-id'}
      await mocha.get({url, headers, args, schema})
    });
  });

  describe('agent restful api', function() {
    const headers = {}
    const newPassword = '123456'
    it('change password failed, login required', async function() {
      const url = '/api/v1/rbac/change_pwd.rest'
      const body = {}
      const options = {url, headers, body}
      if (argv.server) {
        options.status = 200;
        options.match = 'Login Required'
      } else {
        options.status = 302;
      }
      await mocha.post(options) 
    });

    it('login failed, username missing', async function() {
      const schema = util.failSchema('ERR_USERNAME_MISSING')
      const url = '/api/v1/rbac/login.rest'
      const body = {}
      await mocha.post({url, headers, body, schema})
    });

    it('login failed, password missing', async function() {
      const schema = util.failSchema('ERR_PASSWORD_MISSING')
      const url = '/api/v1/rbac/login.rest'
      const body = {username: 'unit-user'}
      await mocha.post({url, headers, body, schema})
    });

    it('login failed, user not found', async function() {
      const schema = util.failSchema('ERR_USER_NOT_FOUND')
      const url = '/api/v1/rbac/login.rest'
      const body = {username: 'not-exist-user', password}
      await mocha.post({url, headers, body, schema})
    });

    it('login failed, password error', async function() {
      const schema = util.failSchema('ERR_PASSWORD_ERROR')
      const url = '/api/v1/rbac/login.rest'
      const body = {username: 'unit-user', password: 'password error'}
      await mocha.post({url, headers, body, schema})
    });

    it('login success', async function() {
      const dataSchema = {
        type: "object",
        properties: {
            userInfo: {
                type: "object",
                properties: {"id":{"type":"string"},"username":{"type":"string"},"nickname":{"type":"string"}},
                required: ["id","username","nickname"]
            },
            token: {type: "string"}
        },
        required: ["userInfo", "token"]
      }
      const schema = util.okSchema(dataSchema)
      const url = '/api/v1/rbac/login.rest'
      const body = {username: 'unit-user', password}
      const res = await mocha.post({url, headers, body, schema})
      const token = res.body.data.token;
      headers['x-rbac-token'] = token;
    });

    it('change password failed, old password missing', async function() {
      const schema = util.failSchema('ERR_OLD_PASSWORD_REQUIRED')
      const url = '/api/v1/rbac/change_pwd.rest'
      const body = {}
      await mocha.post({url, headers, body, schema})
    });

    it('change password failed, new password missing', async function() {
      const schema = util.failSchema('ERR_NEW_PASSWORD_REQUIRED')
      const url = '/api/v1/rbac/change_pwd.rest'
      const body = {old_password: '123456'}
      await mocha.post({url, headers, body, schema})
    });

    it('change password failed, repeat password incorrect', async function() {
      const schema = util.failSchema('ERR_REPEATED_PASSWORD_INCORRECT')
      const url = '/api/v1/rbac/change_pwd.rest'
      const body = {old_password: '123456', new_password: '123456', re_new_password: 'abcdef'}
      await mocha.post({url, headers, body, schema})
    });

    it('change password failed, old password incorrect', async function() {
      const schema = util.failSchema('ERR_OLD_PASSWORD_INCORRECT')
      const url = '/api/v1/rbac/change_pwd.rest'
      const body = {old_password: '123456', new_password: '123456', re_new_password: '123456'}
      await mocha.post({url, headers, body, schema})
    });

    it('change password success', async function() {
      const schema = util.okSchema()
      const url = '/api/v1/rbac/change_pwd.rest'
      const body = {old_password: password, new_password: newPassword, re_new_password: newPassword}
      await mocha.post({url, headers, body, schema})
    });

    it('old password login failed', async function() {
      const schema = util.failSchema('ERR_PASSWORD_ERROR')
      const url = '/api/v1/rbac/login.rest'
      const body = {username: 'unit-user', password: password}
      await mocha.post({url, headers, body, schema})
    });

    it('new password login success', async function() {
      const schema = util.okSchema()
      const url = '/api/v1/rbac/login.rest'
      const body = {username: 'unit-user', password: newPassword}
      await mocha.post({url, headers, body, schema})
    });

    it('change password to original', async function() {
      const schema = util.okSchema()
      const url = '/api/v1/rbac/change_pwd.rest'
      const body = {old_password: newPassword, new_password: password, re_new_password: password}
      await mocha.post({url, headers, body, schema})
    });
  });

  describe('agent page login', function() {
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
      const url = '/api/v1/rbac/login'
      const args = {username: 'root', password: '123456'}
      const res = await mocha.get({url, headers, args, status: 200, match: 'form.*/api/v1/rbac/login'})
      // console.log(res.text)
    });

    it('login failed, username missing', async function() {
      const url = '/api/v1/rbac/login.post'
      const body = {}
      await mocha.post({url, headers, body, match: 'Username missing'})
    });

    it('login failed, password missing', async function() {
      const url = '/api/v1/rbac/login.post'
      const body = {username: 'unit-user'}
      await mocha.post({url, headers, body, match: ['Password missing', 'RBAC Login']})
    });

    it('login failed, user not found', async function() {
      const url = '/api/v1/rbac/login.post'
      const body = {username: 'not-exist-user', password}
      await mocha.post({url, headers, body, match: 'User not found'})
    });

    it('login failed, password error', async function() {
      const url = '/api/v1/rbac/login.post'
      const body = {username: 'unit-user', password: 'password error'}
      await mocha.post({url, headers, body, match: 'Password error'})
    });

    it('login success', async function() {
      const url = '/api/v1/rbac/login.post'
      const body = {username: 'unit-user', password}
      const res = await mocha.post({url, headers, body, status: 302})
      const cookie = getCookie(res.headers['set-cookie'])
      headers['Cookie'] = cookie;
    });

    it('index', async function() {
      const url = '/api/v1/rbac/index'
      const args = {}
      await mocha.get({url, headers, args, status: 200, match: 'index'})
    });

    it('change password render', async function() {
      const url = '/api/v1/rbac/change_pwd'
      const args = {}
      await mocha.get({url, headers, args, status: 200, match: 'Change Password'})
    });

    it('change password failed, old password missing', async function() {
      const url = '/api/v1/rbac/change_pwd.post'
      const body = {}
      await mocha.post({url, headers, body, match: 'Old password is required'})
    });

    it('change password failed, new password missing', async function() {
      const url = '/api/v1/rbac/change_pwd.post'
      const body = {old_password: '123456'}
      await mocha.post({url, headers, body, match: 'New password is required'})
    });

    it('change password failed, repeat password incorrent', async function() {
      const url = '/api/v1/rbac/change_pwd.post'
      const body = {old_password: '123456', new_password: '123456', re_new_password: 'abcdef'}
      await mocha.post({url, headers, body, match: 'The password you entered repeatedly is incorrect'})
    });
    
    it('change password failed, Old password is incorrect', async function() {
      const url = '/api/v1/rbac/change_pwd.post'
      const body = {old_password: 'error-password', new_password: newPassword, re_new_password: newPassword}
      await mocha.post({url, headers, body, match: 'Old password is incorrect'})
    });

    it('change password success', async function() {
      const url = '/api/v1/rbac/change_pwd.post'
      const body = {old_password: password, new_password: newPassword, re_new_password: newPassword}
      await mocha.post({url, headers, body, match: 'change password successfully'})
    });

    it('change password to original success', async function() {
      const url = '/api/v1/rbac/change_pwd.post'
      const body = {old_password: newPassword, new_password: password, re_new_password: password}
      await mocha.post({url, headers, body, match: 'change password successfully'})
    });

    it('logout', async function() {
      const url = '/api/v1/rbac/logout'
      const body = {}
      await mocha.post({url, headers, body, status: 302})
    });
  });

  // describe('rbac-destroy', function() {
  //   rbacUtil.rbacDestroy(data)
  // });
})
