const log4js = require('../util/log4js')
const TokenError = require('../errors/token-error')
const tokenUtil = require('../util/token-util')
const AccessDenyError = require('../errors/access-deny-error')
const UserModel = require('../model/user')
const _ = require('lodash')


const IGNORE_URLS = {
  'GET:/favicon.ico': true,
  'GET:/api/v1/ping': true,
  'POST:/api/v1/user/login': true,
  'POST:/api/v1/user/logout': true,

  // 'POST:/v1/user/add': true,
}

function needCheckToken(ctx) {
  if (ctx.method === 'OPTIONS') {
    return false;
  }
  if (!_.startsWith(ctx.path, '/api/')) {
    return false;
  }

  if (_.startsWith(ctx.path, '/api/v1/rbac/')) {
    return false;
  }

  const methodPath = `${ctx.method}:${ctx.path}`
  // log4js.info('---- request [%s]', methodPath)
  return !IGNORE_URLS[methodPath]
}

function getClientToken(ctx) {
  const token = ctx.request.headers['x-rbac-token']
  return token
}


function getClientIp(ctx) {
  const headers = ctx.request.headers;
  let ip = headers['x-orig-ip'] ||headers['x-forwarded-for'] ||headers['x-real-ip'] || ctx.request.ip;
  ip = ip.replace('::ffff:', '')
  return ip;
}

function setResponseInfo(ctx, userInfo) {
  ctx.set('x-rbac-userID', userInfo.id);
  ctx.set('x-rbac-username', userInfo.username);
}


module.exports = function() {
  return async (ctx, next) => {
    ctx.clientIp = getClientIp(ctx)
    if (needCheckToken(ctx)) {
      const token = getClientToken(ctx)
      if (!token) {
        log4js.error('request [%s %s] invalid! token missing', ctx.method, ctx.url)
        throw new TokenError('TOKEN MISSING')
      }
      const user = tokenUtil.tokenDecrypt(token)
      if (user.error) { // failed
        log4js.error('request [%s %s] invalid! token decrypt failed!', ctx.method, ctx.path)
        throw new TokenError('TOKEN INVALID')
      }
      const userId = user.id;
      let userInfo = await UserModel.findByPk(userId);
      /* istanbul ignore if */
      if (!userInfo) {
        log4js.error('request [%s %s] invalid! userId:%d (from token) not found in database', ctx.method, ctx.path, userId)
        throw new TokenError('TOKEN_USER_NOT_FOUND')
      }
      // only super and admin user can be use the admin backend system.
      /* istanbul ignore if */
      if (!(userInfo.manager === 'super' || userInfo.manager === 'admin')) {
        log4js.error('request [%s %s] failed! userId:%d have no permission to do this operation', ctx.method, ctx.path, userId)
        throw new AccessDenyError('need super or admin user to do this operation.')
      }

      userInfo = userInfo.toJSON()
      userInfo.id = parseInt(userInfo.id)

      ctx.userInfo = userInfo
      ctx.token = token

      try {
        setResponseInfo(ctx, userInfo);
      } catch (ex) {
        log4js.error('setResponseInfo failed! err:', ex)
      }
    }

    await next()
  }
}
