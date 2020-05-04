
const mocha = require('../util/mocha')
const util = require('../util/util')

const headers = {};

describe('user', function() {
  it('add user: test', async function() {
    const schema = util.okSchema({
      type: 'object',
      properties: {
        password: {type: 'string'},
        userInfo: {type: 'object'},
      },
      required: ['password', 'userInfo'],
    })
    const username = 'test'
    const nickname = 'test user';
    const password = util.defPassword()
    const email = 'test@rbac'
    const tel = '13410002000'
    const appIds = ['test']
    const body = {username, nickname, password, email, tel, appIDs: appIds}
    const url = '/wolf/user';

    await mocha.post({url, headers, body, schema})
  });
});


