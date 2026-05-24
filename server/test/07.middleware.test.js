'use strict'

const assert = require('assert')
const EventEmitter = require('events')
const Sequelize = require('sequelize')

// Error classes
const TokenError = require('../src/errors/token-error')
const RbacTokenError = require('../src/errors/rbac-token-error')
const AccessDenyError = require('../src/errors/access-deny-error')
const ArgsError = require('../src/errors/args-error')
const DataExistError = require('../src/errors/data-exist-error')
const DataNotFoundError = require('../src/errors/data-not-found-error')
const BackendError = require('../src/errors/backend-error')
const MethodInvalidError = require('../src/errors/method-invalid-error')

// Middleware under test
const errorCatchFactory = require('../src/middlewares/error-catch')
const tokenCheckFactory = require('../src/middlewares/token-check')
const rbacTokenCheckFactory = require('../src/middlewares/rbac-token-check')
const accessLogFactory = require('../src/middlewares/access-log')

// Dependencies to mock
const tokenUtil = require('../src/util/token-util')
const UserModel = require('../src/model/user')
const userCache = require('../src/service/user-cache')
const constant = require('../src/util/constant')

// ─────────────────────────── helpers ───────────────────────────

function mockCtx(overrides = {}) {
  const headers = overrides.headers || {}
  const responseHeaders = {}
  return {
    method: overrides.method || 'GET',
    url: overrides.url || '/test',
    path: overrides.path || '/test',
    status: overrides.status || 200,
    body: overrides.body || null,
    query: overrides.query || {},
    request: {
      method: overrides.method || 'GET',
      headers,
      ip: overrides.ip || '127.0.0.1',
      type: overrides.type || 'application/json',
      rawBody: overrides.rawBody || '',
      body: overrides.body || undefined,
    },
    res: new EventEmitter(),
    set(key, value) { responseHeaders[key] = value },
    get(key) { return responseHeaders[key] },
    _responseHeaders: responseHeaders,
    cookies: overrides.cookies || { get() { return undefined } },
    userInfo: overrides.userInfo || undefined,
    clientIp: overrides.clientIp || undefined,
  }
}

// ─────────────────────────── error-catch ───────────────────────────

