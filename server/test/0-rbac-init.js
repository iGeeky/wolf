
const mocha = require('./util/mocha')
const util = require('./util/util')
const parseRbacData = require('./util/rbac-data-parser').parseRbacData
const headers = util.adminHeaders()
const argv = require('minimist')(process.argv.slice(2));

const policyFileName = argv.policyFile || './test/0-rbac-data-or.md'
const fs = require('fs');
const path = require('path');
const buffer = fs.readFileSync(policyFileName);
const rbacData = buffer.toString();
const data = parseRbacData(rbacData)

// console.log('>>> data::', JSON.stringify(data))
// process.exit(5)

let application = null;
const categoryMap = {}

describe('rbac', function() {
  it('check exist', async function() {
    if(data.applications && data.applications.length > 0) {
      application = data.applications[0];
      const url = '/api/v1/application/get';
      const args = {id: application.id}
      const res = await mocha.httpGet(url, headers, args)
      if(res.body && res.body.ok && res.body.reason === '' && res.body.data && res.body.data.application) {
        console.log("########### application [%s] is exist. rbac init aborted.", application.id)
        process.exit(100)
      }
    }
  });

  it('application', async function() {
    if (!data.applications) {
      this.skip();
    }

    for (const application of data.applications) {
      const url = '/api/v1/application/add';
      await mocha.post({url, headers, body: application})
    }
  });

  it('category', async function() {
    if (!application || !data.categories) {
      this.skip();
    }

    for (const category of data.categories) {
      const url = '/api/v1/category/add';
      category.appID = application.id;
      const res = await mocha.post({url, headers, body: category})
      const categoryID = res.body.data.category.id;
      category.id = categoryID;
      categoryMap[category.name] = categoryID;
    }
  });

  it('permission', async function() {
    if (!application || !data.permissions) {
      this.skip();
    }

    for (const permission of data.permissions) {
      const url = '/api/v1/permission/add';
      permission.appID = application.id;
      if(permission.category && categoryMap[permission.category]) {
        permission.categoryID = categoryMap[permission.category]
      }
      await mocha.post({url, headers, body: permission})
    }
  });

  it('role', async function() {
    if (!application || !data.roles) {
      this.skip();
    }

    for (const role of data.roles) {
      const url = '/api/v1/role/add';
      role.appID = application.id;
      await mocha.post({url, headers, body: role})
    }
  });

  it('user', async function() {
    if (!application || !data.users) {
      this.skip();
    }


    console.log('---------- rbac users for application [%s]-----------', application.id)
    for (const user of data.users) {
      let url = '/api/v1/user/add';
      user.appIDs = [application.id];
      if(argv.userPassword && typeof(argv.userPassword) !== 'boolean') {
        user.password = '' + argv.userPassword
      }
      const res = await mocha.post({url, headers, body: user})
      if (res.body.data && res.body.data.userInfo) {
        const username = res.body.data.userInfo.username;
        const password = res.body.data.password;
        console.log('%s  %s', username, password)
        const userId = res.body.data.userInfo.id;
        const {permIDs, roleIDs} = user;
        url = '/api/v1/user-role/set'
        await mocha.post({url, headers, body: {userID: userId, appID: application.id, permIDs, roleIDs}})
      }
    }
  });


  it('resource', async function() {
    if (!application || !data.resources) {
      this.skip();
    }

    for (const resource of data.resources) {
      const url = '/api/v1/resource/add';
      resource.appID = application.id;
      await mocha.post({url, headers, body: resource})
    }
  });
});


