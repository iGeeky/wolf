
const mocha = require('./util/mocha')
const util = require('./util/util')

const headers = util.adminHeaders()

function getAddResponseSchema() {
  const schema = util.okSchema({
    type: 'object',
    properties: {
      role: {type: 'object'},
    },
    required: ['role'],
  })
  return schema
}

function getListResponseSchema(roleSchema={type: 'object'}) {
  const schema = util.okSchema({
    type: 'object',
    properties: {
      roles: {
        type: 'array',
        items: roleSchema,
        minItems: 1,
        maxItems: 1,
      },
      total: {type: 'integer'},
    },
    required: ['roles', 'total'],
  })
  return schema
}

// const role = null;

describe('role', function() {
  const appID = 'test-appid-for-role-test1'
  const appID2 = 'test-appid-for-role-test2'
  const appIDs = [appID, appID2]
  const permIDMaps = {
    [appID]: ['test-permid-fro-role-test1', 'test-permid-fro-role-test2'],
    [appID2]: ['test-permid-fro-role-test3', 'test-permid-fro-role-test4'],
  }
  let name = 'test-role-name'

  before(async function() {
    for (let appID of appIDs) {
      const application = {id: appID, name: appID, description: ''}
      await util.addApplication(application, headers)
    }
    for (let appID of Object.keys(permIDMaps)) {
      const permIDs = permIDMaps[appID]
      for (let permID of permIDs) {
        const permission = {id: permID, name: permID, description: '', appID}
        await util.addPermission(permission, headers)
      }
    }
  });

  it('add first', async function() {
    const schema = getAddResponseSchema();
    const id = 'test-role-id'
    const description = 'test-role-description'
    const permIDs = permIDMaps[appID]
    const body = {id, name, description, appID, permIDs}

    const url = '/wolf/role';
    await mocha.post({url, headers, body, schema})
  });

  it('add second', async function() {
    const schema = getAddResponseSchema();
    const id = 'test-role-id2'
    const name = 'test-role-name2'
    const description = 'test-role-description'
    const permIDs = permIDMaps[appID2]
    const body = {id, name, description, appID: appID2, permIDs}

    const url = '/wolf/role';
    await mocha.post({url, headers, body, schema})
  });

  it('add third', async function() {
    const schema = getAddResponseSchema();
    const id = 'test-role-id3'
    const name = 'test-role-name3'
    const description = 'test-role-description'
    const permIDs = permIDMaps[appID2]
    const body = {id, name, description, appID: appID2, permIDs}

    const url = '/wolf/role';
    await mocha.post({url, headers, body, schema})
  });


  it('add failed, id exists', async function() {
    const schema = util.failSchema('ERR_ROLE_ID_EXIST', 'Role ID already exists')
    const id = 'test-role-id'
    const description = ''
    const permIDs = permIDMaps[appID]
    const body = {id, name, description, appID, permIDs}

    const url = '/wolf/role';
    await mocha.post({url, headers, body, status: 400, schema})
  });

  it('add failed, name exists', async function() {
    const schema = util.failSchema('ERR_ROLE_NAME_EXIST', 'Role name already exists')
    const id = 'test-role-id-new'
    const name = 'test-role-name'
    const description = ''
    const permIDs = permIDMaps[appID]
    const body = {id, name, description, appID, permIDs}

    const url = '/wolf/role';
    await mocha.post({url, headers, body, status: 400, schema})
  });

  it('add failed, appID not found', async function() {
    const schema = util.failSchema('ERR_APPLICATION_ID_NOT_FOUND', 'Application ID not found')
    const id = 'test-role-id-new'
    const name = 'test-role-name-new'
    const description = ''
    const permIDs = permIDMaps[appID]
    const body = {id, name, description, appID: 'not-exist-app-id', permIDs}

    const url = '/wolf/role';
    await mocha.post({url, headers, body, status: 400, schema})
  });

  it('add failed, permID not found', async function() {
    const schema = util.failSchema('ERR_PERMISSION_ID_NOT_FOUND', 'Permission ID not found')
    const id = 'test-role-id-new'
    const name = 'test-role-name-new'
    const description = ''
    const permIDs = ['perm-id-not-exist']
    const body = {id, name, description, appID, permIDs}

    const url = '/wolf/role';
    await mocha.post({url, headers, body, status: 400, schema})
  });

  it('add failed, permID not match', async function() {
    const schema = util.failSchema('ERR_PERMISSION_ID_NOT_FOUND', 'Permission ID not found')
    const id = 'test-role-id-new'
    const name = 'test-role-name-new'
    const description = ''
    const permIDs = permIDMaps[appID2]
    const body = {id, name, description, appID, permIDs}

    const url = '/wolf/role';
    await mocha.post({url, headers, body, status: 400, schema})
  });

  it('update first', async function() {
    const schema = getAddResponseSchema();
    const id = 'test-role-id'
    name = 'test-role-name2'
    const description = 'test-role-description:updated'
    const permIDs = permIDMaps[appID]
    const body = {id, appID, name, description, permIDs}

    const url = '/wolf/role';
    await mocha.put({url, headers, body, schema})
  });

  it('patch, add permissions', async function() {
    const key = 'test-role-id'
    const args = {appID, key}
    const roleSchema2 = {
      type: 'object',
      properties: {
        permIDs: { type: 'array', minItems: 2, maxItems: 2,}
      }
    }
    const listSchema2 = getListResponseSchema(roleSchema2)
    await mocha.get({url: '/wolf/role/list', headers, args, schema: listSchema2})

    const permID = 'test-permid-fro-role-test10'
    const permission = {id: permID, name: permID, description: '', appID}
    await util.addPermission(permission, headers)

    // Adding new permissions using the patch method
    var schema = getAddResponseSchema();
    const id = 'test-role-id'
    const description = 'test-role-description:patch'
    const permIDs = permIDMaps[appID]
    permIDs.push(permID)
    const body = {id, appID, description, permIDs: [permID]}
    var url = '/wolf/role';
    const res = await mocha.patch({url, headers, body, schema})
    // console.log("patch res: ", JSON.stringify(res.body))

    const roleSchema3 = {
      type: 'object',
      properties: {
        permIDs: { type: 'array', minItems: 3, maxItems: 3,}
      }
    }

    const listSchema3 = getListResponseSchema(roleSchema3)
    await mocha.get({url: '/wolf/role/list', headers, args, schema: listSchema3})
  });

  it('update failed, id not found', async function() {
    const schema = util.failSchema('ERR_ROLE_ID_NOT_FOUND', 'Role ID not found')
    const id = 'test-role-id-not-found'
    const description = ''
    const permIDs = permIDMaps[appID]
    const body = {id, appID, name, description, permIDs}

    const url = '/wolf/role';
    await mocha.put({url, headers, body, status: 400, schema})
  });

  it('update failed, name exists', async function() {
    const schema = util.failSchema('ERR_ROLE_NAME_EXIST', 'Role name already exists')
    const id = 'test-role-id2'
    const name = 'test-role-name3'
    const body = {id, appID: appID2, name}

    const url = '/wolf/role';
    await mocha.put({url, headers, body, status: 400, schema})
  });

  it('update failed, appID not found', async function() {
    const schema = util.failSchema('ERR_APPLICATION_ID_NOT_FOUND', 'Application ID not found')
    const id = 'test-role-id'
    const body = {id, appID: 'not-exist-app-id'}

    const url = '/wolf/role';
    await mocha.put({url, headers, body, status: 400, schema})
  });

  it('update failed, permID not found', async function() {
    const schema = util.failSchema('ERR_PERMISSION_ID_NOT_FOUND', 'Permission ID not found')
    const id = 'test-role-id'
    const permIDs = ['perm-id-not-exist']
    const body = {id, appID, permIDs}

    const url = '/wolf/role';
    await mocha.put({url, headers, body, status: 400, schema})
  });

  it('update failed, permID not match', async function() {
    const schema = util.failSchema('ERR_PERMISSION_ID_NOT_FOUND', 'Permission ID not found')
    const id = 'test-role-id'
    const permIDs = permIDMaps[appID2]
    const body = {id, appID, permIDs}

    const url = '/wolf/role';
    await mocha.put({url, headers, body, status: 400, schema})
  });

  it('delete second,third', async function() {
    const dataSchema = {
      type: "object",
      properties: {
        "count":{"type":"integer", enum: [1]}
      },
      required: ["count"]
    }
    const schema = util.okSchema(dataSchema)
    const url = '/wolf/role';
    const id = 'test-role-id2'
    const body = {id, appID: appID2}
    await mocha.delete({url, headers, body, schema})
  });

  it('list', async function() {
    const schema = getListResponseSchema()
    const url = '/wolf/role/list'
    const args = {appID, key: name}
    const res = await mocha.get({url, headers, args, schema})
  });

  after(async function() {
    const url = '/wolf/role';
    const id = 'test-role-id'
    const body = {id, appID}
    await mocha.delete({url, headers, body})

    await mocha.delete({url, headers, body: {id: 'test-role-id3', appID: appID2}})    

    for (let appID of appIDs) {
      await util.deleteApplication(appID, headers)
    }

    for (let appID of Object.keys(permIDMaps)) {
      const permIDs = permIDMaps[appID]
      for (let permID of permIDs) {
        await util.deletePermission(permID, appID, headers)
      }
    }
  });
});