describe('error-catch middleware', function() {
  const errorCatch = errorCatchFactory()

  it('passes through when next() resolves (no error)', async function() {
    const ctx = mockCtx()
    ctx.status = 200
    ctx.body = { ok: true }
    const next = () => Promise.resolve()
    await errorCatch(ctx, next)
    assert.strictEqual(ctx.status, 200)
    assert.deepStrictEqual(ctx.body, { ok: true })
  })

  it('handles ArgsError -> 400 ERR_ARGS_ERROR', async function() {
    const ctx = mockCtx()
    const next = () => Promise.reject(new ArgsError('bad args'))
    await errorCatch(ctx, next)
    assert.strictEqual(ctx.status, 400)
    assert.strictEqual(ctx.body.ok, false)
    assert.strictEqual(ctx.body.reason, 'ERR_ARGS_ERROR')
    assert.strictEqual(ctx.body.errmsg, 'bad args')
  })

  it('handles TokenError -> 401 ERR_TOKEN_INVALID', async function() {
    const ctx = mockCtx()
    const next = () => Promise.reject(new TokenError('TOKEN_MISSING'))
    await errorCatch(ctx, next)
    assert.strictEqual(ctx.status, 401)
    assert.strictEqual(ctx.body.reason, 'ERR_TOKEN_INVALID')
    assert.strictEqual(ctx.body.errmsg, 'TOKEN_MISSING')
  })

  it('handles RbacTokenError -> 401 ERR_TOKEN_INVALID', async function() {
    const ctx = mockCtx()
    const next = () => Promise.reject(new RbacTokenError('TOKEN INVALID'))
    await errorCatch(ctx, next)
    assert.strictEqual(ctx.status, 401)
    assert.strictEqual(ctx.body.reason, 'ERR_TOKEN_INVALID')
    assert.strictEqual(ctx.body.errmsg, 'TOKEN INVALID')
  })

  it('handles AccessDenyError -> 403 ERR_ACCESS_DENIED', async function() {
    const ctx = mockCtx()
    const next = () => Promise.reject(new AccessDenyError('forbidden'))
    await errorCatch(ctx, next)
    assert.strictEqual(ctx.status, 403)
    assert.strictEqual(ctx.body.reason, 'ERR_ACCESS_DENIED')
    assert.strictEqual(ctx.body.errmsg, 'forbidden')
  })

  it('handles DataExistError -> 400 with custom code', async function() {
    const ctx = mockCtx()
    const next = () => Promise.reject(new DataExistError('ERR_USERNAME_EXIST', 'name taken'))
    await errorCatch(ctx, next)
    assert.strictEqual(ctx.status, 400)
    assert.strictEqual(ctx.body.reason, 'ERR_USERNAME_EXIST')
    assert.strictEqual(ctx.body.errmsg, 'name taken')
  })

  it('handles DataNotFoundError -> 400 with custom code', async function() {
    const ctx = mockCtx()
    const next = () => Promise.reject(new DataNotFoundError('ERR_OBJECT_NOT_FOUND', 'not found'))
    await errorCatch(ctx, next)
    assert.strictEqual(ctx.status, 400)
    assert.strictEqual(ctx.body.reason, 'ERR_OBJECT_NOT_FOUND')
    assert.strictEqual(ctx.body.errmsg, 'not found')
  })

  it('handles Sequelize.UniqueConstraintError -> 400 ERR_DUPLICATE_KEY_ERROR', async function() {
    const ctx = mockCtx()
    const dupErr = new Sequelize.UniqueConstraintError({ message: 'duplicate entry', errors: [{ path: 'name', value: 'test' }] })
    const next = () => Promise.reject(dupErr)
    await errorCatch(ctx, next)
    assert.strictEqual(ctx.status, 400)
    assert.strictEqual(ctx.body.reason, 'ERR_DUPLICATE_KEY_ERROR')
    assert.strictEqual(ctx.body.errmsg, 'duplicate entry')
  })

  it('handles MethodInvalidError -> 404 ERR_METHOD_INVALID', async function() {
    const ctx = mockCtx()
    const next = () => Promise.reject(new MethodInvalidError('bad method'))
    await errorCatch(ctx, next)
    assert.strictEqual(ctx.status, 404)
    assert.strictEqual(ctx.body.reason, 'ERR_METHOD_INVALID')
    assert.strictEqual(ctx.body.errmsg, 'bad method')
  })

  it('handles BackendError -> 500 ERR_SERVER_ERROR', async function() {
    const ctx = mockCtx()
    const next = () => Promise.reject(new BackendError('internal boom'))
    await errorCatch(ctx, next)
    assert.strictEqual(ctx.status, 500)
    assert.strictEqual(ctx.body.reason, 'ERR_SERVER_ERROR')
    assert.strictEqual(ctx.body.errmsg, 'internal boom')
  })

  it('handles Sequelize.DatabaseError -> 500 ERR_SERVER_ERROR with empty message', async function() {
    const ctx = mockCtx()
    const dbErr = new Sequelize.DatabaseError(new Error('connection lost'))
    const next = () => Promise.reject(dbErr)
    await errorCatch(ctx, next)
    assert.strictEqual(ctx.status, 500)
    assert.strictEqual(ctx.body.reason, 'ERR_SERVER_ERROR')
    // ok-json omits errmsg when it is empty string (falsy)
    assert.strictEqual(ctx.body.errmsg, undefined)
  })

  it('handles generic/unknown Error -> 200 ERR_SERVER_ERROR', async function() {
    const ctx = mockCtx()
    const next = () => Promise.reject(new Error('something weird'))
    await errorCatch(ctx, next)
    assert.strictEqual(ctx.status, 200)
    assert.strictEqual(ctx.body.reason, 'ERR_SERVER_ERROR')
    assert.strictEqual(ctx.body.errmsg, 'something weird')
  })
})

// ─────────────────────────── token-check ───────────────────────────

