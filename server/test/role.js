
const mocha = require('./util/mocha')
const util = require('./util/util')

const headers = util.adminHeaders()

function getAddResponseSchema() {
  const schema = util.okSchema({
    type: 'object',
    properties: {
      role: {type: 'object'},
    },
    required: ['role'],
  })
  return schema
}

function getListResponseSchema() {
  const schema = util.okSchema({
    type: 'object',
    properties: {
      roles: {
        type: 'array',
        items: {
          type: 'object',
        },
      },
      total: {type: 'integer'},
    },
    required: ['roles', 'total'],
  })
  return schema
}

// const role = null;

describe('role', function() {
  it('add', async function() {
    const schema = getAddResponseSchema();
    const id = 'test-role-id'
    const name = 'test-role-name'
    const description = 'The Test Role'
    const appId = 'test-application-id'
    const body = {id, name, description, appID: appId, permIDs: ['PERM_OK', 'PERM_02']}

    const url = '/api/v1/role/add';
    await mocha.post({url, headers, body, schema})
  });

  it('update', async function() {
    const schema = getAddResponseSchema();
    const id = 'test-role-id'
    const name = 'test-role-name:updated'
    const permIds = ['PERM_UPDATE', 'PERM_OK'];
    const description = 'The Test Role:updated'
    const body = {id, name, description, permIDs: permIds}

    const url = '/api/v1/role/update';
    await mocha.post({url, headers, body, schema})
  });

  it('list', async function() {
    const schema = getListResponseSchema()
    const url = '/api/v1/role/list'
    const appId = 'test-application-id'
    const args = {appID: appId}
    const res = await mocha.get({url, headers, args, schema})
  });


  after(async function() {
    const url = '/api/v1/role/delete';
    const id = 'test-role-id'
    const body = {id}
    await mocha.post({url, headers, body})
  });
});
