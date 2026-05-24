'use strict'

const assert = require('assert')

// ai-config
const wolfConfig = require('../conf/config')
const aiConfig = require('../src/ai/ai-config')

// internal-caller — mock AccessLogModel.create to avoid DB writes
const AccessLogModel = require('../src/model/access-log')
const _origCreate = AccessLogModel.create
let lastAccessLogEntry = null
AccessLogModel.create = function(data) {
  lastAccessLogEntry = data
  return Promise.resolve(data)
}
const InternalCaller = require('../src/ai/internal-caller')

// Mock controllers for InternalCaller.call tests
class MockSuccessController {
  constructor(ctx) { this.ctx = ctx }
  async do(_method) {
    this.ctx.body = { ok: true, data: { id: 1, name: 'test' } }
  }
}
class MockFailController {
  constructor(ctx) { this.ctx = ctx }
  async do(_method) {
    const err = new Error('ARGS_ERROR: missing required field')
    err.status = 400
    throw err
  }
}

function makeOpts(overrides) {
  return {
    method: 'POST',
    path: '/wolf/test/action',
    args: { name: 'hello' },
    userInfo: { id: 'u1', username: 'admin', nickname: 'Admin' },
    ...overrides,
  }
}

// ============================================================
describe('ai-module', function() {

  describe('ai-config', function() {
    let origAi
    beforeEach(function() { origAi = { ...wolfConfig.ai } })
    afterEach(function() { wolfConfig.ai = origAi })

    describe('getProvider', function() {
      it('returns configured provider', function() {
        wolfConfig.ai = { ...origAi, provider: 'anthropic' }
        assert.strictEqual(aiConfig.getProvider(), 'anthropic')
      })
      it('returns openai when set', function() {
        wolfConfig.ai = { ...origAi, provider: 'openai' }
        assert.strictEqual(aiConfig.getProvider(), 'openai')
      })
    })

    describe('getModelId', function() {
      it('returns configured model', function() {
        wolfConfig.ai = { ...origAi, model: 'claude-3-opus' }
        assert.strictEqual(aiConfig.getModelId(), 'claude-3-opus')
      })
      it('returns another model', function() {
        wolfConfig.ai = { ...origAi, model: 'gpt-4o' }
        assert.strictEqual(aiConfig.getModelId(), 'gpt-4o')
      })
    })

    describe('getBaseUrl', function() {
      it('returns trimmed baseUrl', function() {
        wolfConfig.ai = { ...origAi, baseUrl: '  https://api.example.com/v1  ' }
        assert.strictEqual(aiConfig.getBaseUrl(), 'https://api.example.com/v1')
      })
      it('returns empty string when baseUrl is empty', function() {
        wolfConfig.ai = { ...origAi, baseUrl: '' }
        assert.strictEqual(aiConfig.getBaseUrl(), '')
      })
      it('returns empty string when baseUrl is undefined', function() {
        wolfConfig.ai = { ...origAi, baseUrl: undefined }
        assert.strictEqual(aiConfig.getBaseUrl(), '')
      })
      it('returns empty string for whitespace-only baseUrl', function() {
        wolfConfig.ai = { ...origAi, baseUrl: '   ' }
        assert.strictEqual(aiConfig.getBaseUrl(), '')
      })
    })

    describe('getApiKeyForProvider', function() {
      const savedEnv = {}
      before(function() {
        ;['AI_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY'].forEach(function(k) {
          savedEnv[k] = process.env[k]
        })
      })
      afterEach(function() {
        Object.keys(savedEnv).forEach(function(k) {
          if (savedEnv[k] === undefined) delete process.env[k]
          else process.env[k] = savedEnv[k]
        })
      })

      it('returns conf key when provider matches configured provider', function() {
        wolfConfig.ai = { ...origAi, provider: 'openai', apiKey: 'sk-conf-key' }
        delete process.env.OPENAI_API_KEY
        assert.strictEqual(aiConfig.getApiKeyForProvider('openai'), 'sk-conf-key')
      })
      it('falls back to env key when conf key is empty', function() {
        wolfConfig.ai = { ...origAi, provider: 'openai', apiKey: '' }
        process.env.OPENAI_API_KEY = 'sk-env-key'
        assert.strictEqual(aiConfig.getApiKeyForProvider('openai'), 'sk-env-key')
      })
      it('returns env key for different provider even when conf key exists', function() {
        wolfConfig.ai = { ...origAi, provider: 'openai', apiKey: 'sk-openai' }
        process.env.ANTHROPIC_API_KEY = 'sk-ant-env'
        assert.strictEqual(aiConfig.getApiKeyForProvider('anthropic'), 'sk-ant-env')
      })
      it('returns undefined when no key available', function() {
        wolfConfig.ai = { ...origAi, provider: 'openai', apiKey: '' }
        delete process.env.OPENAI_API_KEY
        delete process.env.ANTHROPIC_API_KEY
        assert.strictEqual(aiConfig.getApiKeyForProvider('openai'), undefined)
      })
      it('returns undefined for unknown provider', function() {
        wolfConfig.ai = { ...origAi, provider: 'openai', apiKey: 'sk-x' }
        assert.strictEqual(aiConfig.getApiKeyForProvider('unknown-provider'), undefined)
      })
    })

    describe('isAiAvailable', function() {
      const savedOpenaiKey = process.env.OPENAI_API_KEY
      afterEach(function() {
        if (savedOpenaiKey === undefined) delete process.env.OPENAI_API_KEY
        else process.env.OPENAI_API_KEY = savedOpenaiKey
      })
      it('returns true when apiKey is configured', function() {
        wolfConfig.ai = { ...origAi, provider: 'openai', apiKey: 'sk-valid' }
        assert.strictEqual(aiConfig.isAiAvailable(), true)
      })
      it('returns true when env key exists', function() {
        wolfConfig.ai = { ...origAi, provider: 'openai', apiKey: '' }
        process.env.OPENAI_API_KEY = 'sk-env-valid'
        assert.strictEqual(aiConfig.isAiAvailable(), true)
      })
      it('returns false when no key anywhere', function() {
        wolfConfig.ai = { ...origAi, provider: 'openai', apiKey: '' }
        delete process.env.OPENAI_API_KEY
        assert.strictEqual(aiConfig.isAiAvailable(), false)
      })
    })

    describe('getWolfAiConfig', function() {
      it('returns expected shape with correct values', function() {
        wolfConfig.ai = { ...origAi, api: 'openai-completions', maxTurns: 15, maxHistoryMessages: 50, thinkingLevel: 'high' }
        const cfg = aiConfig.getWolfAiConfig()
        assert.strictEqual(cfg.api, 'openai-completions')
        assert.strictEqual(cfg.maxTurns, 15)
        assert.strictEqual(cfg.maxHistoryMessages, 50)
        assert.strictEqual(cfg.thinkingLevel, 'high')
      })
      it('returns only the four expected keys', function() {
        const cfg = aiConfig.getWolfAiConfig()
        assert.deepStrictEqual(Object.keys(cfg).sort(), ['api', 'maxHistoryMessages', 'maxTurns', 'thinkingLevel'])
      })
    })

    describe('ENV_API_KEY_MAP', function() {
      it('contains expected provider mappings', function() {
        assert.strictEqual(aiConfig.ENV_API_KEY_MAP.openai, 'OPENAI_API_KEY')
        assert.strictEqual(aiConfig.ENV_API_KEY_MAP.anthropic, 'ANTHROPIC_API_KEY')
        assert.strictEqual(aiConfig.ENV_API_KEY_MAP.google, 'GEMINI_API_KEY')
        assert.strictEqual(aiConfig.ENV_API_KEY_MAP.mistral, 'MISTRAL_API_KEY')
        assert.strictEqual(aiConfig.ENV_API_KEY_MAP.groq, 'GROQ_API_KEY')
        assert.strictEqual(aiConfig.ENV_API_KEY_MAP.xai, 'XAI_API_KEY')
        assert.strictEqual(aiConfig.ENV_API_KEY_MAP.openrouter, 'OPENROUTER_API_KEY')
      })
      it('has exactly 7 entries', function() {
        assert.strictEqual(Object.keys(aiConfig.ENV_API_KEY_MAP).length, 7)
      })
    })
  })

  // ----------------------------------------------------------
  // InternalCaller
  // ----------------------------------------------------------
  describe('InternalCaller', function() {

    describe('createMockCtx', function() {
      it('POST: args in request.body, query empty', function() {
        const ctx = InternalCaller.createMockCtx(makeOpts({ method: 'POST' }))
        assert.deepStrictEqual(ctx.request.body, { name: 'hello' })
        assert.deepStrictEqual(ctx.query, {})
      })
      it('PUT: args in request.body', function() {
        const ctx = InternalCaller.createMockCtx(makeOpts({ method: 'PUT' }))
        assert.deepStrictEqual(ctx.request.body, { name: 'hello' })
        assert.deepStrictEqual(ctx.query, {})
      })
      it('PATCH: args in request.body', function() {
        const ctx = InternalCaller.createMockCtx(makeOpts({ method: 'PATCH' }))
        assert.deepStrictEqual(ctx.request.body, { name: 'hello' })
        assert.deepStrictEqual(ctx.query, {})
      })
      it('DELETE: args in request.body', function() {
        const ctx = InternalCaller.createMockCtx(makeOpts({ method: 'DELETE' }))
        assert.deepStrictEqual(ctx.request.body, { name: 'hello' })
        assert.deepStrictEqual(ctx.query, {})
      })
      it('GET: args in query, request.body undefined', function() {
        const ctx = InternalCaller.createMockCtx(makeOpts({ method: 'GET' }))
        assert.strictEqual(ctx.request.body, undefined)
        assert.deepStrictEqual(ctx.query, { name: 'hello' })
      })
      it('default clientIp is 127.0.0.1', function() {
        assert.strictEqual(InternalCaller.createMockCtx(makeOpts()).clientIp, '127.0.0.1')
      })
      it('custom clientIp is honored', function() {
        assert.strictEqual(InternalCaller.createMockCtx(makeOpts({ clientIp: '10.0.0.5' })).clientIp, '10.0.0.5')
      })
      it('_isAiAgent flag is true', function() {
        assert.strictEqual(InternalCaller.createMockCtx(makeOpts())._isAiAgent, true)
      })
      it('initial status is 200', function() {
        assert.strictEqual(InternalCaller.createMockCtx(makeOpts()).status, 200)
      })
      it('headers contain x-rbac-token', function() {
        const ctx = InternalCaller.createMockCtx(makeOpts())
        assert.strictEqual(ctx.request.headers['x-rbac-token'], 'ai-agent-internal')
      })
      it('userInfo is propagated', function() {
        const userInfo = { id: 'u99', username: 'bot', nickname: 'Bot' }
        assert.deepStrictEqual(InternalCaller.createMockCtx(makeOpts({ userInfo })).userInfo, userInfo)
      })
      it('method and path are propagated', function() {
        const ctx = InternalCaller.createMockCtx(makeOpts({ method: 'PUT', path: '/wolf/role/update' }))
        assert.strictEqual(ctx.method, 'PUT')
        assert.strictEqual(ctx.path, '/wolf/role/update')
        assert.strictEqual(ctx.url, '/wolf/role/update')
      })
    })

    describe('call', function() {
      it('success path returns ctx.body with ok:true', async function() {
        const result = await InternalCaller.call(MockSuccessController, 'list', makeOpts())
        assert.strictEqual(result.ok, true)
        assert.strictEqual(result.data.id, 1)
        assert.strictEqual(result.data.name, 'test')
      })
      it('error path returns ok:false with error message', async function() {
        const result = await InternalCaller.call(MockFailController, 'create', makeOpts())
        assert.strictEqual(result.ok, false)
        assert.strictEqual(result.reason, 'ARGS_ERROR: missing required field')
        assert.strictEqual(result.errmsg, 'ARGS_ERROR: missing required field')
      })
      it('error path sets status from error.status', async function() {
        lastAccessLogEntry = null
        await InternalCaller.call(MockFailController, 'create', makeOpts({ method: 'POST', path: '/wolf/x' }))
        assert.notStrictEqual(lastAccessLogEntry, null)
        assert.strictEqual(lastAccessLogEntry.status, 400)
      })
      it('writeAccessLog records correct fields', async function() {
        lastAccessLogEntry = null
        await InternalCaller.call(MockSuccessController, 'list', makeOpts({ method: 'POST', path: '/wolf/role/list', args: { page: 1 } }))
        assert.notStrictEqual(lastAccessLogEntry, null)
        assert.strictEqual(lastAccessLogEntry.appID, 'ai-agent')
        assert.strictEqual(lastAccessLogEntry.userID, 'u1')
        assert.strictEqual(lastAccessLogEntry.username, 'admin')
        assert.strictEqual(lastAccessLogEntry.action, 'POST')
        assert.strictEqual(lastAccessLogEntry.resName, '/wolf/role/list')
        assert.strictEqual(lastAccessLogEntry.ip, '127.0.0.1')
      })
      it('controller error is caught (no unhandled rejection)', async function() {
        const result = await InternalCaller.call(MockFailController, 'x', makeOpts())
        assert.strictEqual(result.ok, false)
      })
    })
  })
})