describe('token-check middleware', function() {
  const tokenCheck = tokenCheckFactory()
  let origTokenCheck
  let origFindByPk

  before(function() {
    origTokenCheck = tokenUtil.tokenCheck
    origFindByPk = UserModel.findByPk
  })

  afterEach(function() {
    tokenUtil.tokenCheck = origTokenCheck
    UserModel.findByPk = origFindByPk
  })

  it('returns a function from the factory', function() {
    assert.strictEqual(typeof tokenCheckFactory(), 'function')
  })

  it('skips token check for OPTIONS requests and sets clientIp', async function() {
    const ctx = mockCtx({ method: 'OPTIONS', url: '/wolf/user/list', path: '/wolf/user/list' })
    const nextCalled = { value: false }
    const next = () => { nextCalled.value = true; return Promise.resolve() }
    await tokenCheck(ctx, next)
    assert.strictEqual(nextCalled.value, true)
    assert.ok(ctx.clientIp)
  })

  it('skips token check for non-/wolf/ paths', async function() {
    const ctx = mockCtx({ method: 'GET', path: '/api/something' })
    const nextCalled = { value: false }
    const next = () => { nextCalled.value = true; return Promise.resolve() }
    await tokenCheck(ctx, next)
    assert.strictEqual(nextCalled.value, true)
    assert.ok(ctx.clientIp)
  })

  it('skips token check for /wolf/rbac/ paths', async function() {
    const ctx = mockCtx({ method: 'GET', path: '/wolf/rbac/roles' })
    const nextCalled = { value: false }
    const next = () => { nextCalled.value = true; return Promise.resolve() }
    await tokenCheck(ctx, next)
    assert.strictEqual(nextCalled.value, true)
  })

  it('skips token check for /wolf/oauth2 paths', async function() {
    const ctx = mockCtx({ method: 'GET', path: '/wolf/oauth2/authorize' })
    const nextCalled = { value: false }
    const next = () => { nextCalled.value = true; return Promise.resolve() }
    await tokenCheck(ctx, next)
    assert.strictEqual(nextCalled.value, true)
  })

  it('skips token check for ignored URLs (GET:/wolf/ping)', async function() {
    const ctx = mockCtx({ method: 'GET', path: '/wolf/ping' })
    const nextCalled = { value: false }
    const next = () => { nextCalled.value = true; return Promise.resolve() }
    await tokenCheck(ctx, next)
    assert.strictEqual(nextCalled.value, true)
  })

  it('skips token check for POST:/wolf/user/login', async function() {
    const ctx = mockCtx({ method: 'POST', path: '/wolf/user/login' })
    const nextCalled = { value: false }
    const next = () => { nextCalled.value = true; return Promise.resolve() }
    await tokenCheck(ctx, next)
    assert.strictEqual(nextCalled.value, true)
  })

  it('throws TokenError when token is missing on protected path', async function() {
    const ctx = mockCtx({ method: 'GET', path: '/wolf/user/list', headers: {} })
    const next = () => Promise.resolve()
    await assert.rejects(
      () => tokenCheck(ctx, next),
      (err) => {
        assert.ok(err instanceof TokenError)
        assert.strictEqual(err.message, 'ERR_TOKEN_MISSING')
        return true
      }
    )
  })

  it('throws TokenError when token is invalid (tokenCheck returns error)', async function() {
    tokenUtil.tokenCheck = async () => ({ error: 'ERR_TOKEN_INVALID' })
    const ctx = mockCtx({ method: 'GET', path: '/wolf/user/list', headers: { 'x-rbac-token': 'bad.token.value' } })
    const next = () => Promise.resolve()
    await assert.rejects(
      () => tokenCheck(ctx, next),
      (err) => {
        assert.ok(err instanceof TokenError)
        assert.strictEqual(err.message, 'ERR_TOKEN_INVALID')
        return true
      }
    )
  })

  it('throws TokenError when user not found in DB', async function() {
    tokenUtil.tokenCheck = async () => ({ id: 999, username: 'ghost' })
    UserModel.findByPk = async () => null
    const ctx = mockCtx({ method: 'GET', path: '/wolf/user/list', headers: { 'x-rbac-token': 'valid.token.value' } })
    const next = () => Promise.resolve()
    await assert.rejects(
      () => tokenCheck(ctx, next),
      (err) => {
        assert.ok(err instanceof TokenError)
        assert.strictEqual(err.message, 'TOKEN_USER_NOT_FOUND')
        return true
      }
    )
  })

  it('throws AccessDenyError when user is not super/admin', async function() {
    tokenUtil.tokenCheck = async () => ({ id: 1, username: 'regular' })
    UserModel.findByPk = async () => ({
      id: 1, username: 'regular', manager: 'user', status: constant.UserStatus.Normal,
      toJSON() { return { id: 1, username: 'regular', manager: 'user', status: constant.UserStatus.Normal } }
    })
    const ctx = mockCtx({ method: 'GET', path: '/wolf/user/list', headers: { 'x-rbac-token': 'valid.token.value' } })
    const next = () => Promise.resolve()
    await assert.rejects(
      () => tokenCheck(ctx, next),
      (err) => {
        assert.ok(err instanceof AccessDenyError)
        assert.strictEqual(err.message, 'ERR_NEED_SUPER_OR_ADMIN_USER')
        return true
      }
    )
  })

  it('throws AccessDenyError when user is disabled', async function() {
    tokenUtil.tokenCheck = async () => ({ id: 1, username: 'disabled_user' })
    UserModel.findByPk = async () => ({
      id: 1, username: 'disabled_user', manager: 'admin', status: constant.UserStatus.Disabled,
      toJSON() { return { id: 1, username: 'disabled_user', manager: 'admin', status: constant.UserStatus.Disabled } }
    })
    const ctx = mockCtx({ method: 'GET', path: '/wolf/user/list', headers: { 'x-rbac-token': 'valid.token.value' } })
    const next = () => Promise.resolve()
    await assert.rejects(
      () => tokenCheck(ctx, next),
      (err) => {
        assert.ok(err instanceof AccessDenyError)
        assert.strictEqual(err.message, 'ERR_USER_DISABLED')
        return true
      }
    )
  })

  it('sets ctx.userInfo and ctx.token on valid token (super user)', async function() {
    tokenUtil.tokenCheck = async () => ({ id: 1, username: 'admin' })
    UserModel.findByPk = async () => ({
      id: 1, username: 'admin', manager: 'super', status: constant.UserStatus.Normal, nickname: 'Admin',
      toJSON() { return { id: 1, username: 'admin', manager: 'super', status: constant.UserStatus.Normal, nickname: 'Admin' } }
    })
    const ctx = mockCtx({ method: 'GET', path: '/wolf/user/list', headers: { 'x-rbac-token': 'good.token.here' } })
    const nextCalled = { value: false }
    const next = () => { nextCalled.value = true; return Promise.resolve() }
    await tokenCheck(ctx, next)
    assert.strictEqual(nextCalled.value, true)
    assert.deepStrictEqual(ctx.userInfo, { id: 1, username: 'admin', manager: 'super', status: constant.UserStatus.Normal, nickname: 'Admin' })
    assert.strictEqual(ctx.token, 'good.token.here')
    assert.strictEqual(ctx._responseHeaders['x-rbac-userID'], 1)
    assert.strictEqual(ctx._responseHeaders['x-rbac-username'], 'admin')
  })

  it('sets clientIp from x-orig-ip header', async function() {
    const ctx = mockCtx({ method: 'GET', path: '/api/test', headers: { 'x-orig-ip': '10.0.0.5' } })
    const next = () => Promise.resolve()
    await tokenCheck(ctx, next)
    assert.strictEqual(ctx.clientIp, '10.0.0.5')
  })

  it('strips ::ffff: prefix from ip', async function() {
    const ctx = mockCtx({ method: 'GET', path: '/api/test', ip: '::ffff:192.168.1.1' })
    const next = () => Promise.resolve()
    await tokenCheck(ctx, next)
    assert.strictEqual(ctx.clientIp, '192.168.1.1')
  })

  it('returns "unknown" when ip cannot be determined', async function() {
    const trustProxyOrig = process.env.TRUST_PROXY
    process.env.TRUST_PROXY = 'false'
    try {
      const ctx = mockCtx({ method: 'GET', path: '/api/test' })
      ctx.request.ip = undefined
      const next = () => Promise.resolve()
      await tokenCheck(ctx, next)
      assert.strictEqual(ctx.clientIp, 'unknown')
    } finally {
      if (trustProxyOrig === undefined) delete process.env.TRUST_PROXY
      else process.env.TRUST_PROXY = trustProxyOrig
    }
  })
})

