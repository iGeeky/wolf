/**
 * InternalCaller — 进程内调用现有 Controller
 *
 * 构造 mock Koa ctx，在进程内直接实例化并调用 Controller，
 * 完全复用 Controller 中的参数校验、权限检查（access()）、业务逻辑、
 * 缓存刷新（log()）等全部逻辑。
 *
 * 调用完成后写入审计日志，用 appID='ai-agent' 区分 AI 调用与人工操作。
 */

const util = require('../util/util')
const AccessLogModel = require('../model/access-log')
const log4js = require('../util/log4js')

class InternalCaller {
  /**
   * 构造 mock Koa ctx，满足 Controller 所有依赖
   * @param {object} opts
   * @param {string} opts.method   - HTTP 方法 (GET/POST/PUT/DELETE/PATCH)
   * @param {string} opts.path     - 路径，如 '/wolf/role/list'
   * @param {object} opts.args     - 请求参数（GET 时作为 query，其他作为 body）
   * @param {object} opts.userInfo - 当前登录用户（来自 token-check 设置的 ctx.userInfo）
   * @param {string} [opts.clientIp] - 客户端 IP，默认 '127.0.0.1'
   */
  static createMockCtx({ method, path, args, userInfo, clientIp = '127.0.0.1' }) {
    const isBodyMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
    const mockCtx = {
      method,
      path,
      url: path,
      clientIp,
      userInfo,
      status: 200,
      body: null,
      request: {
        method,
        body: isBodyMethod ? (args || {}) : undefined,
        headers: { 'x-rbac-token': 'ai-agent-internal' },
        type: 'application/json',
        rawBody: JSON.stringify(args || {}),
      },
      query: !isBodyMethod ? (args || {}) : {},
      // no-op: Controller 用于设置响应头
      set: () => {},
      // 标记来源
      _isAiAgent: true,
    }
    return mockCtx
  }

  /**
   * 进程内调用 Controller 的某个业务方法
   *
   * @param {Function} ControllerClass - Controller 类（如 require('../controllers/role')）
   * @param {string}   bizMethod       - 业务方法名（如 'list', 'post', 'put', 'delete'）
   * @param {object}   opts            - 同 createMockCtx 参数
   * @returns {object} - ctx.body，格式与 HTTP API 响应一致: { ok, data?, reason?, errmsg? }
   */
  static async call(ControllerClass, bizMethod, opts) {
    const ctx = InternalCaller.createMockCtx(opts)
    const service = new ControllerClass(ctx)

    try {
      await service.do(bizMethod)
    } catch (err) {
      // Controller 抛出的错误（ArgsError, AccessDenyError, DataNotFoundError 等）
      const status = err.status || err.statusCode || 500
      ctx.status = status
      ctx.body = {
        ok: false,
        reason: err.message || 'ERR_SERVER_ERROR',
        errmsg: err.message || 'ERR_SERVER_ERROR',
      }
      log4js.warn('[InternalCaller] %s %s %s failed: %s', opts.method, opts.path, bizMethod, err.message)
    }

    // 写入审计日志，appID='ai-agent' 区分来源
    InternalCaller.writeAccessLog(ctx, opts.args)

    return ctx.body
  }

  /**
   * 写入审计日志，使用 appID='ai-agent' 标记来源
   */
  static writeAccessLog(ctx, requestArgs) {
    const userInfo = ctx.userInfo
    try {
      AccessLogModel.create({
        appID: 'ai-agent',
        userID: userInfo ? userInfo.id : -1,
        username: userInfo ? userInfo.username : 'none',
        nickname: userInfo ? userInfo.nickname : 'none',
        action: ctx.method,
        resName: ctx.path,
        status: ctx.status,
        body: requestArgs || {},
        contentType: 'application/json',
        date: util.currentDate('YYYY-MM-DD'),
        accessTime: util.unixtime(),
        ip: ctx.clientIp,
      })
    } catch (err) {
      log4js.error('[InternalCaller] writeAccessLog failed: %s', err.message)
    }
  }
}

module.exports = InternalCaller
