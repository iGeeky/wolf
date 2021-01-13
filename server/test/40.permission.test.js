
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
  const appID = 'test-appid-for-permission-test1'
  let category4appID = null;
  const appID2 = 'test-appid-for-permission-test2'
  const name = 'test-permission-name'
  const appIDs = [appID, appID2]

  before(async function() {
    for (let appID of appIDs) {
      const application = {id: appID, name: appID, description: ''}
      await util.addApplication(application, headers)
    }

    const body = {appID, name: 'category-for-permission-test'}
    const url = '/wolf/category';
    const res = await mocha.post({url, headers, body})
    if (res.body.data && res.body.data.category) {
      category4appID = res.body.data.category;
    }
  });


  it('add first', async function() {
    const schema = getAddResponseSchema();
    const id = 'test-permission-id'
    const description = 'test-permission-description'
    const body = {id, name, description, appID, categoryID: category4appID.id}
    const url = '/wolf/permission';
    await mocha.post({url, headers, body, schema})
  });

  it('add failed, appID not found', async function() {
    const schema = util.failSchema('ERR_APPLICATION_ID_NOT_FOUND', 'Application ID not found')
    const id = 'test-permission-id-new'
    const description = 'test-permission-description'
    const body = {id, name, description, appID: 'not-exist-app-id', categoryID: category4appID.id}
    const url = '/wolf/permission';
    await mocha.post({url, headers, body, status: 400, schema})
  });

  it('add failed, id exists', async function() {
    const schema = util.failSchema('ERR_PERMISSION_ID_EXIST', 'Permission ID already exists')
    const id = 'test-permission-id'
    const description = 'test-permission-description'
    const body = {id, name, description, appID, categoryID: category4appID.id}
    const url = '/wolf/permission';
    await mocha.post({url, headers, body, status: 400, schema})
  });

  it('add failed, name exists', async function() {
    const schema = util.failSchema('ERR_PERMISSION_NAME_EXIST', 'Permission name already exists')
    const id = 'test-permission-id-new'
    const description = 'test-permission-description'
    const body = {id, name, description, appID, categoryID: category4appID.id}
    const url = '/wolf/permission';
    await mocha.post({url, headers, body, status: 400, schema})
  });

  it('add failed, category id not found', async function() {
    const schema = util.failSchema('ERR_CATEGORY_ID_NOT_FOUND', 'Category ID not found')
    const id = 'test-permission-id-new'
    const name = 'test-permission-name-new'
    const description = 'test-permission-description'
    const body = {id, name, description, appID, categoryID: 99999999}
    const url = '/wolf/permission';
    await mocha.post({url, headers, body, status: 400, schema})
  });

  it('add second', async function() {
    const schema = getAddResponseSchema();
    const id = 'test-permission-id'
    const description = 'test-permission-description'
    const body = {id, name, description, appID: appID2, categoryID: category4appID.id}
    const url = '/wolf/permission';
    await mocha.post({url, headers, body, schema})
  });

  it('add third', async function() {
    const schema = getAddResponseSchema();
    const id = 'test-permission-id2'
    const name = 'test-permission-name2'
    const description = 'test-permission-description'
    const body = {id, name, description, appID, categoryID: category4appID.id}
    const url = '/wolf/permission';
    await mocha.post({url, headers, body, schema})
  });

  it('update first', async function() {
    const schema = getAddResponseSchema();
    const id = 'test-permission-id'
    const name = 'test-permission-name:updated'
    const description = 'test-permission-description:updated'
    const body = {id, appID, name, description, categoryID: category4appID.id}
    const url = '/wolf/permission';
    await mocha.put({url, headers, body, schema})
  });

  it('update failed, appID not found', async function() {
    const schema = util.failSchema('ERR_APPLICATION_ID_NOT_FOUND', 'Application ID not found')
    const id = 'test-permission-id'
    const name = 'test-permission-name-new'
    const body = {id, appID: 'not-exist-app-id', name, categoryID: category4appID.id}
    const url = '/wolf/permission';
    await mocha.put({url, headers, body, status: 400, schema})
  });

  it('update failed, id not found', async function() {
    const schema = util.failSchema('ERR_PERMISSION_ID_NOT_FOUND', 'Permission ID not found')
    const id = 'test-permission-id-not-exist'
    const name = 'test-permission-name-new'
    const body = {id, appID, name, categoryID: category4appID.id}
    const url = '/wolf/permission';
    await mocha.put({url, headers, body, status: 400, schema})
  });

  it('update failed, name exists', async function() {
    const schema = util.failSchema('ERR_PERMISSION_NAME_EXIST', 'Permission name already exists')
    const id = 'test-permission-id'
    const name = 'test-permission-name2'
    const body = {id, appID, name, categoryID: category4appID.id}
    const url = '/wolf/permission';
    await mocha.put({url, headers, body, status: 400, schema})
  });

  it('update failed, category id not found', async function() {
    const schema = util.failSchema('ERR_CATEGORY_ID_NOT_FOUND', 'Category ID not found')
    const id = 'test-permission-id'
    const name = 'test-permission-name-new'
    const body = {id, appID, name, categoryID: 99999999}
    const url = '/wolf/permission';
    await mocha.put({url, headers, body, status: 400, schema})
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
    for (let appID of appIDs) {
      await util.deleteApplication(appID, headers)
      await mocha.delete({url: '/wolf/category/delete_by_app_id', headers, body: {appID}})
      await mocha.delete({url: '/wolf/permission/delete_by_app_id', headers, body: {appID}})
    }
  });
});