// ─────────────────────────── rbac-token-check ───────────────────────────

describe('rbac-token-check middleware', function() {
  const rbacTokenCheck = rbacTokenCheckFactory()
  let origTokenCheck
  let origGetUserInfoById
  let origGetUserInfoByName

  before(function() {
    origTokenCheck = tokenUtil.tokenCheck
    origGetUserInfoById = userCache.getUserInfoById
    origGetUserInfoByName = userCache.getUserInfoByName
  })

  afterEach(function() {
    tokenUtil.tokenCheck = origTokenCheck
    userCache.getUserInfoById = origGetUserInfoById
    userCache.getUserInfoByName = origGetUserInfoByName
  })

  it('returns a function from the factory', function() {
    assert.strictEqual(typeof rbacTokenCheckFactory(), 'function')
  })

  it('skips check for non-/wolf/rbac/ paths', async function() {
    const ctx = mockCtx({ method: 'GET', path: '/wolf/user/list' })
    const nextCalled = { value: false }
    const next = () => { nextCalled.value = true; return Promise.resolve() }
    await rbacTokenCheck(ctx, next)
    assert.strictEqual(nextCalled.value, true)
  })

  it('skips check for OPTIONS requests', async function() {
    const ctx = mockCtx({ method: 'OPTIONS', path: '/wolf/rbac/resource' })
    const nextCalled = { value: false }
    const next = () => { nextCalled.value = true; return Promise.resolve() }
    await rbacTokenCheck(ctx, next)
    assert.strictEqual(nextCalled.value, true)
  })

  it('skips check for ignored RBAC URLs (POST:/wolf/rbac/login)', async function() {
    const ctx = mockCtx({ method: 'POST', path: '/wolf/rbac/login' })
    const nextCalled = { value: false }
    const next = () => { nextCalled.value = true; return Promise.resolve() }
    await rbacTokenCheck(ctx, next)
    assert.strictEqual(nextCalled.value, true)
  })

  it('skips check for GET:/wolf/rbac/login.html', async function() {
    const ctx = mockCtx({ method: 'GET', path: '/wolf/rbac/login.html' })
    const nextCalled = { value: false }
    const next = () => { nextCalled.value = true; return Promise.resolve() }
    await rbacTokenCheck(ctx, next)
    assert.strictEqual(nextCalled.value, true)
  })

  it('throws RbacTokenError when token is invalid', async function() {
    tokenUtil.tokenCheck = async () => ({ error: 'ERR_TOKEN_INVALID' })
    const ctx = mockCtx({ method: 'GET', path: '/wolf/rbac/resource', headers: { 'x-rbac-token': 'bad.token' } })
    const next = () => Promise.resolve()
    await assert.rejects(
      () => rbacTokenCheck(ctx, next),
      (err) => {
        assert.ok(err instanceof RbacTokenError)
        assert.strictEqual(err.message, 'TOKEN INVALID')
        return true
      }
    )
  })

  it('throws RbacTokenError when user not found via getUserInfoById', async function() {
    tokenUtil.tokenCheck = async () => ({ id: 42, username: 'user42', appid: 'app1' })
    userCache.getUserInfoById = async () => ({ userInfo: null, cached: 'miss' })
    const ctx = mockCtx({ method: 'GET', path: '/wolf/rbac/resource', headers: { 'x-rbac-token': 'valid.token' } })
    const next = () => Promise.resolve()
    await assert.rejects(
      () => rbacTokenCheck(ctx, next),
      (err) => {
        assert.ok(err instanceof RbacTokenError)
        assert.strictEqual(err.message, 'TOKEN_USER_NOT_FOUND')
        return true
      }
    )
  })

  it('throws RbacTokenError when user is disabled', async function() {
    tokenUtil.tokenCheck = async () => ({ id: 5, username: 'disabled', appid: 'app1' })
    userCache.getUserInfoById = async () => ({
      userInfo: { id: 5, username: 'disabled', status: constant.UserStatus.Disabled },
      cached: 'miss'
    })
    const ctx = mockCtx({ method: 'GET', path: '/wolf/rbac/resource', headers: { 'x-rbac-token': 'valid.token' } })
    const next = () => Promise.resolve()
    await assert.rejects(
      () => rbacTokenCheck(ctx, next),
      (err) => {
        assert.ok(err instanceof RbacTokenError)
        assert.strictEqual(err.message, 'USER_IS_DISABLED')
        return true
      }
    )
  })

  it('sets ctx.userInfo and ctx.appid on valid rbac token', async function() {
    const userInfo = { id: 10, username: 'rbacuser', status: constant.UserStatus.Normal }
    tokenUtil.tokenCheck = async () => ({ id: 10, username: 'rbacuser', appid: 'myapp' })
    userCache.getUserInfoById = async () => ({ userInfo, cached: 'miss' })
    const ctx = mockCtx({ method: 'GET', path: '/wolf/rbac/resource', headers: { 'x-rbac-token': 'good.token' } })
    const nextCalled = { value: false }
    const next = () => { nextCalled.value = true; return Promise.resolve() }
    await rbacTokenCheck(ctx, next)
    assert.strictEqual(nextCalled.value, true)
    assert.deepStrictEqual(ctx.userInfo, userInfo)
    assert.strictEqual(ctx.appid, 'myapp')
    assert.strictEqual(ctx.token, 'good.token')
    assert.strictEqual(ctx._responseHeaders['x-rbac-userID'], 10)
    assert.strictEqual(ctx._responseHeaders['x-rbac-username'], 'rbacuser')
  })

  it('throws RbacTokenError when basic auth is missing and no token cookie', async function() {
    // No header token, no cookie -> falls through to basicAuthCheck which throws TOKEN MISSING
    const ctx = mockCtx({ method: 'GET', path: '/wolf/rbac/resource', headers: {} })
    ctx.cookies = { get() { return undefined } }
    const next = () => Promise.resolve()
    await assert.rejects(
      () => rbacTokenCheck(ctx, next),
      (err) => {
        assert.ok(err instanceof RbacTokenError)
        assert.strictEqual(err.message, 'TOKEN MISSING')
        return true
      }
    )
  })

  it('uses cookie token when x-rbac-token header is absent', async function() {
    const userInfo = { id: 20, username: 'cookieuser', status: constant.UserStatus.Normal }
    tokenUtil.tokenCheck = async () => ({ id: 20, username: 'cookieuser', appid: 'app2' })
    userCache.getUserInfoById = async () => ({ userInfo, cached: 'hit' })
    const ctx = mockCtx({ method: 'GET', path: '/wolf/rbac/resource', headers: {} })
    ctx.cookies = { get(name) { return name === 'x-rbac-token' ? 'cookie.token.value' : undefined } }
    const nextCalled = { value: false }
    const next = () => { nextCalled.value = true; return Promise.resolve() }
    await rbacTokenCheck(ctx, next)
    assert.strictEqual(nextCalled.value, true)
    assert.deepStrictEqual(ctx.userInfo, userInfo)
  })

  it('treats "logouted" cookie as no token', async function() {
    const ctx = mockCtx({ method: 'GET', path: '/wolf/rbac/resource', headers: {} })
    ctx.cookies = { get(name) { return name === 'x-rbac-token' ? 'logouted' : undefined } }
    const next = () => Promise.resolve()
    await assert.rejects(
      () => rbacTokenCheck(ctx, next),
      (err) => {
        assert.ok(err instanceof RbacTokenError)
        assert.strictEqual(err.message, 'TOKEN MISSING')
        return true
      }
    )
  })
})

