const log4js = require('../util/log4js')
const RbacTokenError = require('../errors/rbac-token-error')
const tokenUtil = require('../util/token-util')
const userCache = require('../service/user-cache')
const constant = require('../util/constant')
const errors = require('../errors/errors')
const util = require('../util/util')
const _ = require('lodash')



const IGNORE_URLS = {
  'GET:/wolf/rbac/login': true,
  'GET:/wolf/rbac/login.html': true,
  'GET:/wolf/rbac/login/html': true,
  'POST:/wolf/rbac/login': true,
  'POST:/wolf/rbac/login.submit': true,
  'POST:/wolf/rbac/login.rest': true,
  'POST:/wolf/rbac/login/rest': true,
  'GET:/wolf/rbac/no_permission': true,
  'GET:/wolf/rbac/no_permission.html': true,
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

function getBasicUserInfo(ctx) {
  let authorization = ctx.request.headers['authorization'];
  if (!authorization) {
    log4js.error('http basic auth request [%s %s] invalid! authorization header missing', ctx.method, ctx.url)
    return null;
  }
  const basicAuthItems = authorization.split(' ');
  if (basicAuthItems.length !== 2) {
    log4js.error('http basic auth request [%s %s] invalid! authorization header format error', ctx.method, ctx.url)
    return null;
  }
  const base64Credentials = basicAuthItems[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const [username, password] = credentials.split(':');

  return { username, password };
}


function getClientToken(ctx) {
  let token = ctx.request.headers['x-rbac-token']
  if (!token) {
    token = ctx.cookies.get('x-rbac-token')
  }
  if (token == "logouted") {
    return null;
  }
  return token
}

function setResponseInfo(ctx, userInfo) {
  ctx.set('x-rbac-userID', userInfo.id);
  ctx.set('x-rbac-username', userInfo.username);
}

async function basicAuthCheck(ctx) {
  const tokenUserInfo = getBasicUserInfo(ctx)
  if (!tokenUserInfo) {
    log4js.error('http basic auth request [%s %s] invalid! authorization header missing', ctx.method, ctx.url)
    throw new RbacTokenError('TOKEN MISSING')
  }
  // get appid from http get params
  const appid = ctx.query.appID
  const username = tokenUserInfo.username
  const {userInfo: originUserInfo, cached: cached1} = await userCache.getUserInfoByName(username)
  log4js.info('getUserInfoByName(username:%s) cached: %s', username, cached1)
  if (!originUserInfo) {
    log4js.error('request [%s %s] invalid! username:%s not found in database', ctx.method, ctx.path, username)
    throw new RbacTokenError('TOKEN_USER_NOT_FOUND')
  }

  if (originUserInfo.authType !== constant.AuthType.PASSWORD) { // user not exist or not a normal user
    log4js.warn('user [%s] login failed! user not exist', username)
    throw new RbacTokenError( errors.ERR_USER_NOT_FOUND)
  }

  // compare the password.
  if (!originUserInfo.password || !util.comparePassword(tokenUserInfo.password, originUserInfo.password)) {
    log4js.warn('user [%s] login failed! password error', username)
    throw new RbacTokenError( errors.ERR_PASSWORD_ERROR)
  }

  if (originUserInfo.status === constant.UserStatus.Disabled) {
    log4js.error('request [%s %s] failed! user [%s] is disabled', ctx.method, ctx.path, originUserInfo.username)
    throw new RbacTokenError('USER_IS_DISABLED')
  }

  const {userInfo, cached} = await userCache.getUserInfoById(originUserInfo.id, appid, originUserInfo)
  log4js.info('getUserInfoById(userId:%d, appID:%s) cached: %s', originUserInfo.id, appid, cached)
  if (!userInfo) {
    log4js.error('request [%s %s] invalid! userId:%d (from token) not found in database', ctx.method, ctx.path, userId)
    throw new RbacTokenError('TOKEN_USER_NOT_FOUND')
  }
  ctx.userInfo = userInfo
  ctx.appid = appid
  log4js.info('http basic auth request [%s %s] success! userInfo: %s', ctx.method, ctx.url, JSON.stringify(userInfo))

  try {
    setResponseInfo(ctx, userInfo);
  } catch (ex) {
    log4js.error('setResponseInfo failed! err:', ex)
  }
}

module.exports = function() {
  return async (ctx, next) => {
    if (needCheckToken(ctx)) {
      const token = getClientToken(ctx)
      if (token) {
        const tokenUserInfo = await tokenUtil.tokenCheck(token)
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
      } else {
        await basicAuthCheck(ctx);
      }
    }

    await next()
  }
}
