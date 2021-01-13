
const mocha = require('./util/mocha')
const util = require('./util/util')



describe('method-invalid-error', function() {
  const headers = util.adminHeaders()

  it('access-log.list', async function() {
    const schema = util.failSchema('ERR_METHOD_INVALID');   
    const url = '/wolf/access-log/list';
    await mocha.post({url, headers, status: 404, schema})
  });

  it('application.secret', async function() {
    const schema = util.failSchema('ERR_METHOD_INVALID');  
    const url = '/wolf/application/secret';
    await mocha.post({url, headers, status: 404, schema})
  });

  it('application.list', async function() {
    const schema = util.failSchema('ERR_METHOD_INVALID'); 
    const url = '/wolf/application/list';
    await mocha.post({url, headers, status: 404, schema})
  });

  it('application.listAll', async function() {
    const schema = util.failSchema('ERR_METHOD_INVALID');    
    const url = '/wolf/application/list_all';
    await mocha.post({url, headers, status: 404, schema})
  });

  it('category.list', async function() {
    const schema = util.failSchema('ERR_METHOD_INVALID');
    const url = '/wolf/category/list';
    await mocha.post({url, headers, status: 404, schema})
  });

  it('permission.list', async function() {
    const schema = util.failSchema('ERR_METHOD_INVALID');
    const url = '/wolf/permission/list';
    await mocha.post({url, headers, status: 404, schema})
  });

  it('resource.list', async function() {
    const schema = util.failSchema('ERR_METHOD_INVALID');   
    const url = '/wolf/resource/list';
    await mocha.post({url, headers, status: 404, schema})
  });

  it('role.list', async function() {
    const schema = util.failSchema('ERR_METHOD_INVALID');   
    const url = '/wolf/role/list';
    await mocha.post({url, headers, status: 404, schema})
  });

  it('user-role.set', async function() {
    const schema = util.failSchema('ERR_METHOD_INVALID'); 
    const url = '/wolf/user-role/set';
    await mocha.put({url, headers, status: 404, schema})
  });

  it('user.info', async function() {
    const schema = util.failSchema('ERR_METHOD_INVALID');   
    const url = '/wolf/user/info';
    await mocha.post({url, headers, status: 404, schema})
  });

  it('user.list', async function() {
    const schema = util.failSchema('ERR_METHOD_INVALID');
    const url = '/wolf/user/list';
    await mocha.post({url, headers, status: 404, schema})
  });

  it('user.resetPwd', async function() {
    const schema = util.failSchema('ERR_METHOD_INVALID');    
    const url = '/wolf/user/reset_pwd';
    await mocha.post({url, headers, status: 404, schema})
  });
});
