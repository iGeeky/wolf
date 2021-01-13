const BasicService = require('./basic-service')
const PermissionModel = require('../model/permission')
const UserRoleModel = require('../model/user-role')
const RoleModel = require('../model/role')

const AccessDenyError = require('../errors/access-deny-error')
const util = require('../util/util')
const Op = require('sequelize').Op;
const errors = require('../errors/errors')
const _ = require('lodash')
const permissionFields = ['id', 'appID', 'name', 'description', 'categoryID', 'createTime'];


class Permission extends BasicService {
  constructor(ctx) {
    super(ctx, PermissionModel)
  }

  async list() {
    this.checkMethod('GET')
    const limit = this.getIntArg('limit', 10)
    const page = this.getIntArg('page', 1)
    const offset = (page-1) * limit
    const order = this.getOrderByArgs('-id')
    const appId = this.getRequiredArg('appID')
    const key = this.getArg('key')
    const where = {appID: appId}
    if (key && key !== '') {
      where[Op.or] = [{id: {[Op.regexp]: key}}, {name: {[Op.regexp]: key}}]
    }

    const options = {offset, limit, where, include: ['category']}
    if (order) {
      options.order = order;
    }
    const permissions = await PermissionModel.findAll(options)
    permissions.forEach((permission, i) => {
      permission = permission.toJSON()
      permissions[i] = permission;
    });
    const total = await PermissionModel.count({where})
    const data = {permissions, total}
    this.success(data)
  }

  async post() {
    const fieldsMap = {
      appID: {type: 'string', required: true},
      id: {type: 'string', required: true},
      name: {type: 'string', required: true},
      description: {type: 'string'},
      categoryID: {type: 'integer'},
    }
    const values = this.getCheckedValues(fieldsMap)

    await this.checkAppIDsExist([values.appID])
    await PermissionModel.checkNotExist({appID: values.appID, id: values.id}, errors.ERR_PERMISSION_ID_EXIST)
    await PermissionModel.checkNotExist({appID: values.appID, name: values.name}, errors.ERR_PERMISSION_NAME_EXIST)
    if (values.categoryID) {
      await this.checkCategoryIDExist(values.categoryID)
    }

    values.createTime = util.unixtime();
    values.updateTime = util.unixtime();
    const permission = await PermissionModel.create(values);
    const data = {'permission': util.filterFieldWhite(permission.toJSON(), permissionFields)}
    this.success(data);
  }

  async put() {
    const fieldsMap = {
      name: {type: 'string'},
      description: {type: 'string'},
      categoryID: {type: 'integer'},
    }
    const appID = this.getRequiredArg('appID')
    const id = this.getRequiredArg('id')
    const values = this.getCheckedValues(fieldsMap)

    await this.checkAppIDsExist([appID])
    await PermissionModel.checkExist({appID, id}, errors.ERR_PERMISSION_ID_NOT_FOUND)
    if (values.name) {
      await PermissionModel.checkNotExist({appID, 'id': {[Op.ne]: id}, name: values.name}, errors.ERR_PERMISSION_NAME_EXIST)
    }
    if (values.categoryID) {
      await this.checkCategoryIDExist(values.categoryID)
    }

    values.updateTime = util.unixtime();
    const options = {where: {id, appID}}
    const {newValues: permission} = await PermissionModel.mustUpdate(values, options)
    const data = {'permission': util.filterFieldWhite(permission.toJSON(), permissionFields)}
    this.success(data);
  }

  async delete() {
    const appID = this.getRequiredArg('appID')
    const permID = this.getRequiredArg('id')
    const where = { appID, permIDs: { [Op.contains]: [permID] }}
    let existObject = await UserRoleModel.findOne({where})
    if(!existObject) {
      existObject = await RoleModel.findOne({where})
    }
    if (existObject) {
      this.log4js.error('Deleting the permission(%s) failed, it has been used.', permID)
      throw new AccessDenyError('Deleting the permission failed, it has been used.')
    }

    await this.deleteBy(['id', 'appID'])
  }

  async deleteByAppId() {
    await this.deleteBy(['appID'])
  }
}

module.exports = Permission

