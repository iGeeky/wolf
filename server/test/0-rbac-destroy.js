
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

let application = null;

describe('rbac', function() {
  it('application', async function() {
    if (!data.applications) {
      this.skip();
    }
    application = data.applications[0];

    for (const application of data.applications) {
      const url = '/api/v1/application/delete';
      await mocha.post({url, headers, body: {id: application.id}})
    }
  });

  it('category', async function() {
    if (!application) {
      this.skip();
    }

    const url = '/api/v1/category/delete_by_appID';
    await mocha.post({url, headers, body: {appID: application.id}})
  });

  it('permission', async function() {
    if (!application) {
      this.skip();
    }
    const url = '/api/v1/permission/delete_by_appID';
    await mocha.post({url, headers, body: {appID: application.id}})
  });

  it('role', async function() {
    if (!application) {
      this.skip();
    }

    const url = '/api/v1/role/delete_by_appID';
    await mocha.post({url, headers, body: {appID: application.id}})
  });


  it('user', async function() {
    if (!application || !data.users) {
      this.skip();
    }

    for (const user of data.users) {
      let url = '/api/v1/user/delete';
      user.appIDs = [application.id];
      const res = await mocha.post({url, headers, body: {username: user.username}})
      if (res.body.data && res.body.data.userInfo) {
        const userId = res.body.data.userInfo.id;
        url = '/api/v1/user-role/delete'
        await mocha.post({url, headers, body: {userID: userId, appID: application.id}})
      }
    }
  });

  it('resource', async function() {
    if (!application) {
      this.skip();
    }
    const url = '/api/v1/resource/delete_by_appID';
    await mocha.post({url, headers, body: {appID: application.id}})
  });
});


