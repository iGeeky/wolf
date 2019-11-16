
const mocha = require('./util/mocha')
const util = require('./util/util')

const headers = util.adminHeaders()

function getListResponseSchema() {
  const schema = util.okSchema({
    type: 'object',
    properties: {
      accessLogs: {
        type: 'array',
        items: {
          type: 'object',
        },
      },
      total: {type: 'integer'},
    },
    required: ['accessLogs', 'total'],
  })
  return schema
}

// const application = null;

describe('access-log', function() {
  it('list', async function() {
    const schema = getListResponseSchema()
    const url = '/api/v1/access-log/list'
    const appId = 'rbac-console'
    const args = {appID: appId}
    const res = await mocha.get({url, headers, args, schema})
  });
});
