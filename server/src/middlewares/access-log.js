

// const log4js = require('../util/log4js')
const util = require('../util/util')
const ArgsUtil = require('../util/args-util')
const AccessLogModel = require('../model/access-log')
const _ = require('lodash')


const ignoreUrls = {
  ['/wolf/user/info']: true,
  ['/wolf/access-log/list']: true,
}

function isRecordAccessLog(ctx) {
  if (ctx.method === 'OPTIONS') {
    return false;
  }

  if (ignoreUrls[ctx.path]) {
    return false;
  }

  if (_.startsWith(ctx.path, '/wolf/rbac/')) {
    return false;
  }
  if (_.endsWith(ctx.path, 'checkExist')) {
    return false;
  }
  return true;
}

function getRawBody(ctx) {
  const body = {raw: ctx.request.rawBody};
  return body
}

function writeAccessLog(ctx) {
  let userID = -1;
  let username = 'none'
  let nickname = 'none';

  const userInfo = ctx.userInfo;
  if (userInfo) {
    userID = userInfo.id;
    username = userInfo.username;
    nickname = userInfo.nickname;
  }
  if (isRecordAccessLog(ctx)) { // Record the access log if the user logs in
    const appID = 'rbac-console';
    const action = ctx.method
    const resName = ctx.path;
    let body = ArgsUtil.getRequestArgs(ctx)
    if (!body) {
      body = getRawBody(ctx);
    }
    const contentType = ctx.request.type
    const status = ctx.status
    const date = util.currentDate('YYYY-MM-DD')
    const accessTime = util.unixtime();
    const ip = ctx.clientIp
    const values = {appID, userID, username, nickname, action, resName, status, body, contentType, date, accessTime, ip}
    AccessLogModel.create(values);
  }
}

module.exports = function() {
  return async (ctx, next) => {
    ctx.res.on('finish', () => {
      writeAccessLog(ctx)
    })
    await next()
  }
}
