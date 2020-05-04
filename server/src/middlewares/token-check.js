const log4js = require('../util/log4js')
const TokenError = require('../errors/token-error')
const tokenUtil = require('../util/token-util')
const AccessDenyError = require('../errors/access-deny-error')
const UserModel = require('../model/user')
const constant = require('../util/constant')
const _ = require('lodash')


const IGNORE_URLS = {
  'GET:/favicon.ico': true,
  'GET:/wolf/ping': true,
  'POST:/wolf/user/login': true,
  'POST:/wolf/user/logout': true,
}

function needCheckToken(ctx) {
  if (ctx.method === 'OPTIONS') {
    return false;
  }
  if (!_.startsWith(ctx.path, '/wolf/')) {
    return false;
  }

  if (_.startsWith(ctx.path, '/wolf/rbac/')) {
    return false;
  }

  if (_.startsWith(ctx.path, '/wolf/oauth2')) {
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
      if (!(userInfo.manager === constant.Manager.super || userInfo.manager === constant.Manager.admin)) {
        log4js.error('request [%s %s] failed! user [%s] have no permission to do this operation', ctx.method, ctx.path, userInfo.username)
        throw new AccessDenyError('need super or admin user to do this operation.')
      }

      if (userInfo.status === constant.UserStatus.Disabled) {
        log4js.error('request [%s %s] failed! user [%s] is disabled', ctx.method, ctx.path, userInfo.username)
        throw new AccessDenyError('user is disabled.')
      }

      userInfo = userInfo.toJSON()

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
