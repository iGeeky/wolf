const mocha = require('../util/mocha')
const util = require('../util/util')
const parseRbacData = require('./rbac-data-parser').parseRbacData

function rbacDataRead(policyFileName) {
  const fs = require('fs')
  const buffer = fs.readFileSync(policyFileName)
  const rbacData = buffer.toString()
  const data = parseRbacData(rbacData)
  return data
}

function rbacInit(data, userPassword, opts={}) {
  const headers = util.adminHeaders()
  let application = null;
  let ignore = false;
  const categoryMap = {}
  it('check exist', async function() {
    if(data.applications && data.applications.length > 0) {
      application = data.applications[0];
      const url = '/wolf/application/get';
      const args = {id: application.id}
      const res = await mocha.httpGet(url, headers, args)
      if(res.body && res.body.ok && res.body.reason === '' && res.body.data && res.body.data.application) {
        console.log("########### application [%s] is exist. rbac init aborted.", application.id)
        ignore = true
      }
    }
  });

  it('application', async function() {
    if (ignore || !data.applications) {
      this.skip();
    }

    for (const application of data.applications) {
      const url = '/wolf/application';
      await mocha.post({url, headers, body: application})
    }
  });

  it('category', async function() {
    if (ignore || !application || !data.categories) {
      this.skip();
    }

    for (const category of data.categories) {
      const url = '/wolf/category';
      category.appID = application.id;
      const res = await mocha.post({url, headers, body: category})
      const categoryID = res.body.data.category.id;
      category.id = categoryID;
      categoryMap[category.name] = categoryID;
    }
  });

  it('permission', async function() {
    if (ignore || !application || !data.permissions) {
      this.skip();
    }

    for (const permission of data.permissions) {
      const url = '/wolf/permission';
      permission.appID = application.id;
      if(permission.category && categoryMap[permission.category]) {
        permission.categoryID = categoryMap[permission.category]
      }
      await mocha.post({url, headers, body: permission})
    }
  });

  it('role', async function() {
    if (ignore || !application || !data.roles) {
      this.skip();
    }

    for (const role of data.roles) {
      const url = '/wolf/role';
      role.appID = application.id;
      await mocha.post({url, headers, body: role})
    }
  });

  it('user', async function() {
    if (ignore || !application || !data.users) {
      this.skip();
    }

    if(!opts.quiet){
      console.log('---------- rbac users for application [%s]-----------', application.id)
    }
    for (const user of data.users) {
      let url = '/wolf/user';
      user.appIDs = [application.id];
      if(userPassword && typeof(userPassword) !== 'boolean') {
        user.password = '' + userPassword
      }
      const res = await mocha.post({url, headers, body: user})
      if (res.body.data && res.body.data.userInfo) {
        const username = res.body.data.userInfo.username;
        const password = res.body.data.password;
        if(!opts.quiet){
          console.log('%s  %s', username, password)
        }
        const userId = res.body.data.userInfo.id;
        const {permIDs, roleIDs} = user;
        url = '/wolf/user-role/set'
        await mocha.post({url, headers, body: {userID: userId, appID: application.id, permIDs, roleIDs}})
      }
    }
  });


  it('resource', async function() {
    if (ignore || !application || !data.resources) {
      this.skip();
    }

    for (const resource of data.resources) {
      const url = '/wolf/resource';
      resource.appID = application.id;
      await mocha.post({url, headers, body: resource})
    }
  });
}

function rbacDestroy(data) {
  const headers = util.adminHeaders()
  let application = null;
  it('application', async function() {
    if (!data.applications) {
      this.skip();
    }
    application = data.applications[0];

    for (const application of data.applications) {
      const url = '/wolf/application';
      await mocha.delete({url, headers, body: {id: application.id}})
    }
  });

  it('category', async function() {
    if (!application) {
      this.skip();
    }

    const url = '/wolf/category/delete_by_appID';
    await mocha.post({url, headers, body: {appID: application.id}})
  });

  it('permission', async function() {
    if (!application) {
      this.skip();
    }
    const url = '/wolf/permission/delete_by_appID';
    await mocha.post({url, headers, body: {appID: application.id}})
  });

  it('role', async function() {
    if (!application) {
      this.skip();
    }

    const url = '/wolf/role/delete_by_appID';
    await mocha.post({url, headers, body: {appID: application.id}})
  });


  it('user', async function() {
    if (!application || !data.users) {
      this.skip();
    }

    for (const user of data.users) {
      let url = '/wolf/user';
      user.appIDs = [application.id];
      const res = await mocha.delete({url, headers, body: {username: user.username}})
      if (res.body.data && res.body.data.userInfo) {
        const userId = res.body.data.userInfo.id;
        url = '/wolf/user-role'
        await mocha.delete({url, headers, body: {userID: userId, appID: application.id}})
      }
    }
  });

  it('resource', async function() {
    if (!application) {
      this.skip();
    }
    const url = '/wolf/resource/delete_by_appID';
    await mocha.post({url, headers, body: {appID: application.id}})
  });
}

exports.rbacDataRead = rbacDataRead;
exports.rbacInit = rbacInit;
exports.rbacDestroy = rbacDestroy;