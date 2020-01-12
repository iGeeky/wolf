
const mocha = require('./util/mocha')
const util = require('./util/util')
const moment = require('moment');

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
  const headers = util.adminHeaders()
  const now = Math.floor(new Date().getTime()/1000);
  const format='YYYY-MM-DD HH:mm:ss';
  const startTime = moment.unix(now).format(format)
  const endTime = moment.unix(now + 600).format(format)
  const testUrl = '/wolf/permission/list'

  it('test permission list', async function() {
    const schema = util.okSchema();
    const appID = 'test-app-id'
    const args = {appID}
    await mocha.get({url: testUrl, headers, args, schema})
  });
  it('list all', async function() {
    const schema = getListResponseSchema()
    const url = '/wolf/access-log/list'
    const appID = 'rbac-console'
    const args = {appID}
    const res = await mocha.get({url, headers, args, schema})
  });

  it('list one item', async function() {
    const schema = getListResponseSchema()
    const url = '/wolf/access-log/list'
    const appID = 'rbac-console'
    const username = 'root'
    const action = 'GET'
    const resName = testUrl
    const status = 200;
    const args = {appID, username, action, resName, status, startTime, endTime}
    const res = await mocha.get({url, headers, args, schema})
  });
});
