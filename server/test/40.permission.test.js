
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
  const appID = 'test-application-id'
  const appID2 = 'test-application-id2'
  const name = 'test-permission-name'
  it('add first', async function() {
    const schema = getAddResponseSchema();
    const id = 'test-permission-id'
    const description = 'test-permission-description'
    const body = {id, name, description, appID, categoryID: 2}

    const url = '/wolf/permission';
    await mocha.post({url, headers, body, schema})
  });

  it('add second', async function() {
    const schema = getAddResponseSchema();
    const id = 'test-permission-id'
    const description = 'test-permission-description'
    const body = {id, name, description, appID: appID2, categoryID: 2}

    const url = '/wolf/permission';
    await mocha.post({url, headers, body, schema})
  });

  it('update first', async function() {
    const schema = getAddResponseSchema();
    const id = 'test-permission-id'
    const name = 'test-permission-name:updated'
    const categoryId = 3;
    const description = 'test-permission-description:updated'
    const body = {id, appID, name, description, categoryID: categoryId}

    const url = '/wolf/permission';
    await mocha.put({url, headers, body, schema})
  });

  it('delete second', async function() {
    const dataSchema = {
      type: "object",
      properties: {
        "count":{"type":"integer", enum: [1]}
      },
      required: ["count"]
    }
    const schema = util.okSchema(dataSchema)
    const url = '/wolf/permission';
    const id = 'test-permission-id'
    const body = {id, appID: appID2}
    await mocha.delete({url, headers, body, schema})
  });

  it('list', async function() {
    const schema = getListResponseSchema()
    const url = '/wolf/permission/list'
    const args = {appID, key: name}
    const res = await mocha.get({url, headers, args, schema})
  });


  after(async function() {
    const url = '/wolf/permission';
    const id = 'test-permission-id'
    const body = {id, appID}
    await mocha.delete({url, headers, body})
  });
});
