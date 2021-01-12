const BasicService = require('./basic-service')
const UserRoleModel = require('../model/user-role')
const AccessDenyError = require('../errors/access-deny-error')
const constant = require('../util/constant')
const util = require('../util/util')
const userCache = require('../util/user-cache')
const userRoleFields = ['userID', 'appID', 'permIDs', 'roleIDs', 'createTime'];

function getDefaultUserRole(userId, appId) {
  const userRole = {userID: userId, appID: appId, permIDs: [], roleIDs: [], createTime: 0}
  return userRole;
}

class UserRole extends BasicService {
  constructor(ctx) {
    super(ctx, UserRoleModel)
  }

  async log(bizMethod) {
    if (bizMethod === 'set' || bizMethod === 'delete') {
      this.log4js.info('---- url: %s, method: %s, flush user cache ----', this.url, bizMethod)
      userCache.flushUserCache();
    }
  }

  async get() {
    const userId = this.getRequiredIntArg('userID')
    const appId = this.getRequiredArg('appID')
    const where = {userID: userId, appID: appId}
    const options = {where}
    const userRole = await this.ObjectModel.findOne(options)
    if (!userRole) {
      const data = {userRole: getDefaultUserRole(userId, appId)}
      this.success(data);
      return
    }
    const data = {userRole: util.filterFieldWhite(userRole.toJSON(), userRoleFields)}
    this.success(data)
  }

  async set() {
    this.checkMethod('POST')
    const fieldsMap = {
      userID: {type: 'integer', required: true},
      appID: {type: 'string', required: true},
      permIDs: {type: 'array'},
      roleIDs: {type: 'array'},
    }

    const values = this.getCheckedValues(fieldsMap)
    await this.checkAppIDsExist([values.appID])
    await this.checkPermIDsExist(values.appID, values.permIDs)
    await this.checkRoleIDsExist(values.appID, values.roleIDs)

    values.createTime = util.unixtime();
    values.updateTime = util.unixtime();

    const userInfo = this.ctx.userInfo
    if (userInfo.manager === constant.Manager.admin) {
      const appIds = userInfo.appIDs || []
      if (appIds.indexOf(values.appID) === -1) { // user do not have permission to this app.
        this.log4js.error('access [user-role/set] failed! user:%s have no permission to do this operation', this.ctx.userInfo.username)
        throw new AccessDenyError('no permission to do this operation.')
      }
    }

    const options = {where: {userID: values.userID, appID: values.appID}}
    const {newValues: userRole} = await this.ObjectModel.upsert(values, options)
    const data = {'userRole': util.filterFieldWhite(userRole.toJSON(), userRoleFields)}
    this.success(data);
  }

  async delete() {
    const userId = this.getRequiredIntArg('userID')
    const appId = this.getRequiredArg('appID')
    const where = {userID: userId, appID: appId}
    const options = {where}
    const rowCount = await this.ObjectModel.destroy(options);
    this.success({count: rowCount})
  }
}

module.exports = UserRole