// ─────────────────────────── access-log ───────────────────────────

describe('access-log middleware', function() {
  const accessLog = accessLogFactory()
  let origCreate

  before(function() {
    origCreate = require('../src/model/access-log').create
  })

  afterEach(function() {
    require('../src/model/access-log').create = origCreate
  })

  it('returns a function from the factory', function() {
    assert.strictEqual(typeof accessLogFactory(), 'function')
  })

  it('calls next and registers finish listener', async function() {
    const ctx = mockCtx({ method: 'GET', path: '/wolf/user/list' })
    ctx.userInfo = { id: 1, username: 'admin', nickname: 'Admin' }
    ctx.clientIp = '127.0.0.1'
    let createCalled = false
    require('../src/model/access-log').create = () => { createCalled = true }
    const nextCalled = { value: false }
    const next = () => { nextCalled.value = true; return Promise.resolve() }
    await accessLog(ctx, next)
    assert.strictEqual(nextCalled.value, true)
    // Trigger the finish event to invoke writeAccessLog
    ctx.res.emit('finish')
    assert.strictEqual(createCalled, true)
  })

  it('does not record log for OPTIONS requests', async function() {
    const ctx = mockCtx({ method: 'OPTIONS', path: '/wolf/user/list' })
    let createCalled = false
    require('../src/model/access-log').create = () => { createCalled = true }
    const next = () => Promise.resolve()
    await accessLog(ctx, next)
    ctx.res.emit('finish')
    assert.strictEqual(createCalled, false)
  })

  it('does not record log for /wolf/user/info', async function() {
    const ctx = mockCtx({ method: 'GET', path: '/wolf/user/info' })
    let createCalled = false
    require('../src/model/access-log').create = () => { createCalled = true }
    const next = () => Promise.resolve()
    await accessLog(ctx, next)
    ctx.res.emit('finish')
    assert.strictEqual(createCalled, false)
  })

  it('does not record log for /wolf/rbac/ paths', async function() {
    const ctx = mockCtx({ method: 'GET', path: '/wolf/rbac/roles' })
    let createCalled = false
    require('../src/model/access-log').create = () => { createCalled = true }
    const next = () => Promise.resolve()
    await accessLog(ctx, next)
    ctx.res.emit('finish')
    assert.strictEqual(createCalled, false)
  })

  it('does not record log for paths ending in checkExist', async function() {
    const ctx = mockCtx({ method: 'GET', path: '/wolf/user/checkExist' })
    let createCalled = false
    require('../src/model/access-log').create = () => { createCalled = true }
    const next = () => Promise.resolve()
    await accessLog(ctx, next)
    ctx.res.emit('finish')
    assert.strictEqual(createCalled, false)
  })

  it('records log with correct values when userInfo is present', async function() {
    const ctx = mockCtx({ method: 'POST', path: '/wolf/role/add', status: 200 })
    ctx.userInfo = { id: 5, username: 'testuser', nickname: 'Test' }
    ctx.clientIp = '10.0.0.1'
    ctx.status = 201
    let capturedValues = null
    require('../src/model/access-log').create = (values) => { capturedValues = values }
    const next = () => Promise.resolve()
    await accessLog(ctx, next)
    ctx.res.emit('finish')
    assert.ok(capturedValues)
    assert.strictEqual(capturedValues.appID, 'rbac-console')
    assert.strictEqual(capturedValues.userID, 5)
    assert.strictEqual(capturedValues.username, 'testuser')
    assert.strictEqual(capturedValues.nickname, 'Test')
    assert.strictEqual(capturedValues.action, 'POST')
    assert.strictEqual(capturedValues.resName, '/wolf/role/add')
    assert.strictEqual(capturedValues.status, 201)
    assert.strictEqual(capturedValues.ip, '10.0.0.1')
  })

  it('records log with userID=-1 and username=none when no userInfo', async function() {
    const ctx = mockCtx({ method: 'GET', path: '/wolf/app/list' })
    ctx.clientIp = '192.168.1.1'
    let capturedValues = null
    require('../src/model/access-log').create = (values) => { capturedValues = values }
    const next = () => Promise.resolve()
    await accessLog(ctx, next)
    ctx.res.emit('finish')
    assert.ok(capturedValues)
    assert.strictEqual(capturedValues.userID, -1)
    assert.strictEqual(capturedValues.username, 'none')
    assert.strictEqual(capturedValues.nickname, 'none')
  })
})
