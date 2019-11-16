
const mocha = require('./util/mocha')
const util = require('./util/util')

const headers = util.adminHeaders()

function getAddResponseSchema() {
  const schema = util.okSchema({
    type: 'object',
    properties: {
      resource: {type: 'object'},
    },
    required: ['resource'],
  })
  return schema
}

function getListResponseSchema() {
  const schema = util.okSchema({
    type: 'object',
    properties: {
      resources: {
        type: 'array',
        items: {
          type: 'object',
        },
      },
      total: {type: 'integer'},
    },
    required: ['resources', 'total'],
  })
  return schema
}

let resource = null;


describe('resource', function() {
  it('add', async function() {
    const schema = getAddResponseSchema();
    const appID = 'test-application-id'
    const matchType = 'prefix'
    const test_name = '/name/permission'
    const nameLen = test_name.length;
    const action = 'ALL';
    const permID = 'PERM_URL_PERMISSION'
    const body = {appID, matchType, name: test_name, nameLen, action, permID}

    const url = '/api/v1/resource/add';
    const res = await mocha.post({url, headers, body, schema})
    resource = res.body.data.resource;
  });

  it('update', async function() {
    if (!resource) {
      this.skip();
    }
    const schema = getAddResponseSchema();
    const id = resource.id;
    const matchType = 'equal'
    const test_name = '/name/permission'
    const nameLen = test_name.length;
    const action = 'POST';
    const permID = 'PERM_URL_PERMISSION'
    const body = {id, matchType, name: test_name, nameLen, action, permID}

    const url = '/api/v1/resource/update';
    await mocha.post({url, headers, body, schema})
  });

  it('list', async function() {
    const schema = getListResponseSchema()
    const url = '/api/v1/resource/list'
    const appID = 'test-application-id'
    const args = {appID}
    const res = await mocha.get({url, headers, args, schema})
  });


  after(async function() {
    if (!resource) {
      this.skip();
    }
    const url = '/api/v1/resource/delete';
    const id = resource.id
    const body = {id}
    await mocha.post({url, headers, body})
  });
});
