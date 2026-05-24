
const mocha = require('./util/mocha')
const util = require('./util/util')

const headers = util.adminHeaders()

function getAddResponseSchema(fieldName) {
  const schema = util.okSchema({
    type: 'object',
    properties: {
      [fieldName]: {type: 'object'},
    },
    required: [fieldName],
  })
  return schema
}

describe('controller error branches', function() {
  const appID = 'test-appid-for-ctrl-err'
  const appIDs = [appID]

  before(async function() {
    for (const id of appIDs) {
      const application = {id, name: id, description: ''}
      await util.addApplication(application, headers)
    }
  });

  describe('role - delete role in use by user-role', function() {
    const roleID = 'test-ctrl-err-role'
    const permID = 'test-ctrl-err-perm-for-role'
    const userID = 9999;

    before(async function() {
      await mocha.post({url: '/wolf/permission', headers, body: {id: permID, name: permID, appID}})
      await mocha.post({url: '/wolf/role', headers, body: {id: roleID, name: roleID, appID, permIDs: [permID]}})
      // assign the role to a user via user-role
      await mocha.post({url: '/wolf/user-role/set', headers, body: {userID, appID, roleIDs: [roleID]}})
    });

    it('delete role should fail when role is in use by user-role', async function() {
      const schema = util.failSchema('ERR_ACCESS_DENIED', 'ERR_ROLE_REMOVE_DENIED')
      const url = '/wolf/role';
      const body = {id: roleID, appID}
      await mocha.delete({url, headers, body, status: 403, schema})
    });

    after(async function() {
      // clean up: remove user-role first, then role, then permission
      await mocha.delete({url: '/wolf/user-role', headers, body: {userID, appID}})
      await mocha.delete({url: '/wolf/role', headers, body: {id: roleID, appID}})
      await mocha.delete({url: '/wolf/permission', headers, body: {id: permID, appID}})
    });
  });

  describe('permission - create without categoryID', function() {
    const permID = 'test-ctrl-err-perm-nocat'

    it('add permission without categoryID should succeed', async function() {
      const schema = getAddResponseSchema('permission')
      const body = {id: permID, name: permID, appID}
      const url = '/wolf/permission';
      await mocha.post({url, headers, body, schema})
    });

    it('list should include the permission created without categoryID', async function() {
      const schema = util.okSchema({
        type: 'object',
        properties: {
          permissions: {
            type: 'array',
            items: {type: 'object'},
            minItems: 1,
          },
          total: {type: 'integer'},
        },
        required: ['permissions', 'total'],
      })
      const url = '/wolf/permission/list';
      const args = {appID, key: permID}
      const res = await mocha.get({url, headers, args, schema})
      // verify the returned permission has no categoryID or it is null
      const perm = res.body.data.permissions.find(p => p.id === permID)
      if (perm) {
        const {assert} = require('chai')
        assert.ok(perm.categoryID === undefined || perm.categoryID === null,
          'permission created without categoryID should have null/undefined categoryID')
      }
    });

    after(async function() {
      await mocha.delete({url: '/wolf/permission', headers, body: {id: permID, appID}})
    });
  });

  describe('category - delete category in use by permission', function() {
    let categoryID = null;
    const permID = 'test-ctrl-err-perm-for-cat'

    before(async function() {
      // create a category
      const body = {appID, name: 'test-ctrl-err-category'}
      const url = '/wolf/category';
      const res = await mocha.post({url, headers, body})
      categoryID = res.body.data.category.id;
      // create a permission referencing that category
      await mocha.post({url: '/wolf/permission', headers, body: {id: permID, name: permID, appID, categoryID}})
    });

    it('delete category should fail when category is in use by permission', async function() {
      const schema = util.failSchema('ERR_ACCESS_DENIED', 'ERR_CATEGORY_REMOVE_DENIED')
      const url = '/wolf/category';
      const body = {id: categoryID}
      await mocha.delete({url, headers, body, status: 403, schema})
    });

    after(async function() {
      // clean up: remove permission first, then category
      await mocha.delete({url: '/wolf/permission', headers, body: {id: permID, appID}})
      if (categoryID) {
        await mocha.delete({url: '/wolf/category', headers, body: {id: categoryID}})
      }
    });
  });

  describe('resource - flushCache and options endpoints', function() {
    it('GET /wolf/resource/flushCache should succeed', async function() {
      const schema = util.okSchema({
        type: 'object',
        properties: {
          message: {type: 'string'},
        },
        required: ['message'],
      })
      const url = '/wolf/resource/flushCache';
      await mocha.get({url, headers, schema})
    });

    it('GET /wolf/resource/options should return config flags', async function() {
      const schema = util.okSchema({
        type: 'object',
        properties: {
          rbacUseRadixTreeRouting: {type: 'boolean'},
        },
        required: ['rbacUseRadixTreeRouting'],
      })
      const url = '/wolf/resource/options';
      await mocha.get({url, headers, schema})
    });
  });

  describe('user - loginOptions endpoint', function() {
    it('GET /wolf/user/loginOptions should return config', async function() {
      const schema = util.okSchema({
        type: 'object',
        properties: {
          password: {type: 'object'},
          ldap: {type: 'object'},
        },
        required: ['password', 'ldap'],
      })
      const url = '/wolf/user/loginOptions';
      await mocha.get({url, headers, schema})
    });
  });

  describe('permission - delete permission in use by role', function() {
    const roleID = 'test-ctrl-err-role-for-perm'
    const permID = 'test-ctrl-err-perm-in-use'

    before(async function() {
      await mocha.post({url: '/wolf/permission', headers, body: {id: permID, name: permID, appID}})
      await mocha.post({url: '/wolf/role', headers, body: {id: roleID, name: roleID, appID, permIDs: [permID]}})
    });

    it('delete permission should fail when permission is in use by role', async function() {
      const schema = util.failSchema('ERR_ACCESS_DENIED', 'ERR_PERMISSION_REMOVE_DENIED')
      const url = '/wolf/permission';
      const body = {id: permID, appID}
      await mocha.delete({url, headers, body, status: 403, schema})
    });

    after(async function() {
      // clean up: remove role first, then permission
      await mocha.delete({url: '/wolf/role', headers, body: {id: roleID, appID}})
      await mocha.delete({url: '/wolf/permission', headers, body: {id: permID, appID}})
    });
  });

  describe('application - diagram endpoint', function() {
    it('GET /wolf/application/diagram with non-existent id should fail', async function() {
      const schema = util.failSchema('ERR_OBJECT_NOT_FOUND')
      const url = '/wolf/application/diagram';
      const args = {id: 'nonexistent-app-id-ctrl-err'}
      await mocha.get({url, headers, args, status: 200, schema})
    });

    it('GET /wolf/application/diagram with valid id should succeed', async function() {
      const schema = util.okSchema({
        type: 'object',
        properties: {
          nodeDataArray: {type: 'array'},
          linkDataArray: {type: 'array'},
        },
        required: ['nodeDataArray', 'linkDataArray'],
      })
      const url = '/wolf/application/diagram';
      const args = {id: appID}
      await mocha.get({url, headers, args, schema})
    });
  });

  after(async function() {
    for (const id of appIDs) {
      await util.deleteApplication(id, headers)
    }
  });
});
