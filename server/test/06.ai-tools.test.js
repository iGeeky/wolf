const assert = require('assert')
const { extractContext, toToolResult, injectUserContext } = require('../src/ai/tools/tool-helper')
const InternalCaller = require('../src/ai/internal-caller')

// Tool file createTools functions
const createAccessLogTools = require('../src/ai/tools/access-log-tool')
const createApplicationTools = require('../src/ai/tools/application-tool')
const createCategoryTools = require('../src/ai/tools/category-tool')
const createPermissionTools = require('../src/ai/tools/permission-tool')
const createResourceTools = require('../src/ai/tools/resource-tool')
const createRoleTools = require('../src/ai/tools/role-tool')
const createUserRoleTools = require('../src/ai/tools/user-role-tool')
const createUserTools = require('../src/ai/tools/user-tool')
const { getAllTools, SUPER_ONLY_TOOLS } = require('../src/ai/tools/index')
const constant = require('../src/util/constant')

// ---------- helpers ----------
const REQUIRED_PROPS = ['name', 'label', 'description', 'parameters', 'execute']

function assertToolShape(tool) {
  for (const prop of REQUIRED_PROPS) {
    assert.ok(tool[prop] != null, `tool "${tool.name || '(unnamed)'}" missing property: ${prop}`)
  }
  assert.strictEqual(typeof tool.execute, 'function', `tool "${tool.name}" execute should be a function`)
  // parameters should be a TypeBox schema (type: 'object')
  assert.strictEqual(tool.parameters.type, 'object', `tool "${tool.name}" parameters should be object schema`)
}

// ---------- tests ----------

