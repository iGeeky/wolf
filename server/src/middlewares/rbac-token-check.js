const log4js = require('../util/log4js')
const RbacTokenError = require('../errors/rbac-token-error')
const tokenUtil = require('../util/token-util')
const userCache = require('../util/user-cache')
const constant = require('../util/constant')
const _ = require('lodash')


const IGNORE_URLS = {
  'GET:/wolf/rbac/login': true,
  'GET:/wolf/rbac/login.html': true,
  'GET:/wolf/rbac/login/html': true,
  'POST:/wolf/rbac/login': true,
  'POST:/wolf/rbac/login.submit': true,
  'POST:/wolf/rbac/login.rest': true,
  'POST:/wolf/rbac/login/rest': true,
}

function needCheckToken(ctx) {
  if (ctx.method === 'OPTIONS') {
    return false;
  }

  if (!_.startsWith(ctx.path, '/wolf/rbac/')) {
    return false;
  }

  const methodPath = `${ctx.method}:${ctx.path}`
  // log4js.info('---- request [%s]', methodPath)
  return !IGNORE_URLS[methodPath]
}

function getClientToken(ctx) {
  let token = ctx.request.headers['x-rbac-token']
  if (!token) {
    token = ctx.cookies.get('x-rbac-token')
  }
  return token
}

function setResponseInfo(ctx, userInfo) {
  ctx.set('x-rbac-userID', userInfo.id);
  ctx.set('x-rbac-username', userInfo.username);
}


module.exports = function() {
  return async (ctx, next) => {
    if (needCheckToken(ctx)) {
      const token = getClientToken(ctx)
      if (!token) {
        log4js.error('rbac request [%s %s] invalid! token missing', ctx.method, ctx.url)
        throw new RbacTokenError('TOKEN MISSING')
      }
      const tokenUserInfo = tokenUtil.tokenDecrypt(token)
      if (tokenUserInfo.error) { // failed
        log4js.error('rbac request [%s %s] invalid! token [%s] decrypt failed!', ctx.method, ctx.path, token)
        throw new RbacTokenError('TOKEN INVALID')
      }
      const userId = tokenUserInfo.id
      const appid = tokenUserInfo.appid
      const {userInfo, cached} = await userCache.getUserInfoById(tokenUserInfo.id, appid)
      log4js.info('getUserInfoById(userId:%d, appID:%s) cached: %s', tokenUserInfo.id, appid, cached)
      if (!userInfo) {
        log4js.error('request [%s %s] invalid! userId:%d (from token) not found in database', ctx.method, ctx.path, userId)
        throw new RbacTokenError('TOKEN_USER_NOT_FOUND')
      }
      if (userInfo.status === constant.UserStatus.Disabled) {
        log4js.error('request [%s %s] failed! user [%s] is disabled', ctx.method, ctx.path, userInfo.username)
        throw new RbacTokenError('USER_IS_DISABLED')
      }

      ctx.userInfo = userInfo
      ctx.appid = appid
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
