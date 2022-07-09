const config = require('../../conf/config')
const UserModel = require('../model/user')
const {WolfCache} = require('./wolf-cache')
const UserRoleModel = require('../model/user-role')
const RoleModel = require('../model/role')
const log4js = require('./log4js')

const keyPrefix = 'wolfuser:'
const userCache = new WolfCache(keyPrefix)


async function getUserInfoFromDbById(userId, appId) {
  let userInfo = await UserModel.findByPk(userId);
  if (!userInfo) {
    log4js.error('getUserInfoFromDbById(userId:%d, appId:%d) failed! not found', userId, appId)
    return null;
  }
  userInfo = userInfo.toJSON()

  const permissions = {}
  userInfo.permissions = permissions;
  userInfo.roles = {}
  if (!appId) {
    return userInfo;
  }

  const where = {appID: appId, userID: userId}
  const options = {where}
  const userRole = await UserRoleModel.findOne(options)
  if (userRole) {
    if (userRole.permIDs) {
      userRole.permIDs.forEach((permId) => {
        permissions[permId] = true;
      })
    }

    if (userRole.roleIDs) {
      for (let i=0; i < userRole.roleIDs.length; i++) {
        const roleId = userRole.roleIDs[i];
        userInfo.roles[roleId] = true;
        const where = {appID: appId, id: roleId}
        const role = await RoleModel.findOne({where})
        if (role) {
          role.permIDs.forEach((permId) => {
            permissions[permId] = true;
          })
        }
      }
    }
  }

  return userInfo;
}


async function getUserInfoById(userId, appId) {
  const key = `${keyPrefix}:${userId}-${appId}`
  let userInfo = await userCache.get(key);
  if (userInfo) {
    if (userInfo === '#') {
      userInfo = undefined
    }
    return {userInfo, cached: 'hit'}
  }
  userInfo = await getUserInfoFromDbById(userId, appId)
  if (!userInfo) {
    await userCache.set(key, '#')
    return {}
  }

  await userCache.set(key, userInfo)

  return {userInfo, cached: 'miss'}
}

async function flushUserCache() {
  await userCache.flushAll();
  log4js.info("---- userCache.flushAll ----")
}

async function flushUserCacheByID(userId, appId){
  const key = `${keyPrefix}:${userId}-${appId}`
  await userCache.del(key)
  log4js.info("---- userCache.del(%s) ----", key)
}

exports.getUserInfoById = getUserInfoById;
exports.flushUserCache = flushUserCache;
exports.flushUserCacheByID = flushUserCacheByID;