describe('ai-tools', function() {
  this.timeout(15000) // loadType() may take a moment on first call

  // ----------------------------------------------------------------
  // 1. tool-helper pure functions (supplement to 03.ai-util.test.js)
  // ----------------------------------------------------------------
  describe('tool-helper', function() {
    describe('extractContext', function() {
      it('strips _userInfo and _clientIp from params', function() {
        const params = { name: 'test', _userInfo: { id: 1 }, _clientIp: '1.2.3.4' }
        const result = extractContext(params)
        assert.deepStrictEqual(result.userInfo, { id: 1 })
        assert.strictEqual(result.clientIp, '1.2.3.4')
        assert.deepStrictEqual(result.cleanParams, { name: 'test' })
        assert.strictEqual(result.cleanParams._userInfo, undefined)
        assert.strictEqual(result.cleanParams._clientIp, undefined)
      })

      it('defaults clientIp to 127.0.0.1 when missing', function() {
        const result = extractContext({ name: 'test' })
        assert.strictEqual(result.clientIp, '127.0.0.1')
      })

      it('handles empty params', function() {
        const result = extractContext({})
        assert.strictEqual(result.clientIp, '127.0.0.1')
        assert.deepStrictEqual(result.cleanParams, {})
      })
    })

    describe('toToolResult', function() {
      it('success: returns content + details', function() {
        const result = toToolResult({ ok: true, data: { id: 1 } })
        assert.deepStrictEqual(result.content, [{ type: 'text', text: '{"id":1}' }])
        assert.deepStrictEqual(result.details, { id: 1 })
      })

      it('success with nested data', function() {
        const data = { items: [{ id: 1, name: 'a' }], total: 1 }
        const result = toToolResult({ ok: true, data })
        assert.strictEqual(result.details.total, 1)
        assert.strictEqual(JSON.parse(result.content[0].text).items[0].name, 'a')
      })

      it('failure with reason throws', function() {
        assert.throws(() => toToolResult({ ok: false, reason: 'ERR_FORBIDDEN' }), { message: 'ERR_FORBIDDEN' })
      })

      it('failure with errmsg throws', function() {
        assert.throws(() => toToolResult({ ok: false, errmsg: 'bad request' }), { message: 'bad request' })
      })

      it('failure with no reason/errmsg throws ERR_SERVER_ERROR', function() {
        assert.throws(() => toToolResult({ ok: false }), { message: 'ERR_SERVER_ERROR' })
      })

      it('null result throws ERR_SERVER_ERROR', function() {
        assert.throws(() => toToolResult(null), { message: 'ERR_SERVER_ERROR' })
      })

      it('undefined result throws ERR_SERVER_ERROR', function() {
        assert.throws(() => toToolResult(undefined), { message: 'ERR_SERVER_ERROR' })
      })
    })

    describe('injectUserContext', function() {
      it('wraps execute and injects _userInfo/_clientIp into params', function() {
        const originalExecute = (id, params) => params
        const tools = [{ name: 't1', execute: originalExecute }]
        const wrapped = injectUserContext(tools, { id: 42 }, '10.0.0.1')

        assert.strictEqual(wrapped.length, 1)
        assert.strictEqual(wrapped[0].name, 't1')
        const result = wrapped[0].execute('call-1', { foo: 'bar' })
        assert.deepStrictEqual(result._userInfo, { id: 42 })
        assert.strictEqual(result._clientIp, '10.0.0.1')
        assert.strictEqual(result.foo, 'bar')
      })

      it('returns a new array (does not mutate original)', function() {
        const origExec = () => 'orig'
        const tools = [{ name: 'a', execute: origExec }]
        const wrapped = injectUserContext(tools, {}, '')
        assert.notStrictEqual(wrapped, tools)
        assert.strictEqual(tools[0].execute, origExec) // original unchanged
      })

      it('preserves all non-execute properties', function() {
        const tools = [{
          name: 'my-tool',
          label: 'Label',
          description: 'Desc',
          parameters: { type: 'object' },
          execute: () => {},
        }]
        const wrapped = injectUserContext(tools, {}, '')
        assert.strictEqual(wrapped[0].name, 'my-tool')
        assert.strictEqual(wrapped[0].label, 'Label')
        assert.strictEqual(wrapped[0].description, 'Desc')
      })
    })
  })

  // ----------------------------------------------------------------
  // 2. Tool file structure tests (each createTools returns correct tools)
  // ----------------------------------------------------------------
  describe('tool file structure', function() {
    const toolFileSpecs = [
      { name: 'access-log-tool', create: createAccessLogTools, count: 1, names: ['query_access_logs'] },
      { name: 'application-tool', create: createApplicationTools, count: 6, names: ['list_applications', 'get_application', 'create_application', 'update_application', 'delete_application', 'get_rbac_diagram'] },
      { name: 'category-tool', create: createCategoryTools, count: 4, names: ['list_categories', 'create_category', 'update_category', 'delete_category'] },
      { name: 'permission-tool', create: createPermissionTools, count: 4, names: ['list_permissions', 'create_permission', 'update_permission', 'delete_permission'] },
      { name: 'resource-tool', create: createResourceTools, count: 4, names: ['list_resources', 'create_resource', 'update_resource', 'delete_resource'] },
      { name: 'role-tool', create: createRoleTools, count: 4, names: ['list_roles', 'create_role', 'update_role', 'delete_role'] },
      { name: 'user-role-tool', create: createUserRoleTools, count: 3, names: ['get_user_roles', 'set_user_roles', 'delete_user_roles'] },
      { name: 'user-tool', create: createUserTools, count: 5, names: ['list_users', 'create_user', 'update_user', 'delete_user', 'reset_user_password'] },
    ]

    for (const spec of toolFileSpecs) {
      describe(spec.name, function() {
        let tools

        before(async function() {
          tools = await spec.create()
        })

        it(`returns ${spec.count} tools`, function() {
          assert.strictEqual(tools.length, spec.count)
        })

        it('each tool has required properties', function() {
          for (const tool of tools) {
            assertToolShape(tool)
          }
        })

        it('tool names match expected list', function() {
          const names = tools.map(t => t.name)
          assert.deepStrictEqual(names, spec.names)
        })

        it('each tool has a non-empty label and description', function() {
          for (const tool of tools) {
            assert.ok(tool.label.length > 0, `${tool.name} label is empty`)
            assert.ok(tool.description.length > 0, `${tool.name} description is empty`)
          }
        })
      })
    }
  })

  // ----------------------------------------------------------------
  // 3. Execute function tests (mock InternalCaller.call)
  // ----------------------------------------------------------------
  describe('tool execute functions', function() {
    const originalCall = InternalCaller.call

    afterEach(function() {
      InternalCaller.call = originalCall
    })

    it('access-log query_access_logs: success path', async function() {
      InternalCaller.call = async function(ControllerClass, method, opts) {
        assert.strictEqual(method, 'list')
        assert.strictEqual(opts.method, 'GET')
        assert.strictEqual(opts.args.appID, 'test-app')
        assert.deepStrictEqual(opts.userInfo, { id: 1 })
        return { ok: true, data: { logs: [], total: 0 } }
      }
      const tools = await createAccessLogTools()
      const tool = tools.find(t => t.name === 'query_access_logs')
      const result = await tool.execute('call-1', { appID: 'test-app', _userInfo: { id: 1 }, _clientIp: '10.0.0.1' })
      assert.deepStrictEqual(result.details, { logs: [], total: 0 })
    })

    it('access-log query_access_logs: failure path throws', async function() {
      InternalCaller.call = async function() {
        return { ok: false, reason: 'ERR_ACCESS_DENIED' }
      }
      const tools = await createAccessLogTools()
      const tool = tools.find(t => t.name === 'query_access_logs')
      await assert.rejects(
        () => tool.execute('call-1', { appID: 'test', _userInfo: {}, _clientIp: '1.1.1.1' }),
        { message: 'ERR_ACCESS_DENIED' }
      )
    })

    it('application list_applications: success path', async function() {
      InternalCaller.call = async function(ControllerClass, method, opts) {
        assert.strictEqual(method, 'list')
        assert.strictEqual(opts.method, 'GET')
        return { ok: true, data: { applications: [{ id: 'app1' }], total: 1 } }
      }
      const tools = await createApplicationTools()
      const tool = tools.find(t => t.name === 'list_applications')
      const result = await tool.execute('call-1', { _userInfo: { id: 1 }, _clientIp: '1.1.1.1' })
      assert.strictEqual(result.details.applications.length, 1)
    })

    it('application create_application: success path', async function() {
      InternalCaller.call = async function(ControllerClass, method, opts) {
        assert.strictEqual(method, 'post')
        assert.strictEqual(opts.method, 'POST')
        assert.strictEqual(opts.args.id, 'new-app')
        return { ok: true, data: { id: 'new-app' } }
      }
      const tools = await createApplicationTools()
      const tool = tools.find(t => t.name === 'create_application')
      const result = await tool.execute('call-1', { id: 'new-app', name: 'New', _userInfo: { id: 1 }, _clientIp: '1.1.1.1' })
      assert.strictEqual(result.details.id, 'new-app')
    })

    it('application delete_application: failure path', async function() {
      InternalCaller.call = async function() {
        return { ok: false, errmsg: 'app not found' }
      }
      const tools = await createApplicationTools()
      const tool = tools.find(t => t.name === 'delete_application')
      await assert.rejects(
        () => tool.execute('call-1', { id: 'missing', _userInfo: { id: 1 }, _clientIp: '1.1.1.1' }),
        { message: 'app not found' }
      )
    })

    it('role create_role: success path', async function() {
      InternalCaller.call = async function(ControllerClass, method, opts) {
        assert.strictEqual(method, 'post')
        assert.strictEqual(opts.args.appID, 'my-app')
        assert.strictEqual(opts.args.name, 'Admin')
        return { ok: true, data: { id: 'admin-role', name: 'Admin' } }
      }
      const tools = await createRoleTools()
      const tool = tools.find(t => t.name === 'create_role')
      const result = await tool.execute('call-1', {
        appID: 'my-app', id: 'admin-role', name: 'Admin',
        _userInfo: { id: 1 }, _clientIp: '1.1.1.1',
      })
      assert.strictEqual(result.details.name, 'Admin')
    })

    it('user create_user: success path', async function() {
      InternalCaller.call = async function(ControllerClass, method, opts) {
        assert.strictEqual(method, 'post')
        assert.strictEqual(opts.args.username, 'newuser')
        return { ok: true, data: { id: 100, username: 'newuser' } }
      }
      const tools = await createUserTools()
      const tool = tools.find(t => t.name === 'create_user')
      const result = await tool.execute('call-1', {
        username: 'newuser', nickname: 'New',
        _userInfo: { id: 1 }, _clientIp: '1.1.1.1',
      })
      assert.strictEqual(result.details.username, 'newuser')
    })

    it('user reset_user_password: failure path', async function() {
      InternalCaller.call = async function() {
        return { ok: false, reason: 'ERR_USER_NOT_FOUND' }
      }
      const tools = await createUserTools()
      const tool = tools.find(t => t.name === 'reset_user_password')
      await assert.rejects(
        () => tool.execute('call-1', { id: 999, _userInfo: { id: 1 }, _clientIp: '1.1.1.1' }),
        { message: 'ERR_USER_NOT_FOUND' }
      )
    })

    it('user-role set_user_roles: success path', async function() {
      InternalCaller.call = async function(ControllerClass, method, opts) {
        assert.strictEqual(method, 'set')
        assert.strictEqual(opts.method, 'POST')
        return { ok: true, data: { userID: 5, appID: 'app1' } }
      }
      const tools = await createUserRoleTools()
      const tool = tools.find(t => t.name === 'set_user_roles')
      const result = await tool.execute('call-1', {
        userID: 5, appID: 'app1', roleIDs: ['admin'],
        _userInfo: { id: 1 }, _clientIp: '1.1.1.1',
      })
      assert.strictEqual(result.details.userID, 5)
    })

    it('category create_category: success path', async function() {
      InternalCaller.call = async function(ControllerClass, method, opts) {
        assert.strictEqual(method, 'post')
        return { ok: true, data: { id: 1, name: 'System' } }
      }
      const tools = await createCategoryTools()
      const tool = tools.find(t => t.name === 'create_category')
      const result = await tool.execute('call-1', {
        appID: 'app1', name: 'System',
        _userInfo: { id: 1 }, _clientIp: '1.1.1.1',
      })
      assert.strictEqual(result.details.name, 'System')
    })

    it('permission list_permissions: success path', async function() {
      InternalCaller.call = async function(ControllerClass, method, opts) {
        assert.strictEqual(method, 'list')
        return { ok: true, data: { permissions: [], total: 0 } }
      }
      const tools = await createPermissionTools()
      const tool = tools.find(t => t.name === 'list_permissions')
      const result = await tool.execute('call-1', {
        appID: 'app1',
        _userInfo: { id: 1 }, _clientIp: '1.1.1.1',
      })
      assert.deepStrictEqual(result.details.permissions, [])
    })

    it('resource create_resource: success path', async function() {
      InternalCaller.call = async function(ControllerClass, method, opts) {
        assert.strictEqual(method, 'post')
        assert.strictEqual(opts.args.matchType, 'equal')
        return { ok: true, data: { id: 1 } }
      }
      const tools = await createResourceTools()
      const tool = tools.find(t => t.name === 'create_resource')
      const result = await tool.execute('call-1', {
        appID: 'app1', matchType: 'equal', name: '/api/test', action: 'GET', permID: 'p1',
        _userInfo: { id: 1 }, _clientIp: '1.1.1.1',
      })
      assert.strictEqual(result.details.id, 1)
    })

    it('null result from InternalCaller.call throws ERR_SERVER_ERROR', async function() {
      InternalCaller.call = async function() {
        return null
      }
      const tools = await createAccessLogTools()
      const tool = tools[0]
      await assert.rejects(
        () => tool.execute('call-1', { appID: 'test', _userInfo: {}, _clientIp: '1.1.1.1' }),
        { message: 'ERR_SERVER_ERROR' }
      )
    })

    it('extractContext strips _userInfo/_clientIp before passing to InternalCaller.call', async function() {
      let capturedArgs
      InternalCaller.call = async function(ControllerClass, method, opts) {
        capturedArgs = opts.args
        return { ok: true, data: {} }
      }
      const tools = await createAccessLogTools()
      await tools[0].execute('call-1', {
        appID: 'test', _userInfo: { id: 1 }, _clientIp: '1.1.1.1',
      })
      // cleanParams should not contain injected fields
      assert.strictEqual(capturedArgs._userInfo, undefined)
      assert.strictEqual(capturedArgs._clientIp, undefined)
      assert.strictEqual(capturedArgs.appID, 'test')
    })
  })

  // ----------------------------------------------------------------
  // 4. All tools execute functions (data-driven, 31 tools)
  // ----------------------------------------------------------------
  describe('All tools execute functions', function() {
    const toolTestCases = [
      // access-log-tool.js (1)
      { file: 'access-log-tool', create: createAccessLogTools, toolName: 'query_access_logs', method: 'list', httpMethod: 'GET', path: '/wolf/access-log/list' },
      // application-tool.js (6)
      { file: 'application-tool', create: createApplicationTools, toolName: 'list_applications', method: 'list', httpMethod: 'GET', path: '/wolf/application/list' },
      { file: 'application-tool', create: createApplicationTools, toolName: 'get_application', method: 'get', httpMethod: 'GET', path: '/wolf/application/get' },
      { file: 'application-tool', create: createApplicationTools, toolName: 'create_application', method: 'post', httpMethod: 'POST', path: '/wolf/application' },
      { file: 'application-tool', create: createApplicationTools, toolName: 'update_application', method: 'put', httpMethod: 'PUT', path: '/wolf/application' },
      { file: 'application-tool', create: createApplicationTools, toolName: 'delete_application', method: 'delete', httpMethod: 'DELETE', path: '/wolf/application' },
      { file: 'application-tool', create: createApplicationTools, toolName: 'get_rbac_diagram', method: 'diagram', httpMethod: 'GET', path: '/wolf/application/diagram' },
      // category-tool.js (4)
      { file: 'category-tool', create: createCategoryTools, toolName: 'list_categories', method: 'list', httpMethod: 'GET', path: '/wolf/category/list' },
      { file: 'category-tool', create: createCategoryTools, toolName: 'create_category', method: 'post', httpMethod: 'POST', path: '/wolf/category' },
      { file: 'category-tool', create: createCategoryTools, toolName: 'update_category', method: 'put', httpMethod: 'PUT', path: '/wolf/category' },
      { file: 'category-tool', create: createCategoryTools, toolName: 'delete_category', method: 'delete', httpMethod: 'DELETE', path: '/wolf/category' },
      // permission-tool.js (4)
      { file: 'permission-tool', create: createPermissionTools, toolName: 'list_permissions', method: 'list', httpMethod: 'GET', path: '/wolf/permission/list' },
      { file: 'permission-tool', create: createPermissionTools, toolName: 'create_permission', method: 'post', httpMethod: 'POST', path: '/wolf/permission' },
      { file: 'permission-tool', create: createPermissionTools, toolName: 'update_permission', method: 'put', httpMethod: 'PUT', path: '/wolf/permission' },
      { file: 'permission-tool', create: createPermissionTools, toolName: 'delete_permission', method: 'delete', httpMethod: 'DELETE', path: '/wolf/permission' },
      // resource-tool.js (4)
      { file: 'resource-tool', create: createResourceTools, toolName: 'list_resources', method: 'list', httpMethod: 'GET', path: '/wolf/resource/list' },
      { file: 'resource-tool', create: createResourceTools, toolName: 'create_resource', method: 'post', httpMethod: 'POST', path: '/wolf/resource' },
      { file: 'resource-tool', create: createResourceTools, toolName: 'update_resource', method: 'put', httpMethod: 'PUT', path: '/wolf/resource' },
      { file: 'resource-tool', create: createResourceTools, toolName: 'delete_resource', method: 'delete', httpMethod: 'DELETE', path: '/wolf/resource' },
      // role-tool.js (4)
      { file: 'role-tool', create: createRoleTools, toolName: 'list_roles', method: 'list', httpMethod: 'GET', path: '/wolf/role/list' },
      { file: 'role-tool', create: createRoleTools, toolName: 'create_role', method: 'post', httpMethod: 'POST', path: '/wolf/role' },
      { file: 'role-tool', create: createRoleTools, toolName: 'update_role', method: 'put', httpMethod: 'PUT', path: '/wolf/role' },
      { file: 'role-tool', create: createRoleTools, toolName: 'delete_role', method: 'delete', httpMethod: 'DELETE', path: '/wolf/role' },
      // user-role-tool.js (3)
      { file: 'user-role-tool', create: createUserRoleTools, toolName: 'get_user_roles', method: 'get', httpMethod: 'GET', path: '/wolf/user-role' },
      { file: 'user-role-tool', create: createUserRoleTools, toolName: 'set_user_roles', method: 'set', httpMethod: 'POST', path: '/wolf/user-role/set' },
      { file: 'user-role-tool', create: createUserRoleTools, toolName: 'delete_user_roles', method: 'delete', httpMethod: 'DELETE', path: '/wolf/user-role' },
      // user-tool.js (5)
      { file: 'user-tool', create: createUserTools, toolName: 'list_users', method: 'list', httpMethod: 'GET', path: '/wolf/user/list' },
      { file: 'user-tool', create: createUserTools, toolName: 'create_user', method: 'post', httpMethod: 'POST', path: '/wolf/user' },
      { file: 'user-tool', create: createUserTools, toolName: 'update_user', method: 'put', httpMethod: 'PUT', path: '/wolf/user' },
      { file: 'user-tool', create: createUserTools, toolName: 'delete_user', method: 'delete', httpMethod: 'DELETE', path: '/wolf/user' },
      { file: 'user-tool', create: createUserTools, toolName: 'reset_user_password', method: 'resetPwd', httpMethod: 'PUT', path: '/wolf/user/resetPwd' },
    ]

    // Cache loaded tools per file to avoid re-creating
    let toolCache = {}
    const originalCall = InternalCaller.call

    before(async function() {
      for (const tc of toolTestCases) {
        if (!toolCache[tc.file]) {
          toolCache[tc.file] = await tc.create()
        }
      }
    })

    afterEach(function() {
      InternalCaller.call = originalCall
    })

    it(`should have exactly ${toolTestCases.length} test cases covering all 31 tools`, function() {
      assert.strictEqual(toolTestCases.length, 31)
    })

    for (const tc of toolTestCases) {
      // Success path test
      it(`${tc.toolName} (${tc.file}): calls InternalCaller with method='${tc.method}', HTTP ${tc.httpMethod}, path='${tc.path}'`, async function() {
        let capturedOpts
        const fakeResult = { ok: true, data: { id: 1, test: true } }
        InternalCaller.call = async function(ControllerClass, method, opts) {
          capturedOpts = { ControllerClass, method, opts }
          return fakeResult
        }

        const tools = toolCache[tc.file]
        const tool = tools.find(t => t.name === tc.toolName)
        assert.ok(tool, `Tool '${tc.toolName}' not found in ${tc.file}`)

        const params = { key: 'test-value', _userInfo: { id: 42, username: 'tester' }, _clientIp: '10.0.0.1' }
        const result = await tool.execute('call-test', params)

        // Verify method name
        assert.strictEqual(capturedOpts.method, tc.method, `${tc.toolName}: expected method '${tc.method}', got '${capturedOpts.method}'`)

        // Verify HTTP method in opts
        assert.strictEqual(capturedOpts.opts.method, tc.httpMethod, `${tc.toolName}: expected HTTP method '${tc.httpMethod}', got '${capturedOpts.opts.method}'`)

        // Verify path
        assert.strictEqual(capturedOpts.opts.path, tc.path, `${tc.toolName}: expected path '${tc.path}', got '${capturedOpts.opts.path}'`)

        // Verify _userInfo and _clientIp are stripped from args
        assert.strictEqual(capturedOpts.opts.args._userInfo, undefined, `${tc.toolName}: _userInfo should be stripped from args`)
        assert.strictEqual(capturedOpts.opts.args._clientIp, undefined, `${tc.toolName}: _clientIp should be stripped from args`)

        // Verify the original params are preserved in args
        assert.strictEqual(capturedOpts.opts.args.key, 'test-value', `${tc.toolName}: original params should be in args`)

        // Verify userInfo is passed separately
        assert.deepStrictEqual(capturedOpts.opts.userInfo, { id: 42, username: 'tester' }, `${tc.toolName}: userInfo should be passed separately`)

        // Verify clientIp is passed separately
        assert.strictEqual(capturedOpts.opts.clientIp, '10.0.0.1', `${tc.toolName}: clientIp should be passed separately`)

        // Verify success return format
        assert.ok(result.content != null, `${tc.toolName}: result should have content`)
        assert.deepStrictEqual(result.details, { id: 1, test: true }, `${tc.toolName}: result.details should match`)
      })

      // Failure path test
      it(`${tc.toolName} (${tc.file}): throws on failure with reason`, async function() {
        InternalCaller.call = async function() {
          return { ok: false, reason: 'ERR_SOME_ERROR' }
        }

        const tools = toolCache[tc.file]
        const tool = tools.find(t => t.name === tc.toolName)

        await assert.rejects(
          () => tool.execute('call-fail', { _userInfo: { id: 1 }, _clientIp: '1.1.1.1' }),
          { message: 'ERR_SOME_ERROR' }
        )
      })

      // Failure with errmsg test
      it(`${tc.toolName} (${tc.file}): throws on failure with errmsg`, async function() {
        InternalCaller.call = async function() {
          return { ok: false, errmsg: 'something went wrong' }
        }

        const tools = toolCache[tc.file]
        const tool = tools.find(t => t.name === tc.toolName)

        await assert.rejects(
          () => tool.execute('call-fail', { _userInfo: { id: 1 }, _clientIp: '1.1.1.1' }),
          { message: 'something went wrong' }
        )
      })

      // Null result test
      it(`${tc.toolName} (${tc.file}): throws ERR_SERVER_ERROR when InternalCaller returns null`, async function() {
        InternalCaller.call = async function() {
          return null
        }

        const tools = toolCache[tc.file]
        const tool = tools.find(t => t.name === tc.toolName)

        await assert.rejects(
          () => tool.execute('call-null', { _userInfo: { id: 1 }, _clientIp: '1.1.1.1' }),
          { message: 'ERR_SERVER_ERROR' }
        )
      })
    }
  })

  // ----------------------------------------------------------------
  // 5. getAllTools filtering
  // ----------------------------------------------------------------
  describe('getAllTools', function() {
    const superUser = { id: 1, username: 'root', manager: constant.Manager.super }
    const adminUser = { id: 2, username: 'admin', manager: constant.Manager.admin }
    const regularUser = { id: 3, username: 'user', manager: '' }

    it('super user gets all 31 tools', async function() {
      const tools = await getAllTools(superUser, '1.1.1.1')
      assert.strictEqual(tools.length, 31)
    })

    it('admin user gets 24 tools (7 super-only removed)', async function() {
      const tools = await getAllTools(adminUser, '1.1.1.1')
      assert.strictEqual(tools.length, 24)
      // Verify none of the super-only tools are present
      const names = tools.map(t => t.name)
      for (const superName of SUPER_ONLY_TOOLS) {
        assert.ok(!names.includes(superName), `admin should not have super-only tool: ${superName}`)
      }
    })

    it('regular user (non-admin, non-super) gets all 31 tools', async function() {
      const tools = await getAllTools(regularUser, '1.1.1.1')
      assert.strictEqual(tools.length, 31)
    })

    it('SUPER_ONLY_TOOLS contains exactly 7 expected names', function() {
      const expected = [
        'create_application', 'update_application', 'delete_application',
        'create_user', 'update_user', 'delete_user', 'reset_user_password',
      ]
      assert.strictEqual(SUPER_ONLY_TOOLS.size, 7)
      for (const name of expected) {
        assert.ok(SUPER_ONLY_TOOLS.has(name), `SUPER_ONLY_TOOLS missing: ${name}`)
      }
    })

    it('all tools from getAllTools have required properties', async function() {
      const tools = await getAllTools(superUser, '1.1.1.1')
      for (const tool of tools) {
        assertToolShape(tool)
      }
    })

    it('injectUserContext: wrapped execute injects userInfo into params', async function() {
      const tools = await getAllTools(superUser, '10.0.0.1')
      // Pick any tool and call its execute with minimal params
      // We need to mock InternalCaller.call to avoid real controller calls
      const originalCall = InternalCaller.call
      try {
        let capturedOpts
        InternalCaller.call = async function(ControllerClass, method, opts) {
          capturedOpts = opts
          return { ok: true, data: { id: 1 } }
        }
        const listTool = tools.find(t => t.name === 'list_applications')
        await listTool.execute('call-1', { key: 'test' })
        assert.deepStrictEqual(capturedOpts.userInfo, superUser)
        assert.strictEqual(capturedOpts.clientIp, '10.0.0.1')
        assert.strictEqual(capturedOpts.args.key, 'test')
        assert.strictEqual(capturedOpts.args._userInfo, undefined)
      } finally {
        InternalCaller.call = originalCall
      }
    })

    it('admin filtered tools still have correct structure', async function() {
      const tools = await getAllTools(adminUser, '1.1.1.1')
      assert.strictEqual(tools.length, 24)
      for (const tool of tools) {
        assertToolShape(tool)
      }
    })

    it('unique tool names (no duplicates)', async function() {
      const tools = await getAllTools(superUser, '1.1.1.1')
      const names = tools.map(t => t.name)
      const unique = new Set(names)
      assert.strictEqual(names.length, unique.size, `Duplicate tool names found: ${names.filter((n, i) => names.indexOf(n) !== i)}`)
    })
  })
})
