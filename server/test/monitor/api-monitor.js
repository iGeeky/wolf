
const mocha = require('../util/mocha')
const util = require('../util/util')
const argv = require('minimist')(process.argv.slice(2));
const dingDingAccessToken = argv.accessToken

const chai = require('chai');

async function sendmsgToDingDing(message) {
  const server = 'https://oapi.dingtalk.com'
  const url = `/robot/send?access_token=${dingDingAccessToken}`
  const headers = {'Content-Type': 'application/json'}
  // `警告`是钉钉中设置的关键字.
  const content = `测试服务器'${argv.server}'出错啦! \n 警告: ${message}`
  const body = {'msgtype': 'text', 'text': {'content': content}}
  // await mocha.httpPost(url, headers, body)
  const req = chai.request(server).post(url)
  mocha.setHeaders(req, headers)
  await req.send(body)
}

if (dingDingAccessToken) {
  mocha.onFailed(function(errmsg, args) {
    sendmsgToDingDing(errmsg)
  })
}

describe('monitor', function() {
  const headers = util.adminHeaders()
  util.ignoreInit = true;

  describe('monitor', function() {
    it('ping', async function() {
      const dataSchema = {
        type: 'object',
        properties: {'server':{'type':'string'},'now':{'type':'string'}},
        required: ['server','now']
      }
      const schema = util.okSchema(dataSchema);
      const args = {}
      const url = '/wolf/ping';
      await mocha.get({url, headers, args, status: 200, schema})
    });

    it('admin login success', async function() {
      const username = argv.username
      const password = argv.password
      if(!username || !password){
        this.skip();
      }
      const dataSchema = {
        type: 'object',
        properties: {
            token: {'type':'string'},
            userInfo: {
                type: 'object'
            },
            applications: {
                type: 'array',
                items: {
                    type: 'object'
                }
            }
        },
        required: ['token','userInfo','applications']
      }
      const schema = util.okSchema(dataSchema)
      const body = { username, password}
      const url = `/wolf/user/login`;
      const res = await mocha.post({url, headers, body, status: 200, schema})
      headers['x-rbac-token'] = res.body.data.token
    });
  });
});
