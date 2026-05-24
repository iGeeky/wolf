'use strict'

const assert = require('assert')

// ============================================================
// WolfCache (NodeCache path)
// ============================================================
// Force NodeCache before loading wolf-cache
const config = require('../conf/config')
config.memCacheByRedis = false
delete require.cache[require.resolve('../src/util/wolf-cache')]
const { WolfCache } = require('../src/util/wolf-cache')

// ============================================================
// Sequelize model helpers
// ============================================================
const Sequelize = require('sequelize')
const sequelize = require('../src/util/sequelize')
const DataExistError = require('../src/errors/data-exist-error')
const DataNotFoundError = require('../src/errors/data-not-found-error')
const ArgsError = require('../src/errors/args-error')
const BackendError = require('../src/errors/backend-error')

// Define a throwaway model to get the patched helper methods
const TestModel = sequelize.define('__test_helper_model', {
  name: { type: Sequelize.STRING },
}, { timestamps: false })

const checkNotExist = TestModel.checkNotExist
const checkExist = TestModel.checkExist
const upsertFn = TestModel.upsert
const mustUpdate = TestModel.mustUpdate

// ============================================================
// Service
// ============================================================
const Service = require('../src/service/service')

function mockCtx(method, url, body, query) {
  return {
    method: method || 'GET',
    url: url || '/test',
    request: {
      method: method || 'GET',
      body: body || {},
      headers: {},
    },
    query: query || {},
    status: 200,
    body: null,
    set: () => {},
  }
}

