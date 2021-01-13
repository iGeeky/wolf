const config = require('../../conf/config')
const util = require('../util/util')
const Service = require('../util/service')
const errors = require('../errors/errors')
const UserModel = require('../model/user')
const UserRoleModel = require('../model/user-role')
const RoleModel = require('../model/role');
const CategoryModel = require('../model/category')
const PermissionModel = require('../model/permission')
const ApplicationModel = require('../model/application')
const MethodInvalidError = require('../errors/method-invalid-error')
const tokenUtil = require('../util/token-util')
const Op = require('sequelize').Op;
const _ = require('lodash')


class BasicService extends Service {
  constructor(ctx, ObjectModel) {
    super(ctx)
    this.ObjectModel = ObjectModel;
  }

  // for console
  async checkExist() {
    const value = this.getRequiredObjectArg('value')
    const exclude = this.getObjectArg('exclude')
    if (exclude) {
      _.forIn(exclude, function(v, k) {
        value[k] = {[Op.ne]: v}
      });
    }
    const options = {where: value}
    const obj = await this.ObjectModel.findOne(options);
    let exist = false;
    if (obj) {
      exist = true;
    }
    return this.success({exist})
  }

  // for REST
  checkMethod(method) {
    if (this.ctx.method !== method) {
      throw new MethodInvalidError(errors.errmsg(errors.ERR_METHOD_INVALID))
      return
    }
  }

  async checkAppIDsExist(appIDs) {
    if (!appIDs) {
      return
    }
    for (let id of appIDs) {
      await ApplicationModel.checkExist({id}, errors.ERR_APPLICATION_ID_NOT_FOUND)
    }
  }

  async checkPermIDsExist(appID, permIDs) {
    if (!permIDs) {
      return
    }
    for (let id of permIDs) {
      await PermissionModel.checkExist({appID, id}, errors.ERR_PERMISSION_ID_NOT_FOUND)
    }
  }

  async checkRoleIDsExist(appID, roleIDs) {
    if (!roleIDs) {
      return
    }
    for (let id of roleIDs) {
      await RoleModel.checkExist({appID, id}, errors.ERR_ROLE_ID_NOT_FOUND)
    }
  }

  async checkPermIDExist(appID, permID) {
    if (!permID) {
      return
    }
    if (permID === 'ALLOW_ALL' || permID === 'DENY_ALL') {
      return
    }
    await PermissionModel.checkExist({appID, id: permID}, errors.ERR_PERMISSION_ID_NOT_FOUND)
  }

  async checkCategoryIDExist(categoryID) {
    if (!categoryID) {
      return
    }
    await CategoryModel.checkExist({ id: categoryID }, errors.ERR_CATEGORY_ID_NOT_FOUND)
  }

  async deleteByPk(idFieldName) {
    const id = this.getRequiredArg(idFieldName)
    const object = await this.ObjectModel.findByPk(id)
    if (!object) {
      this.fail(200, errors.ERR_OBJECT_NOT_FOUND)
      return
    }
    const where = {[idFieldName]: id}
    const options = {where}
    const rowCount = await this.ObjectModel.destroy(options);
    this.success({count: rowCount})
  }

  async deleteBy(fields) {
    const where = {}
    for (const field of fields) {
      const value = this.getRequiredArg(field)
      where[field] = value;
    }
    const options = {where}
    const rowCount = await this.ObjectModel.destroy(options);
    this.success({count: rowCount})
  }

  async getDiagramByUserIds(userIds, appId) {
    const where =  {userID: {[Op.in]: userIds}, appID: appId}
    const userRoles = await UserRoleModel.findAll({where});
    const roleIds = [];
    const permIds = [];
    const nodes = [];
    const links = [];

    if(userRoles) {
      userRoles.forEach((userRole)=> {
        if(userRole.roleIDs) {
          roleIds.push(...userRole.roleIDs);
        }
        if(userRole.permIDs) {
          permIds.push(...userRole.permIDs);
        }
      });

      // role nodes
      const roleWhere = {id: {[Op.in]: roleIds}, appID: appId};
      const roles = await RoleModel.findAll({where: roleWhere});
      if(roles) {
        roles.forEach((role)=> {
          if(role.permIDs) {
            permIds.push(...role.permIDs);
          }
          const roleKey = `role:${role.id}`
          const node = {key: roleKey, text: role.name, category: 'role'}
          nodes.push(node);
        })
      }

      // permission nodes
      const permissionWhere = {id: {[Op.in]: permIds}, appID: appId};
      const permissions = await PermissionModel.findAll({where: permissionWhere});
      if(permissions) {
        permissions.forEach((permission)=> {
          const permKey = `perm:${permission.id}`
          const node = {key: permKey, text: permission.name, category: 'permission'}
          nodes.push(node);
        })
      }

      // links: user -> role, user -> permission
      userRoles.forEach(userRole=> {
        const userKey = `user:${userRole.userID}`
        if(userRole.roleIDs) {
          userRole.roleIDs.forEach(roleID=> {
            const roleKey = `role:${roleID}`
            const link = {from: userKey, to: roleKey};
            links.push(link);
          })
        }
        if(userRole.permIDs) {
          userRole.permIDs.forEach(permID=> {
            const permKey = `perm:${permID}`
            const link = {from: userKey, to: permKey};
            links.push(link);
          })
        }
      });

      // links: role -> permission
      if(roles) {
        roles.forEach((role)=> {
          const roleKey = `role:${role.id}`
          if(role.permIDs) {
            role.permIDs.forEach(permID => {
              const permKey = `perm:${permID}`
              const link = {from: roleKey, to: permKey};
              links.push(link);
            })
          }
        })
      }
    }

    return {nodes, links}
  }

  async updateLastLoginTime(id, lastLogin) {
    const options = {where: {id}, returning: true}
    const values = {lastLogin: lastLogin}
    const {newValues: newUserInfo} = await UserModel.mustUpdate(values, options)
    return newUserInfo.toJSON().lastLogin;
  }

  async tokenCreate(userInfo, appid) {
    const { token, expiresIn } = tokenUtil.tokenEncrypt(userInfo, appid);

    const lastLogin = util.unixtime()
    try {
      this.updateLastLoginTime(userInfo.id, lastLogin)
      userInfo.lastLogin = lastLogin
    } catch (ex) {
      this.log4js.error('updateLastLoginTime failed! err:', ex)
    }

    return { token, expiresIn }
  }
}

module.exports = BasicService

