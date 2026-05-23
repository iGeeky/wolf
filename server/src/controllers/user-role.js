const BasicService = require('./basic-service')
const UserRoleModel = require('../model/user-role')
const util = require('../util/util')
const userCache = require('../service/user-cache')
const userRoleFields = ['userID', 'appID', 'permIDs', 'roleIDs', 'createTime'];

function getDefaultUserRole(userId, appId) {
  const userRole = {userID: userId, appID: appId, permIDs: [], roleIDs: [], createTime: 0}
  return userRole;
}

class UserRole extends BasicService {
  constructor(ctx) {
    super(ctx, UserRoleModel)
  }

  async access(bizMethod) {
    const appID = this.getArg('appID')
    if (appID) {
      this.assertAppAccess(appID)
    }
  }

  async log(bizMethod) {
    if (bizMethod === 'set' || bizMethod === 'delete') {
      this.log4js.info('---- url: %s, method: %s, flush user cache ----', this.url, bizMethod)
      await userCache.flushUserCache();
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

    // appID 访问权限已在 access() 中统一校验
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

