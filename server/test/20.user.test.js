
const mocha = require('./util/mocha')
const util = require('./util/util')

const headers = util.adminHeaders()

function getAddResponseSchema() {
  const schema = util.okSchema({
    type: "object",
    properties: {
        password: {"type":"string"},
        userInfo: util.getSimpleUserInfoSchema()
    },
    required: ["userInfo"]
  })
  return schema
}

function getUserInfoResponseSchema() {
  const schema = util.okSchema({
    type: "object",
    properties: {
        applications: {"type":"array", "items": { "type":"object"}},
        userInfo: util.getSimpleUserInfoSchema()
    },
    required: ["userInfo", "applications"]
  })
  return schema
}

function getListResponseSchema() {
  const schema = util.okSchema({
    type: "object",
    properties: {
        userInfos: {
            type: "array",
            items: {
                type: "object",
                required: [
                    "id",
                    "username",
                    "nickname",
                    "email",
                    "tel",
                    "password",
                    "appIDs",
                    "manager",
                    "status",
                    "lastLogin",
                    "profile",
                    "createTime",
                    "updateTime"
                ]
            }
        },
        total: {"type":"integer"}
    },
    required: ["userInfos","total"]
  })
  return schema
}

describe('user', function() {
  let id = null;
  let rootUserInfo = null;
  const username = 'test-user-username'
  it('login failed, not found', async function() {
    const schema = util.failSchema('ERR_USER_NOT_FOUND');
    const username = 'user-not-found'
    const password = 'password'
    const body = {username, password}
    const url = '/wolf/user/login';

    await mocha.post({url, headers, body, schema})
  });

  it('login failed, password error', async function() {
    const schema = util.failSchema('ERR_PASSWORD_ERROR');
    const username = 'root'
    const password = 'error-password'
    const body = {username, password}
    const url = '/wolf/user/login';
    await mocha.post({url, headers, body, schema})
  });

  it('root info', async function() {
    const schema = getUserInfoResponseSchema()
    const url = '/wolf/user/info';
    const args = {}
    const res = await mocha.get({url, headers, args, schema})
    rootUserInfo = res.body.data.userInfo
  });

  it('failed to disable root user', async function() {
    if (!rootUserInfo) {
      this.skip()
    }
    const schema = util.failSchema('ERR_ACCESS_DENIED')
    const body = rootUserInfo
    body.status = -1
    const url = '/wolf/user';
    await mocha.put({url, headers, body, status: 401, schema})
  });

  it('add', async function() {
    const schema = getAddResponseSchema();
    const nickname = 'test-user-nickname'
    const email = 'test001@company.com'
    const tel = '13012341234'
    const appIds = ['ROOT', 'TEST']
    const body = {username, nickname, email, tel, appIDs: appIds, password: util.defPassword()}
    const url = '/wolf/user';
    const res = await mocha.post({url, headers, body, schema})
    id = res.body.data.userInfo.id
  });

  it('update', async function() {
    if (!id) {
      this.skip()
    }
    const schema = getAddResponseSchema();
    const nickname = 'test-user-nickname: updated'
    const email = 'test001.update.@company.com'
    const tel = '13012341234'
    const appIds = ['ROOT', 'TEST']
    const body = {id, username, nickname, email, tel, appIDs: appIds, password: util.defPassword()}
    const url = '/wolf/user';
    await mocha.put({url, headers, body, schema})
  });

  it('update failed, user not found', async function() {
    const schema = util.failSchema('ERR_USER_NOT_FOUND')
    const nickname = 'test-user-nickname: updated'
    const email = 'test001.update.@company.com'
    const tel = '13012341234'
    const appIds = ['ROOT', 'TEST']
    const body = {id: 999999999999, username, nickname, email, tel, appIDs: appIds}
    const url = '/wolf/user';
    await mocha.put({url, headers, body, status: 400, schema})
  });


  it('delete by username failed, not found', async function() {
    const schema = util.failSchema('ERR_USER_NOT_FOUND');
    const username = 'not-exist-username'
    const body = {username}
    const url = '/wolf/user';
    await mocha.delete({url, headers, body, schema})
  });

  it('delete by id failed, not found', async function() {
    const schema = util.failSchema('ERR_USER_NOT_FOUND');
    const id = 99999999999
    const body = {id}
    const url = '/wolf/user';
    const res = await mocha.delete({url, headers, body, schema})
  });

  it('delete root user failed, permission denied', async function() {
    const schema = util.failSchema('ERR_PERMISSION_DENY');
    const username = 'root'
    const body = {username}
    const url = '/wolf/user';
    const res = await mocha.delete({url, headers, body, status:401, schema})
  });

  it('list', async function() {
    const schema = getListResponseSchema()
    const url = '/wolf/user/list'
    const args = {key: username}
    await mocha.get({url, headers, args, schema})
  });

  describe('admin test', function() {
    let userInfo = null;
    const headers = Object.assign({}, util.adminHeaders())
    const username = 'admin-user-002'
    let userID = null;
    const password = util.defPassword()
    let newPassword = null;

    it('add admin user', async function() {
      const schema = getAddResponseSchema();
      const nickname = username
      const email = username + '@company.com'
      const tel = '13011003300'
      const appIDs = ['test-app-id']
      const manager = 'admin'
      const body = {username, nickname, email, tel, appIDs, manager, password}
      const url = '/wolf/user';
      const res = await mocha.post({url, headers: util.adminHeaders(), body, status: 200, schema})
      userID = res.body.data.userInfo.id
    });

    it('disable admin', async function() {
      if(!userID) {
        this.skip();
      }
      await util.updateUserStatus(userID, -1)
    });

    it('admin login failed, disabled', async function() {
      const schema = util.failSchema('ERR_USER_DISABLED')
      const body = { username, password}
      const url = `/wolf/user/login`;
      await mocha.post({url, headers, body, schema})
    });

    it('enable admin', async function() {
      if(!userID) {
        this.skip();
      }
      await util.updateUserStatus(userID, 0)
    });

    it('admin login success', async function() {
      const schema = util.okSchema()
      const body = { username, password}
      const url = `/wolf/user/login`;
      const res = await mocha.post({url, headers, body, status: 200, schema})
      headers['x-rbac-token'] = res.body.data.token
    });

    it('admin user info', async function() {
      const schema = getUserInfoResponseSchema()
      const args = { }
      const url = `/wolf/user/info`;
      const res = await mocha.get({url, headers, args, status: 200, schema})
    });

    it('disable admin', async function() {
      if(!userID) {
        this.skip();
      }
      await util.updateUserStatus(userID, -1)
    });

    it('admin user info failed, disabled', async function() {
      const schema = util.failSchema('ERR_ACCESS_DENIED')
      const args = { }
      const url = `/wolf/user/info`;
      const res = await mocha.get({url, headers, args, status: 401, schema})
    });

    it('enable admin', async function() {
      if(!userID) {
        this.skip();
      }
      await util.updateUserStatus(userID, 0)
    });

    it('delete admin user failed, access deny', async function() {
      const schema = util.failSchema('ERR_ACCESS_DENIED');
      const body = { id: 'id-not-exist' }
      const url = `/wolf/user`;
      await mocha.delete({url, headers, body, status: 401, schema})
    });

    it('set roles failed!, access deny', async function() {
      const schema = util.failSchema('ERR_ACCESS_DENIED');
      const permIDs = ['PERM_OK', 'PERM_02']
      const roleIDs = ['ROLE_01', 'ROLE_02']
      const appID = 'not-exist-app-id'
      const body = {userID, appID, permIDs, roleIDs}

      const url = '/wolf/user-role/set';
      await mocha.post({url, headers, body, status: 401, schema})
    });

    it('reset admin password', async function() {
      const schema = util.okSchema()
      const body = { id: userID }
      const url = '/wolf/user/reset_pwd';
      const res = await mocha.post({url, headers: util.adminHeaders(), body, schema})
      newPassword = res.body.data.password
    });

    it('new password login success', async function() {
      if(!newPassword) {
        this.skip()
      }
      const schema = util.okSchema()
      const body = { username, password: newPassword}
      const url = `/wolf/user/login`;
      await mocha.post({url, headers, body, status: 200, schema})
    });

    it('old password login failed', async function() {
      if(!newPassword) {
        this.skip()
      }
      const schema = util.failSchema('ERR_PASSWORD_ERROR')
      const body = { username, password}
      const url = `/wolf/user/login`;
      await mocha.post({url, headers, body, status: 200, schema})
    });

    after(async function() {
      const schema = util.okSchema({type: 'object'});
      const body = {username}
      const url = '/wolf/user';
      await mocha.delete({url, headers: util.adminHeaders(), body, schema})
    });
  });

  after(async function() {
    const username = 'test-user-username'
    const schema = util.okSchema({type: 'object'});
    const body = {username}
    const url = '/wolf/user';
    await mocha.delete({url, headers, body, schema})
  });
});


