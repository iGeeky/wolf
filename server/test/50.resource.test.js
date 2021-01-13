
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
  const appID = 'test-app-id-for-resource'
  const appIDs = [appID]

  before(async function() {
    for (let appID of appIDs) {
      const application = {id: appID, name: appID, description: ''}
      await util.addApplication(application, headers)
    }
  });

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
    await mocha.post({url: '/wolf/permission', headers, body: {id: permID, name: permID, appID}})

    const body = {appID, matchType, name, action, permID}
    const url = '/wolf/resource';
    const res = await mocha.post({url, headers, body, schema})
    resource = res.body.data.resource;

    // add second
    body.name = '/default/02'
    await mocha.post({url, headers, body, schema})


    for (let i=0; i < matchTypes.length; i++) {
      const matchType = matchTypes[i];
      for (let j=0; j< actions.length; j++) {
        const action = actions[j];
        const names = getNames(matchType)
        for (let k=0; k<names.length; k++) {
          const name = names[k];
          const permID = `PERM_${matchType}_${action}_${name}`.replace(/[\.\/]/, '_')
          // add permission for test
          await mocha.post({url: '/wolf/permission', headers, body: {id: permID, name: permID, appID}})
          const body = {appID, matchType, name, action, permID}
          await mocha.post({url, headers, body, schema})
        }
      }
    }
  });


  it('add success, permission: ALLOW_ALL', async function() {
    const schema = getAddResponseSchema()
    const matchType = 'equal'
    const name = '/allow_all'
    const action = 'ALL';
    const permID = 'ALLOW_ALL'
    const body = {appID, matchType, name, action, permID}
    const url = '/wolf/resource';
    await mocha.post({url, headers, body, schema})
  });

  it('add success, permission: DENY_ALL', async function() {
    const schema = getAddResponseSchema()
    const matchType = 'equal'
    const name = '/deny_all'
    const action = 'ALL';
    const permID = 'DENY_ALL'
    const body = {appID, matchType, name, action, permID}
    const url = '/wolf/resource';
    await mocha.post({url, headers, body, schema})
  });

  it('add failed, appID not found', async function() {
    const schema = util.failSchema('ERR_APPLICATION_ID_NOT_FOUND', 'Application ID not found')
    const matchType = 'prefix'
    const name = '/default'
    const action = 'ALL';
    const permID = 'PERM_02'
    await mocha.post({url: '/wolf/permission', headers, body: {id: permID, name: permID, appID}})

    const body = {appID: 'not-exist-app-id', matchType, name, action, permID}
    const url = '/wolf/resource';
    await mocha.post({url, headers, body, status: 400, schema})
  });

  it('add failed, resource exists', async function() {
    const schema = util.failSchema('ERR_RESOURCE_EXIST', 'Resource(appID+matchType+action+name) already exists')
    const matchType = 'prefix'
    const name = '/default'
    const action = 'ALL';
    const permID = 'PERM_DEFAULT'

    const body = {appID, matchType, name, action, permID}
    const url = '/wolf/resource';
    await mocha.post({url, headers, body, status: 400, schema})
  });

  it('add failed, permission id not found', async function() {
    const schema = util.failSchema('ERR_PERMISSION_ID_NOT_FOUND', 'Permission ID not found')
    const matchType = 'prefix'
    const name = '/new-uri'
    const action = 'ALL';
    const permID = 'not-exist-perm-id'
    const body = {appID, matchType, name, action, permID}
    const url = '/wolf/resource';
    await mocha.post({url, headers, body, status: 400, schema})
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
    const url = '/wolf/resource';
    await mocha.put({url, headers, body, schema})
  });

  it('update failed, id not found', async function() {
    const schema = util.failSchema('ERR_RESOURCE_ID_NOT_FOUND', 'Resource ID not found')
    const id = 99999999
    const matchType = 'prefix'
    const name = '/'
    const action = 'ALL';
    const permID = 'PERM_DEFAULT'
    const body = {id, matchType, name, action, permID}
    const url = '/wolf/resource';
    await mocha.put({url, headers, body, status: 400, schema})
  });

  it('update failed, resource exists', async function() {
    const schema = util.failSchema('ERR_RESOURCE_EXIST', 'Resource(appID+matchType+action+name) already exists')
    const id = resource.id;
    const matchType = 'prefix'
    const name = '/default/02'
    const action = 'ALL';
    const permID = 'PERM_DEFAULT'
    const body = {id, matchType, name, action, permID}
    const url = '/wolf/resource';
    await mocha.put({url, headers, body, status: 400, schema})
  });

  it('update failed, permission id not found', async function() {
    const schema = util.failSchema('ERR_PERMISSION_ID_NOT_FOUND', 'Permission ID not found')
    const id = resource.id;
    const matchType = 'prefix'
    const name = '/default/not/exist'
    const action = 'ALL';
    const permID = 'not-exist-perm-id'
    const body = {id, matchType, name, action, permID}
    const url = '/wolf/resource';
    await mocha.put({url, headers, body, status: 400, schema})
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
    for (let appID of appIDs) {
      await mocha.post({url: '/wolf/resource/delete_by_app_id', headers, body: {appID}})
      await util.deleteApplication(appID, headers)
      await mocha.delete({url: '/wolf/permission/delete_by_app_id', headers, body: {appID}})
    }
  });
});
