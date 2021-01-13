const mocha = require('./util/mocha')
const util = require('./util/util')

const headers = util.adminHeaders()

function getAddResponseSchema() {
  const schema = util.okSchema({
    type: 'object',
    properties: {
      userRole: {type: 'object'},
    },
    required: ['userRole'],
  })
  return schema
}

function getEmptyUserRoleSchema() {
  const dataSchema = {
    type: "object",
    properties: {
        userRole: {
            type: "object",
            properties: {
                userID: {"type":"integer"},
                appID: {"type":"string"},
                permIDs: {
                  "type":"array",
                  maxItems: 0,
                },
                roleIDs: {
                  "type":"array",
                  maxItems: 0,
                },
                createTime: {"type":"integer"}
            },
            required: ["userID","appID","permIDs","roleIDs","createTime"]
        }
    },
    required: ["userRole"]
  }
  return util.okSchema(dataSchema)
}

describe('user-role', function() {
  const appID = 'test-app-id-for-user-role'
  const userID = 10;
  const appIDs = [appID]
  const permIDs = ['PERM_USER_ROLE_PERM1', 'PERM_USER_ROLE_PERM2', 'PERM_USER_ROLE_PERM3']
  const roleIDs = ['PERM_USER_ROLE_ROLE1', 'PERM_USER_ROLE_ROLE2', 'PERM_USER_ROLE_ROLE3']
 
  before(async function() {
    this.timeout(30 * 1000)
    for (let appID of appIDs) {
      const application = {id: appID, name: appID, description: ''}
      await util.addApplication(application, headers)
    }
    for (let permID of permIDs) {
      await mocha.post({url: '/wolf/permission', headers, body: {id: permID, name: permID, appID}})
    }
    for (let roleID of roleIDs) {
      await mocha.post({url: '/wolf/role', headers, body: {id: roleID, name: roleID, appID}})
    }
  });

  it('set', async function() {
    const schema = getAddResponseSchema();
    const body = {userID, appID, permIDs: permIDs.slice(0,2), roleIDs: roleIDs.slice(0,2)}
    const url = '/wolf/user-role/set';
    await mocha.post({url, headers, body, schema})
  });

  it('set failed, appID not found', async function() {
    const schema = util.failSchema('ERR_APPLICATION_ID_NOT_FOUND', 'Application ID not found')
    const body = {userID, appID: 'not-exist-app-id', permIDs: permIDs.slice(0,2), roleIDs: roleIDs.slice(0,2)}
    const url = '/wolf/user-role/set';
    await mocha.post({url, headers, body, status: 400, schema})
  });

  it('set failed, permission id not found', async function() {
    const schema = util.failSchema('ERR_PERMISSION_ID_NOT_FOUND', 'Permission ID not found')
    const permIDs1 = permIDs.slice(0,2);
    permIDs1.push('not-exist-perm-id')
    const body = {userID, appID, permIDs: permIDs1}
    const url = '/wolf/user-role/set';
    await mocha.post({url, headers, body, status: 400, schema})
  });

  it('set failed, role id not found', async function() {
    const schema = util.failSchema('ERR_ROLE_ID_NOT_FOUND', 'Role ID not found')
    const roleIDs2 = roleIDs.slice(0,2);
    roleIDs2.push('not-exist-role-id')
    const body = {userID, appID, roleIDs: roleIDs2}
    const url = '/wolf/user-role/set';
    await mocha.post({url, headers, body, status: 400, schema})
  });

  it('set-update', async function() {
    const schema = getAddResponseSchema();
    const body = {userID, appID, permIDs, roleIDs}
    const url = '/wolf/user-role/set';
    await mocha.post({url, headers, body, schema})
  });


  it('get', async function() {
    const schema = getAddResponseSchema();
    const url = '/wolf/user-role/get'
    const args = {userID, appID}
    const res = await mocha.get({url, headers, args, schema})
  });

  it('get empty', async function() {
    const schema = getEmptyUserRoleSchema();
    const url = '/wolf/user-role/get'
    const args = {userID, appID: 'not-exist-app'}
    const res = await mocha.get({url, headers, args, schema})
  });


  after(async function() {
    const url = '/wolf/user-role';
    const body = {userID, appID}
    await mocha.delete({url, headers, body})

    for (let appID of appIDs) {
      await util.deleteApplication(appID, headers)
      await mocha.delete({url: '/wolf/permission/delete_by_app_id', headers, body: {appID}})
      await mocha.delete({url: '/wolf/role/delete_by_app_id', headers, body: {appID}})
    }
  });
});
