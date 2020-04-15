const config = require('../../conf/config')
const BasicService = require('./basic-service')
const UserModel = require('../model/user')
const AccessLogModel = require('../model/access-log')
const resourceCache = require('../util/resource-cache')
const constant = require('../util/constant')
const util = require('../util/util')


const userFields = ['id', 'username', 'nickname', 'email', 'appIDs',
  'manager',  'lastLogin', 'profile', 'createTime', 'permissions', 'roles'];

class RbacPub extends BasicService {
  constructor(ctx) {
    super(ctx, UserModel)
  }

  _isRecordAccessLog() {
    if (this.ctx.action === 'OPTIONS') {
      return false;
    }

    return true;
  }

  _writeAccessLog() {
    if (!this._isRecordAccessLog()) {
      return
    }

    // Record the access log if the user logs in
    let userID = -1;
    let username = 'none'
    let nickname = 'none';
    let matchedResource = {}
    const userInfo = this.ctx.userInfo;
    if (userInfo) {
      userID = userInfo.id;
      username = userInfo.username;
      nickname = userInfo.nickname;
    }
    if (this.ctx.resource) {
      matchedResource = util.filterFieldWhite(this.ctx.resource, ['id', 'appID', 'matchType', 'url', 'action', 'permID'])
      // ignore url when permID ===ALLOW_ALL
      if (matchedResource.permID === constant.SystemPerm.ALLOW_ALL) {
        return
      }
    }
    const appID = this.ctx.appid || this.getStringArg('appID');
    const action = this.getStringArg('action')
    const resName = this.getStringArg('resName')
    const ip = this.getStringArg('clientIP')
    const body = {}
    const contentType = null;
    const status = this.ctx.status
    const date = util.currentDate('YYYY-MM-DD')
    const accessTime = util.unixtime();
    const values = {appID, userID, username, nickname, action, resName, matchedResource, status, body, contentType, date, accessTime, ip}
    AccessLogModel.create(values);
  }

  async _accessCheckInternal(userInfo, appID, action, resName) {
    const {resource, cached} = await resourceCache.getResource(appID, action, resName)
    if(resource) {
      resource.toString = function toString() {
        return JSON.stringify(this)
      }
    }
    this.log4js.info('getResource({appID: %s, action: %s, resName: %s}) res: %s, cached: %s', appID, action, resName, resource, cached)
    const data = {userInfo: util.filterFieldWhite(userInfo, userFields)}
    if (resource) {
      this.ctx.resource = resource;
      const permID = resource.permID;
      if (permID === constant.SystemPerm.ALLOW_ALL) { // allow all user access
        this.log4js.info('resource {appID: %s, action: %s, resName: %s} permission is [%s], allow all user to access!', appID, action, resName, permID)
        this.success(data)
      } else if (permID === constant.SystemPerm.DENY_ALL) { // deny all user access
        this.log4js.info('resource {appID: %s, action: %s, resName: %s} permission is [%s], not allow any user to access!', appID, action, resName, permID)
        const reason = `Access failure. resource '${resName}' is deny all user`
        this.fail(401, reason, data)
      } else if (userInfo.permissions[permID]) { // have permission
        this.log4js.info('user [%s] have permission [%s] to access {appID: %s, action: %s, resName: %s}', userInfo.username, permID, appID, action, resName)
        this.success(data)
      } else { // have no permission
        this.log4js.info('user [%s] have no permission [%s] to access {appID: %s, action: %s, resName: %s}', userInfo.username, permID, appID, action, resName)
        // TODO: get perm name.
        const reason = `Access failure. resource '${resName}' is required permission [${permID}]`
        this.fail(401, reason, data)
      }
      return
    } else {
      this.log4js.info('user [%s] check permission for resource {appID: %s, action: %s, resName: %s} failed, resource not exist!', userInfo.username, appID, action, resName)
      const reason = `Access failure. resource '${resName}' not exist`
      this.fail(401, reason, data)
    }
  }
}

module.exports = RbacPub

