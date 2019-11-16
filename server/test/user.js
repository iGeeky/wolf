
const mocha = require('./util/mocha')
const util = require('./util/util')

const headers = util.adminHeaders()

function getAddResponseSchema() {
  const schema = util.okSchema({
    type: 'object',
    properties: {
      password: {type: 'string'},
      userInfo: {type: 'object'},
    },
    required: ['password', 'userInfo'],
  })
  return schema
}

function getListResponseSchema() {
  const schema = util.okSchema({
    type: 'object',
    properties: {
      userInfos: {type: 'array'},
      items: {
        type: 'object',
      },
    },
    required: ['userInfos'],
  })
  return schema
}

describe('user', function() {
  it('login user not found', async function() {
    const schema = util.failSchema('ERR_USER_NOT_FOUND');
    const username = 'user-not-found'
    const password = 'password'
    const body = {username, password}
    const url = '/api/v1/user/login';

    await mocha.post({url, headers, body, schema})
  });

  /**
   * username: {type: 'string', required: true},
      nickname: {type: 'string', required: true},
      password: {type: 'string', default: ()=>util.randomString(12)},
      email: {type: 'string'},
      tel: {type: 'string'},
      appIDs: {type: 'array'},
   */
  it('add', async function() {
    const schema = getAddResponseSchema();
    const username = 'test-user-username'
    const nickname = 'test001'
    const email = 'test001@company.com'
    const tel = '13012341234'
    const appIds = ['ROOT', 'TEST']
    const body = {username, nickname, email, tel, appIDs: appIds, password: util.defPassword()}
    const url = '/api/v1/user/add';
    const res = await mocha.post({url, headers, body, schema})
  });

  it('list', async function() {
    const schema = getListResponseSchema()
    const url = '/api/v1/user/list'
    const args = {}
    const res = await mocha.get({url, headers, args, schema})
  });

  after(async function() {
    const username = 'test-user-username'
    const schema = util.okSchema({type: 'object'});
    const body = {username}
    const url = '/api/v1/user/delete';
    await mocha.post({url, headers, body, schema})
  });
});