// ============================================================
// Tests
// ============================================================
describe('service-util', function() {

  // ----------------------------------------------------------
  // WolfCache
  // ----------------------------------------------------------
  describe('WolfCache (NodeCache)', function() {
    let cache
    before(function() {
      cache = new WolfCache('test-prefix')
    })

    afterEach(async function() {
      await cache.flushAll()
    })

    describe('set and get', function() {
      it('stores and retrieves string', async function() {
        await cache.set('key1', 'value1')
        const val = await cache.get('key1')
        assert.strictEqual(val, 'value1')
      })

      it('stores and retrieves object', async function() {
        await cache.set('key2', {a: 1, b: 'two'})
        const val = await cache.get('key2')
        assert.deepStrictEqual(val, {a: 1, b: 'two'})
      })

      it('stores and retrieves nested object', async function() {
        const obj = {a: {b: {c: [1, 2, 3]}}}
        await cache.set('key-nested', obj)
        const val = await cache.get('key-nested')
        assert.deepStrictEqual(val, obj)
      })

      it('stores and retrieves number', async function() {
        await cache.set('key-num', 42)
        const val = await cache.get('key-num')
        assert.strictEqual(val, 42)
      })

      it('stores and retrieves null', async function() {
        await cache.set('key-null', null)
        const val = await cache.get('key-null')
        assert.strictEqual(val, null)
      })

      it('stores and retrieves empty string', async function() {
        await cache.set('key-empty', '')
        const val = await cache.get('key-empty')
        assert.strictEqual(val, '')
      })

      it('stores and retrieves falsy values (false, 0)', async function() {
        await cache.set('key-false', false)
        assert.strictEqual(await cache.get('key-false'), false)
        await cache.set('key-zero', 0)
        assert.strictEqual(await cache.get('key-zero'), 0)
      })

      it('overwrites existing value', async function() {
        await cache.set('key-ow', 'first')
        await cache.set('key-ow', 'second')
        const val = await cache.get('key-ow')
        assert.strictEqual(val, 'second')
      })
    })

    describe('get non-existent', function() {
      it('returns undefined for missing key', async function() {
        const val = await cache.get('non-existent-key')
        assert.strictEqual(val, undefined)
      })
    })

    describe('del', function() {
      it('removes existing key', async function() {
        await cache.set('key4', 'val')
        await cache.del('key4')
        const val = await cache.get('key4')
        assert.strictEqual(val, undefined)
      })

      it('does not throw for non-existent key', async function() {
        await cache.del('non-existent-key')
      })
    })

    describe('flushAll', function() {
      it('clears all keys', async function() {
        await cache.set('key5', 'val')
        await cache.set('key6', 'val2')
        await cache.flushAll()
        assert.strictEqual(await cache.get('key5'), undefined)
        assert.strictEqual(await cache.get('key6'), undefined)
      })
    })

    describe('instance properties', function() {
      it('cacheByRedis is false for NodeCache', function() {
        assert.strictEqual(cache.cacheByRedis, false)
      })

      it('different instances are isolated', async function() {
        const cache1 = new WolfCache('p1')
        const cache2 = new WolfCache('p2')
        await cache1.set('shared', 'v1')
        await cache2.set('shared', 'v2')
        assert.strictEqual(await cache1.get('shared'), 'v1')
        assert.strictEqual(await cache2.get('shared'), 'v2')
      })
    })
  })

  // ----------------------------------------------------------
  // Sequelize model helpers
  // ----------------------------------------------------------
  describe('sequelize model helpers', function() {

    describe('checkNotExist', function() {
      it('passes when findOne returns null', async function() {
        const mock = {findOne: async () => null}
        const result = await checkNotExist.call(mock, {name: 'test'}, 'should not exist')
        assert.strictEqual(result, null)
      })

      it('throws DataExistError when record found', async function() {
        const mock = {findOne: async () => ({id: 1})}
        await assert.rejects(
          () => checkNotExist.call(mock, {name: 'existing'}, 'already exists'),
          (err) => err instanceof DataExistError,
        )
      })

      it('throws with correct code', async function() {
        const mock = {findOne: async () => ({id: 1})}
        try {
          await checkNotExist.call(mock, {name: 'test'}, 'duplicate name')
          assert.fail('should have thrown')
        } catch (err) {
          assert(err instanceof DataExistError)
          assert.strictEqual(err.code, 'duplicate name')
        }
      })
    })

    describe('checkExist', function() {
      it('returns object when found', async function() {
        const found = {id: 1, name: 'test'}
        const mock = {findOne: async () => found}
        const result = await checkExist.call(mock, {name: 'test'}, 'not found')
        assert.deepStrictEqual(result, found)
      })

      it('throws DataNotFoundError when not found', async function() {
        const mock = {findOne: async () => null}
        await assert.rejects(
          () => checkExist.call(mock, {name: 'missing'}, 'not found'),
          (err) => err instanceof DataNotFoundError,
        )
      })

      it('throws with correct code', async function() {
        const mock = {findOne: async () => null}
        try {
          await checkExist.call(mock, {id: 999}, 'ERR_NOT_FOUND')
          assert.fail('should have thrown')
        } catch (err) {
          assert(err instanceof DataNotFoundError)
          assert.strictEqual(err.code, 'ERR_NOT_FOUND')
        }
      })
    })

    describe('upsert', function() {
      it('updates when record exists', async function() {
        const existing = {
          id: 1, name: 'old',
          async update(values) { Object.assign(this, values); return this },
        }
        const mock = {findOne: async () => existing}
        const result = await upsertFn.call(mock, {name: 'new'}, {where: {id: 1}})
        assert.strictEqual(result.operation, 'update')
        assert.strictEqual(result.newValues.name, 'new')
      })

      it('removes createTime on update', async function() {
        let captured = null
        const existing = {
          id: 1,
          async update(values) { captured = {...values}; return this },
        }
        const mock = {findOne: async () => existing}
        await upsertFn.call(mock, {name: 'new', createTime: '2024-01-01'}, {where: {id: 1}})
        assert.strictEqual(captured.createTime, undefined)
        assert.strictEqual(captured.name, 'new')
      })

      it('inserts when record does not exist', async function() {
        const mock = {
          findOne: async () => null,
          create: async (values) => ({id: 2, ...values}),
        }
        const result = await upsertFn.call(mock, {name: 'brand new'}, {where: {name: 'brand new'}})
        assert.strictEqual(result.operation, 'insert')
        assert.strictEqual(result.newValues.name, 'brand new')
        assert.strictEqual(result.newValues.id, 2)
      })
    })

    describe('mustUpdate', function() {
      it('returns effects and newValues on success (postgres)', async function() {
        const row = {id: 1, name: 'updated'}
        const mock = {
          update: async () => [1, [row]],
          getTableName: () => 'test_table',
        }
        const result = await mustUpdate.call(mock, {name: 'updated'}, {where: {id: 1}})
        assert.strictEqual(result.effects, 1)
        assert.deepStrictEqual(result.newValues, row)
      })

      it('throws BackendError when result is not array', async function() {
        const mock = {
          update: async () => null,
          getTableName: () => 'test_table',
        }
        await assert.rejects(
          () => mustUpdate.call(mock, {name: 'x'}, {where: {id: 1}}),
          (err) => err instanceof BackendError,
        )
      })

      it('throws BackendError when result length is not 2', async function() {
        const mock = {
          update: async () => [1],
          getTableName: () => 'test_table',
        }
        await assert.rejects(
          () => mustUpdate.call(mock, {name: 'x'}, {where: {id: 1}}),
          (err) => err instanceof BackendError,
        )
      })

      it('throws ArgsError when effects < minEffects', async function() {
        const mock = {
          update: async () => [0, []],
          getTableName: () => 'test_table',
        }
        await assert.rejects(
          () => mustUpdate.call(mock, {name: 'x'}, {where: {id: 999}}),
          (err) => err instanceof ArgsError,
        )
      })

      it('returns newValues as list when returningAsList', async function() {
        const rows = [{id: 1, name: 'a'}, {id: 2, name: 'b'}]
        const mock = {
          update: async () => [2, rows],
          getTableName: () => 'test_table',
        }
        const result = await mustUpdate.call(mock, {name: 'x'}, {where: {}, returningAsList: true})
        assert.strictEqual(result.effects, 2)
        assert.deepStrictEqual(result.newValues, rows)
      })

      it('defaults minEffects to 1 when not provided', async function() {
        const mock = {
          update: async () => [0, []],
          getTableName: () => 'test_table',
        }
        await assert.rejects(
          () => mustUpdate.call(mock, {name: 'x'}, {where: {id: 999}}),
          (err) => err instanceof ArgsError,
        )
      })

      it('sets returning=true on options', async function() {
        const options = {where: {id: 1}}
        const mock = {
          update: async () => [1, [{id: 1}]],
          getTableName: () => 'test_table',
        }
        await mustUpdate.call(mock, {name: 'x'}, options)
        assert.strictEqual(options.returning, true)
      })

      it('allows effects=0 when minEffects=0', async function() {
        const mock = {
          update: async () => [0, []],
          getTableName: () => 'test_table',
        }
        const result = await mustUpdate.call(mock, {name: 'x'}, {where: {id: 999}, minEffects: 0})
        assert.strictEqual(result.effects, 0)
      })

      it('respects custom minEffects', async function() {
        const mock = {
          update: async () => [1, [{id: 1}]],
          getTableName: () => 'test_table',
        }
        await assert.rejects(
          () => mustUpdate.call(mock, {name: 'x'}, {where: {id: 1}, minEffects: 2}),
          (err) => err instanceof ArgsError,
        )
      })
    })
  })

  // ----------------------------------------------------------
  // Service
  // ----------------------------------------------------------
  describe('Service', function() {

    describe('constructor', function() {
      it('extracts method from ctx', function() {
        const ctx = mockCtx('POST', '/api/test', {name: 'hello'})
        const svc = new Service(ctx)
        assert.strictEqual(svc.method, 'POST')
      })

      it('extracts args from body for POST', function() {
        const ctx = mockCtx('POST', '/api/test', {name: 'hello'})
        const svc = new Service(ctx)
        assert.deepStrictEqual(svc.args, {name: 'hello'})
      })

      it('extracts args from query for GET', function() {
        const ctx = mockCtx('GET', '/api/test', {}, {page: '1'})
        const svc = new Service(ctx)
        assert.deepStrictEqual(svc.args, {page: '1'})
      })

      it('stores ctx reference', function() {
        const ctx = mockCtx()
        const svc = new Service(ctx)
        assert.strictEqual(svc.ctx, ctx)
      })

      it('transaction is initially null', function() {
        const ctx = mockCtx()
        const svc = new Service(ctx)
        assert.strictEqual(svc.transaction, null)
      })
    })

    describe('do', function() {
      it('calls bizMethod when it exists', async function() {
        const ctx = mockCtx()
        const svc = new Service(ctx)
        svc.myMethod = async function() { this.success({ok: true}) }
        await svc.do('myMethod')
        assert.strictEqual(ctx.status, 200)
        assert.strictEqual(ctx.body.ok, true)
      })

      it('calls bizMethodEx when it exists on instance', async function() {
        const ctx = mockCtx()
        const svc = new Service(ctx)
        svc.fallback = async function() { this.success({fallback: true}) }
        await svc.do('nonExistent', 'fallback')
        assert.strictEqual(ctx.body.data.fallback, true)
      })

      it('bizMethodEx takes priority when both exist', async function() {
        const ctx = mockCtx()
        const svc = new Service(ctx)
        svc.primary = async function() { this.success({called: 'primary'}) }
        svc.fallback = async function() { this.success({called: 'fallback'}) }
        await svc.do('primary', 'fallback')
        assert.strictEqual(ctx.body.data.called, 'fallback')
      })

      it('uses bizMethod when bizMethodEx not on instance', async function() {
        const ctx = mockCtx()
        const svc = new Service(ctx)
        svc.primary = async function() { this.success({called: 'primary'}) }
        await svc.do('primary', 'nonExistentEx')
        assert.strictEqual(ctx.body.data.called, 'primary')
      })

      it('returns 404 when method not found', async function() {
        const ctx = mockCtx()
        const svc = new Service(ctx)
        await svc.do('nonExistent')
        assert.strictEqual(ctx.status, 404)
        assert.strictEqual(ctx.body.ok, false)
      })

      it('404 reason includes method name', async function() {
        const ctx = mockCtx()
        const svc = new Service(ctx)
        await svc.do('myMissing')
        assert.ok(ctx.body.reason.includes('myMissing'))
      })

      it('returns 404 when both methods not found', async function() {
        const ctx = mockCtx()
        const svc = new Service(ctx)
        await svc.do('a', 'b')
        assert.strictEqual(ctx.status, 404)
      })

      it('bizMethod has correct this context', async function() {
        const ctx = mockCtx('POST', '/check', {x: 1})
        const svc = new Service(ctx)
        svc.checkCtx = async function() {
          assert.strictEqual(this.ctx, ctx)
          assert.strictEqual(this.method, 'POST')
          this.success({ok: true})
        }
        await svc.do('checkCtx')
        assert.strictEqual(ctx.body.ok, true)
      })
    })

    describe('fail', function() {
      it('sets status and body with reason', function() {
        const ctx = mockCtx()
        const svc = new Service(ctx)
        svc.fail(400, 'ERR_BAD')
        assert.strictEqual(ctx.status, 400)
        assert.strictEqual(ctx.body.ok, false)
        assert.strictEqual(ctx.body.reason, 'ERR_BAD')
      })

      it('includes data when provided', function() {
        const ctx = mockCtx()
        const svc = new Service(ctx)
        svc.fail(403, 'ERR_FORBIDDEN', {detail: 'no access'})
        assert.strictEqual(ctx.status, 403)
        assert.deepStrictEqual(ctx.body.data, {detail: 'no access'})
      })

      it('omits data when not provided', function() {
        const ctx = mockCtx()
        const svc = new Service(ctx)
        svc.fail(500, 'ERR')
        assert.strictEqual(ctx.body.data, undefined)
      })
    })

    describe('fail2', function() {
      it('sets status, reason, and errmsg', function() {
        const ctx = mockCtx()
        const svc = new Service(ctx)
        svc.fail2(500, 'ERR', 'detailed error')
        assert.strictEqual(ctx.status, 500)
        assert.strictEqual(ctx.body.ok, false)
        assert.strictEqual(ctx.body.reason, 'ERR')
        assert.strictEqual(ctx.body.errmsg, 'detailed error')
      })

      it('includes data when provided', function() {
        const ctx = mockCtx()
        const svc = new Service(ctx)
        svc.fail2(400, 'ERR', 'bad input', {field: 'name'})
        assert.deepStrictEqual(ctx.body.data, {field: 'name'})
      })
    })

    describe('success', function() {
      it('sets 200 and ok=true with data', function() {
        const ctx = mockCtx()
        const svc = new Service(ctx)
        svc.success({id: 1, name: 'test'})
        assert.strictEqual(ctx.status, 200)
        assert.strictEqual(ctx.body.ok, true)
        assert.deepStrictEqual(ctx.body.data, {id: 1, name: 'test'})
      })

      it('sets reason when provided', function() {
        const ctx = mockCtx()
        const svc = new Service(ctx)
        svc.success({id: 1}, 'created')
        assert.strictEqual(ctx.body.reason, 'created')
      })

      it('works with no data', function() {
        const ctx = mockCtx()
        const svc = new Service(ctx)
        svc.success()
        assert.strictEqual(ctx.status, 200)
        assert.strictEqual(ctx.body.ok, true)
      })
    })
  })
})
