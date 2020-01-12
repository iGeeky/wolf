
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
        minItems: 1,
      },
      total: {type: 'integer'},
    },
    required: ['resources', 'total'],
  })
  return schema
}

function getEmptyListResponseSchema() {
  const schema = util.okSchema({
    type: 'object',
    properties: {
      resources: {
        type: 'array',
        maxItems: 0,
      },
      total: {type: 'integer'},
    },
    required: ['resources', 'total'],
  })
  return schema
}

let resource = null;


describe('resource', function() {
  const appID = 'res-test-app-id'

  /*
  * `Match Type`优先级从高到低, 依次是: 精确匹配, 后缀匹配, 前缀匹配.
  * `Action` 即`HTTP Method`.  `ALL`优先级比较低, 其它方法(如`GET`, `POST`, `PUT`)优先级相同, 但都比`ALL`高.
  * `Name` 即`HTTP URL`.  优先级与URL长度有关, URL越长优先级越高.
  */
  const resources = [ ]
  const matchTypes = ['equal', 'suffix', 'prefix']
  const actions = ['ALL', 'GET', 'POST', 'PUT']
  function getNames(matchType) {
    let names = null;
    if (matchType === 'prefix') {
      names = ['.jpg', '.js']
    } else {
      names = ['/', '/test', '/test/info', '/login', '/logout']
    }
    return names
  }

  it('add', async function() {
    this.timeout(1000 * 40);

    const schema = getAddResponseSchema();
    const matchType = 'prefix'
    const name = '/default'
    const action = 'ALL';
    const permID = 'PERM_DEFAULT'
    const body = {appID, matchType, name, action, permID}

    const url = '/wolf/resource/add';
    const res = await mocha.post({url, headers, body, schema})
    resource = res.body.data.resource;


    for (let i=0; i < matchTypes.length; i++) {
      const matchType = matchTypes[i];
      for (let j=0; j< actions.length; j++) {
        const action = actions[j];
        const names = getNames(matchType)
        for (let k=0; k<names.length; k++) {
          const name = names[k];
          const permID = `PERM_${matchType}_${action}_${name}`.replace(/[\.\/]/, '_')
          const body = {appID, matchType, name, action, permID}
          await mocha.post({url, headers, body, schema})
        }
      }
    }

  });

  it('update', async function() {
    if (!resource) {
      this.skip();
    }
    const schema = getAddResponseSchema();
    const id = resource.id;
    const matchType = 'prefix'
    const name = '/'
    const action = 'ALL';
    const permID = 'PERM_DEFAULT'
    const body = {id, matchType, name, action, permID}
    const url = '/wolf/resource/update';
    await mocha.post({url, headers, body, schema})
  });

  it('list', async function() {
    const schema = getListResponseSchema()
    const url = '/wolf/resource/list'
    const limit = 128;
    const sort = '+priority';
    const args = {appID, sort, limit}
    const res = await mocha.get({url, headers, args, schema})
  });

  it('list search empty', async function() {
    const schema = getEmptyListResponseSchema()
    const url = '/wolf/resource/list'
    const args = {appID, key: 'not-exist'}
    const res = await mocha.get({url, headers, args, schema})
  });

  after(async function() {
    if (!appID) {
      this.skip();
    }
    const url = '/wolf/resource/delete_by_app_id';
    const body = {appID}
    await mocha.post({url, headers, body})
  });
});
