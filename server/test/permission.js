
const mocha = require('./util/mocha')
const util = require('./util/util')

const headers = util.adminHeaders()

function getAddResponseSchema() {
  const schema = util.okSchema({
    type: 'object',
    properties: {
      permission: {type: 'object'},
    },
    required: ['permission'],
  })
  return schema
}

function getListResponseSchema() {
  const schema = util.okSchema({
    type: 'object',
    properties: {
      permissions: {
        type: 'array',
        items: {
          type: 'object',
        },
      },
      total: {type: 'integer'},
    },
    required: ['permissions', 'total'],
  })
  return schema
}

// const permission = null;

describe('permission', function() {
  it('add', async function() {
    const schema = getAddResponseSchema();
    const id = 'test-permission-id'
    const name = 'test-permission-name'
    const description = 'The Test Permission'
    const appId = 'test-application-id'
    const body = {id, name, description, appID: appId, categoryID: 2}

    const url = '/api/v1/permission/add';
    await mocha.post({url, headers, body, schema})
  });

  it('update', async function() {
    const schema = getAddResponseSchema();
    const id = 'test-permission-id'
    const name = 'test-permission-name:updated'
    const categoryId = 3;
    const description = 'The Test Permission:updated'
    const body = {id, name, description, categoryID: categoryId}

    const url = '/api/v1/permission/update';
    await mocha.post({url, headers, body, schema})
  });

  it('list', async function() {
    const schema = getListResponseSchema()
    const url = '/api/v1/permission/list'
    const appId = 'test-application-id'
    const args = {appID: appId}
    const res = await mocha.get({url, headers, args, schema})
  });


  after(async function() {
    const url = '/api/v1/permission/delete';
    const id = 'test-permission-id'
    const body = {id}
    await mocha.post({url, headers, body})
  });
});
