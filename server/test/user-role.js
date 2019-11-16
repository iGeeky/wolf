const mocha = require('./util/mocha')
const util = require('./util/util')

const headers = util.adminHeaders()

function getAddResponseSchema() {
  const schema = util.okSchema({
    type: 'object',
    properties: {
      user_role: {type: 'object'},
    },
    required: ['user_role'],
  })
  return schema
}

const userId = 10;

describe('user-role', function() {
  it('set', async function() {
    const schema = getAddResponseSchema();
    const appId = 'test-application-id'
    const permIds = ['PERM_OK', 'PERM_02']
    const roleIds = ['ROLE_01', 'ROLE_02']
    const body = {userID: userId, appID: appId, permIDs: permIds, roleIDs: roleIds}

    const url = '/api/v1/user-role/set';
    await mocha.post({url, headers, body, schema})
  });

  it('set-update', async function() {
    const schema = getAddResponseSchema();
    const appId = 'test-application-id'
    const permIds = ['PERM_OK', 'PERM_02', 'PERM_UPDATE']
    const roleIds = ['ROLE_01', 'ROLE_02', 'ROLE_UPDATE']
    const body = {userID: userId, appID: appId, permIDs: permIds, roleIDs: roleIds}

    const url = '/api/v1/user-role/set';
    await mocha.post({url, headers, body, schema})
  });


  it('get', async function() {
    const schema = getAddResponseSchema();
    const url = '/api/v1/user-role/get'
    const appId = 'test-application-id'
    const args = {userID: userId, appID: appId}
    const res = await mocha.get({url, headers, args, schema})
  });


  after(async function() {
    const url = '/api/v1/user-role/delete';
    const appId = 'test-application-id'
    const body = {userID: userId, appID: appId}
    await mocha.post({url, headers, body})
  });
});
