
const mocha = require('./util/mocha')
const util = require('./util/util')

const headers = util.adminHeaders()

function getAddResponseSchema() {
  const schema = util.okSchema({
    type: 'object',
    properties: {
      application: {type: 'object'},
    },
    required: ['application'],
  })
  return schema
}

function getListResponseSchema() {
  const schema = util.okSchema({
    type: 'object',
    properties: {
      applications: {
        type: 'array',
        items: {
          type: 'object',
        },
      },
      total: {type: 'integer'},
    },
    required: ['applications', 'total'],
  })
  return schema
}

// const application = null;

describe('application', function() {
  it('add', async function() {
    const schema = getAddResponseSchema();
    const id = 'test-application-id'
    const name = 'test-application-name'
    const description = 'The Test Application'
    const body = {id, name, description}

    const url = '/api/v1/application/add';
    await mocha.post({url, headers, body, schema})
  });

  it('update', async function() {
    const schema = getAddResponseSchema();
    const id = 'test-application-id'
    const name = 'test-application-name:updated'
    const description = 'The Test Application:updated'
    const body = {id, name, description}

    const url = '/api/v1/application/update';
    await mocha.post({url, headers, body, schema})
  });

  it('list', async function() {
    const schema = getListResponseSchema()
    const url = '/api/v1/application/list'
    const args = {}
    const res = await mocha.get({url, headers, args, schema})
  });


  after(async function() {
    const url = '/api/v1/application/delete';
    const id = 'test-application-id'
    const body = {id}
    await mocha.post({url, headers, body})
  });
});
