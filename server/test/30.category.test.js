
const mocha = require('./util/mocha')
const util = require('./util/util')

const headers = util.adminHeaders()

function getAddResponseSchema() {
  const schema = util.okSchema({
    type: 'object',
    properties: {
      category: {type: 'object'},
    },
    required: ['category'],
  })
  return schema
}

function getListResponseSchema() {
  const schema = util.okSchema({
    type: 'object',
    properties: {
      categorys: {
        type: 'array',
        items: {
          type: 'object',
        },
        minItems: 1,
      },
      total: {type: 'integer'},
    },
    required: ['categorys', 'total'],
  })
  return schema
}

let category = null;
let category2 = null;

describe('category', function() {
  const name = 'test-category-name'
  const name2 = 'test-category-name2'
  const appID = 'test-appid-for-category-test1'
  const appIDs = [appID]

  before(async function() {
    for (let appID of appIDs) {
      const application = {id: appID, name: appID, description: ''}
      await util.addApplication(application, headers)
    }
  });

  it('check exist', async function() {
    const schema = util.okSchema()
    const body = {value: {name: 'not-exist'}, exclude: {id: 100}}

    const url = '/wolf/category/checkExist';
    await mocha.post({url, headers, body, schema})
  });

  it('add', async function() {
    const schema = getAddResponseSchema();
    const body = {appID, name}
    const url = '/wolf/category';
    const res = await mocha.post({url, headers, body, schema})
    category = res.body.data.category;
  });

  it('add second', async function() {
    const schema = getAddResponseSchema();
    const body = {appID, name: name2}
    const url = '/wolf/category';
    const res = await mocha.post({url, headers, body, schema})
    category2 = res.body.data.category;
  });

  it('add failed, name exists', async function() {
    const schema = util.failSchema('ERR_CATEGORY_NAME_EXIST', 'Category name already exists')
    const body = {appID, name}

    const url = '/wolf/category';
    await mocha.post({url, headers, body, status: 400, schema})
  });

  it('add failed, appID not found', async function() {
    const schema = util.failSchema('ERR_APPLICATION_ID_NOT_FOUND', 'Application ID not found')
    const body = {appID: 'not-exist-app-id', name: 'test-category-name-new'}

    const url = '/wolf/category';
    await mocha.post({url, headers, body, status: 400, schema})
  });

  it('update', async function() {
    if (!category) {
      this.skip();
    }
    const schema = getAddResponseSchema();
    const id = category.id;
    const name = 'test-category-name:updated'
    const body = {id, name}

    const url = '/wolf/category';
    await mocha.put({url, headers, body, schema})
  });

  it('update failed, id not found', async function() {
    if (!category) {
      this.skip();
    }
    const schema = util.failSchema('ERR_CATEGORY_ID_NOT_FOUND', 'Category ID not found')
    const id = 9999999999 // id not found
    const name = 'test-category-name3'
    const body = {id, name}

    const url = '/wolf/category';
    await mocha.put({url, headers, body, status: 400, schema})
  });

  it('update failed, name exists', async function() {
    if (!category) {
      this.skip();
    }
    const schema = util.failSchema('ERR_CATEGORY_NAME_EXIST', 'Category name already exists')
    const id = category.id;
    const body = {id, name: name2}

    const url = '/wolf/category';
    await mocha.put({url, headers, body, status: 400, schema})
  });


  it('list', async function() {
    const schema = getListResponseSchema()
    const url = '/wolf/category/list'
    const args = {appID, key: name}
    const res = await mocha.get({url, headers, args, schema})
  });

  after(async function() {
    if (category) {
      const url = '/wolf/category';
      const id = category.id
      const body = {id}
      await mocha.delete({url, headers, body})
    }
    if (category2) {
      const url = '/wolf/category';
      const id = category2.id
      const body = {id}
      await mocha.delete({url, headers, body})
    }

    for (let appID of appIDs) {
      await util.deleteApplication(appID, headers)
    }
  });
});
