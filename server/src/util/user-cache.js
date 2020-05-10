const NodeCache = require( 'node-cache' );
const config = require('../../conf/config')
const UserModel = require('../model/user')
const UserRoleModel = require('../model/user-role')
const RoleModel = require('../model/role')
const userCache = new NodeCache({stdTTL: config.memCacheTTLSecond, checkperiod: 60*5});
const log4js = require('./log4js')


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
  const key = `user:${userId}-${appId}`
  let userInfo = userCache.get(key);
  if (userInfo) {
    return {userInfo, cached: 'hit'}
  }
  userInfo = await getUserInfoFromDbById(userId, appId)
  if (!userInfo) {
    return {}
  }

  userCache.set(key, userInfo)

  return {userInfo, cached: 'miss'}
}

function flushUserCache() {
  userCache.flushAll();
  log4js.info("---- userCache.flushAll ----")
}

function flushUserCacheByID(userId, appId){
  const key = `user:${userId}-${appId}`
  userCache.del(key)
  log4js.info("---- userCache.del(%s) ----", key)
}

exports.getUserInfoById = getUserInfoById;
exports.flushUserCache = flushUserCache;
exports.flushUserCacheByID = flushUserCacheByID;
