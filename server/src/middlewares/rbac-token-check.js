const log4js = require('../util/log4js')
const RbacTokenError = require('../errors/rbac-token-error')
const tokenUtil = require('../util/token-util')
const _ = require('lodash')


const IGNORE_URLS = {
  'GET:/api/v1/rbac/login': true,
  'POST:/api/v1/rbac/login.post': true,
  'POST:/api/v1/rbac/login.rest': true,
  // 'POST:/v1/user/add': true,
}

function needCheckToken(ctx) {
  if (ctx.method === 'OPTIONS') {
    return false;
  }

  if (!_.startsWith(ctx.path, '/api/v1/rbac/')) {
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
      const userInfo = tokenUtil.tokenDecrypt(token)
      if (userInfo.error) { // failed
        log4js.error('rbac request [%s %s] invalid! token decrypt failed!', ctx.method, ctx.path)
        throw new RbacTokenError('TOKEN INVALID')
      }
      // const userId = userInfo.id;
      // userInfo = await UserModel.findByPk(userId);
      // if (!userInfo) {
      //   log4js.error('request [%s %s] invalid! userId:%d (from token) not found in database', ctx.method, ctx.path, userId)
      //   throw new RbacTokenError('TOKEN_USER_NOT_FOUND')
      // }
      // userInfo = userInfo.toJSON()
      // userInfo.id = parseInt(userInfo.id)

      ctx.userInfo = userInfo
      ctx.appid = userInfo.appid
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
