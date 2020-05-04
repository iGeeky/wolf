
const mocha = require('./util/mocha')
const util = require('./util/util')



describe('framework', function() {
  const headers = util.adminHeaders()

  describe('router', function() {
    it('ping', async function() {
      const schema = util.okSchema();
      const args = {}
      const url = '/wolf/ping';
      await mocha.get({url, headers, args, status: 200, schema})
    });

    it('not found 001', async function() {
      const schema = util.failSchema('ERR_REQUEST_NOT_FOUND');
      const args = {}
      const url = '/wolf/notFoundService/method';
      await mocha.get({url, headers, args, status: 404, schema})
    });

    it('not found 002', async function() {
      const schema = util.failSchema('ERR_REQUEST_NOT_FOUND');
      const args = {}
      const url = '/wolf/notFoundService';
      await mocha.get({url, headers, args, status: 404, schema})
    });

    it('request internal method start with _', async function(){
      const schema = util.failSchema("bizMethod 'loginPostInternal' not found");
      const body = {}
      const url = '/wolf/rbac/_login_post_internal';
      await mocha.post({url, headers, body, status: 404, schema})

    });
  });

  describe('token check', function() {
    it('token missing', async function() {
      const headers = {}
      const schema = util.failSchema('ERR_TOKEN_INVALID');
      const args = {}
      const url = '/wolf/user/info';
      await mocha.get({url, headers, args, status: 401, schema})
    });
    it('token invalid', async function() {
      const headers = {'x-rbac-token': 'invalid-token'}
      const schema = util.failSchema('ERR_TOKEN_INVALID');
      const args = {}
      const url = '/wolf/user/info';
      await mocha.get({url, headers, args, status: 401, schema})
    });
    it('token ok', async function() {
      const dataSchema = {
        type: "object",
        properties: {
            userInfo: {
                type: "object",
                properties: {
                    id: {"type":"integer"},
                    username: {"type":"string"},
                    nickname: {"type":"string"},
                    email: {},
                    appIDs: {"type":"array"},
                    manager: {"type":"string"},
                    createTime: {"type":"integer"}
                },
                required: ["id","username","nickname","email","appIDs","manager","createTime"]
            },
            applications: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        id: {"type":"string"},
                        name: {"type":"string"},
                        description: {"type":"string"},
                        createTime: {"type":"integer"}
                    },
                    required: ["id","name","description","createTime"]
                }
            }
        },
        required: ["userInfo","applications"]
      }
      const schema = util.okSchema(dataSchema);
      const args = {}
      const url = '/wolf/user/info';
      await mocha.get({url, headers, args, status: 200, schema})
    });
  });

  describe('error catch', function() {
    it('args error', async function() {
      const headers = {}
      const schema = util.failSchema('ERR_ARGS_ERROR');
      const body = {}
      const url = '/wolf/user/login';
      await mocha.post({url, headers, body, status: 400, schema})
    });

    it('token error', async function() {
      const headers = {'x-rbac-token': 'invalid-token'}
      const schema = util.failSchema('ERR_TOKEN_INVALID');
      const args = {}
      const url = '/wolf/user/info';
      await mocha.get({url, headers, args, status: 401, schema})
    });

    it('backend error', async function() {
      const schema = util.failSchema('ERR_SERVER_ERROR');
      const args = {}
      const url = '/wolf/error-test/backend_error';
      await mocha.get({url, headers, args, status: 500, schema})
    });

    it('unknow error', async function() {
      const schema = util.failSchema('ERR_SERVER_ERROR');
      const args = {}
      const url = '/wolf/error-test/unknow_error';
      await mocha.get({url, headers, args, status: 200, schema})
    });

    describe('access deny error', function() {
      let userInfo = null;
      const headers = util.adminHeaders()
      const username = 'normal-user-001'
      const password = util.defPassword()

      it('add normal user', async function() {
        const schema = util.okSchema()
        const nickname = username
        const email = username + '@company.com'
        const tel = '13011002200'
        const appIds = []
        const body = {username, nickname, email, tel, appIDs: appIds, password}
        const url = '/wolf/user';
        await mocha.post({url, headers, body, status: 200, schema})
      });
      it('normal user login failed, access deny error', async function() {
        const schema = util.failSchema('ERR_ACCESS_DENIED');
        const body = { username, password}
        const url = `/wolf/user/login`;
        await mocha.post({url, headers, body, status: 401, schema})
      });

      after(async function() {
        const schema = util.okSchema({type: 'object'});
        const body = {username}
        const url = '/wolf/user';
        await mocha.delete({url, headers, body, schema})
      });
    });
  });

  describe('argument util', function() {
    it('required int arg failed, missing', async function() {
      const schema = util.failSchema('ERR_ARGS_ERROR');
      const args = {}
      const url = '/wolf/error-test/required_int_arg';
      await mocha.get({url, headers, args, status: 400, schema})
    });

    it('required int arg failed, invalid', async function() {
      const schema = util.failSchema('ERR_ARGS_ERROR');
      const args = {value: 'invalid'}
      const url = '/wolf/error-test/required_int_arg';
      await mocha.get({url, headers, args, status: 400, schema})
    });

    it('required int arg ok, int type', async function() {
      const dataSchema = {
        type: "object",
        properties: {"value":{"type":"integer"}},
        required: ["value"]
      }
      const schema = util.okSchema(dataSchema)
      const args = {value: 10}
      const url = '/wolf/error-test/required_int_arg';
      await mocha.get({url, headers, args, status: 200, schema})
    });

    it('required int arg ok, string type', async function() {
      const dataSchema = {
        type: "object",
        properties: {"value":{"type":"integer"}},
        required: ["value"]
      }
      const schema = util.okSchema(dataSchema)
      const args = {value: '10'}
      const url = '/wolf/error-test/required_int_arg';
      await mocha.get({url, headers, args, status: 200, schema})
    });

    it('required float arg failed, missing', async function() {
      const schema = util.failSchema('ERR_ARGS_ERROR');
      const args = {}
      const url = '/wolf/error-test/required_float_arg';
      await mocha.get({url, headers, args, status: 400, schema})
    });

    it('required float arg failed, invalid', async function() {
      const schema = util.failSchema('ERR_ARGS_ERROR');
      const args = {value: 'invalid'}
      const url = '/wolf/error-test/required_float_arg';
      await mocha.get({url, headers, args, status: 400, schema})
    });

    it('required float arg ok, float type', async function() {
      const dataSchema = {
        type: "object",
        properties: {"value":{"type":"number"}},
        required: ["value"]
      }
      const schema = util.okSchema(dataSchema)
      const args = {value: 10.23}
      const url = '/wolf/error-test/required_float_arg';
      await mocha.get({url, headers, args, status: 200, schema})
    });

    it('required float arg ok, string type', async function() {
      const dataSchema = {
        type: "object",
        properties: {"value":{"type":"number"}},
        required: ["value"]
      }
      const schema = util.okSchema(dataSchema)
      const args = {value: '10.23'}
      const url = '/wolf/error-test/required_float_arg';
      await mocha.get({url, headers, args, status: 200, schema})
    });

    it('object arg', async function() {
      const dataSchema = {
        type: "object",
        properties: {"value":{"type":"object"}},
        required: ["value"]
      }
      const schema = util.okSchema(dataSchema)
      const args = {value: JSON.stringify({hello: 'world'})}
      const url = '/wolf/error-test/object_arg';
      await mocha.get({url, headers, args, status: 200, schema})
    });

    it('required object arg failed, missing', async function() {
      const schema = util.failSchema('ERR_ARGS_ERROR');
      const args = {}
      const url = '/wolf/error-test/required_object_arg';
      await mocha.get({url, headers, args, status: 400, schema})
    });

    it('required object arg ok, object type', async function() {
      const dataSchema = {
        type: "object",
        properties: {"value":{"type":"object"}},
        required: ["value"]
      }
      const schema = util.okSchema(dataSchema)
      const body = {value: {hello: 'world'}}
      const url = '/wolf/error-test/required_object_arg';
      await mocha.post({url, headers, body, status: 200, schema})
    });

    it('required object arg ok, string type', async function() {
      const dataSchema = {
        type: "object",
        properties: {"value":{"type":"object"}},
        required: ["value"]
      }
      const schema = util.okSchema(dataSchema)
      const body = {value: JSON.stringify({hello: 'world'})}
      const url = '/wolf/error-test/required_object_arg';
      await mocha.post({url, headers, body, status: 200, schema})
    });

    it('array arg', async function() {
      const dataSchema = {
        type: "object",
        properties: {"value":{"type":"array"}},
        required: ["value"]
      }
      const schema = util.okSchema(dataSchema)
      const args = {value: JSON.stringify([1,2,3])}
      const url = '/wolf/error-test/array_arg';
      await mocha.get({url, headers, args, status: 200, schema})
    });

    it('required array arg failed, missing', async function() {
      const schema = util.failSchema('ERR_ARGS_ERROR');
      const args = {}
      const url = '/wolf/error-test/required_array_arg';
      await mocha.get({url, headers, args, status: 400, schema})
    });


    // it('required array arg failed, type invalid', async function() {
    //   const schema = util.failSchema('ERR_ARGS_ERROR');
    //   const args = {value: 'invalid'}
    //   const url = '/wolf/error-test/required_array_arg';
    //   await mocha.get({url, headers, args, status: 200, schema})
    // });


    it('required array arg ok, array type', async function() {
      const dataSchema = {
        type: "object",
        properties: {"value":{"type":"array"}},
        required: ["value"]
      }
      const schema = util.okSchema(dataSchema)
      const body = {value: [1,2,3]}
      const url = '/wolf/error-test/required_array_arg';
      await mocha.post({url, headers, body, status: 200, schema})
    });

    it('required array arg ok, string type', async function() {
      const dataSchema = {
        type: "object",
        properties: {"value":{"type":"array"}},
        required: ["value"]
      }
      const schema = util.okSchema(dataSchema)
      const body = {value: JSON.stringify([1,2,3])}
      const url = '/wolf/error-test/required_array_arg';
      await mocha.post({url, headers, body, status: 200, schema})
    });

    it('required int array arg ok, string type', async function() {
      const dataSchema = {
        type: "object",
        properties: {"value":{"type":"array"}},
        required: ["value"]
      }
      const schema = util.okSchema(dataSchema)
      const body = {value: '1,2,3,4'}
      const url = '/wolf/error-test/required_int_array_arg';
      await mocha.post({url, headers, body, status: 200, schema})
    });

  })
});
