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
  const appID = 'role-test-app-id'
  const userID = 10;

  it('set', async function() {
    const schema = getAddResponseSchema();
    const permIDs = ['PERM_OK', 'PERM_02']
    const roleIDs = ['ROLE_01', 'ROLE_02']
    const body = {userID, appID, permIDs, roleIDs}

    const url = '/wolf/user-role/set';
    await mocha.post({url, headers, body, schema})
  });

  it('set-update', async function() {
    const schema = getAddResponseSchema();
    const permIDs = ['PERM_OK', 'PERM_02', 'PERM_UPDATE']
    const roleIDs = ['ROLE_01', 'ROLE_02', 'ROLE_UPDATE']
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
  });
});
