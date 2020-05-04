
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
  const name = 'test-permission-name'
  it('add', async function() {
    const schema = getAddResponseSchema();
    const id = 'test-permission-id'
    const description = 'test-permission-description'
    const appID = 'test-application-id'
    const body = {id, name, description, appID, categoryID: 2}

    const url = '/wolf/permission';
    await mocha.post({url, headers, body, schema})
  });

  it('update', async function() {
    const schema = getAddResponseSchema();
    const id = 'test-permission-id'
    const name = 'test-permission-name:updated'
    const categoryId = 3;
    const description = 'test-permission-description:updated'
    const body = {id, name, description, categoryID: categoryId}

    const url = '/wolf/permission';
    await mocha.put({url, headers, body, schema})
  });

  it('list', async function() {
    const schema = getListResponseSchema()
    const url = '/wolf/permission/list'
    const appID = 'test-application-id'
    const args = {appID, key: name}
    const res = await mocha.get({url, headers, args, schema})
  });


  after(async function() {
    const url = '/wolf/permission';
    const id = 'test-permission-id'
    const body = {id}
    await mocha.delete({url, headers, body})
  });
});
