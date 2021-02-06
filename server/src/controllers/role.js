const BasicService = require('./basic-service')
const RoleModel = require('../model/role')
const userCache = require('../util/user-cache')
const UserRoleModel = require('../model/user-role')
const AccessDenyError = require('../errors/access-deny-error')
const util = require('../util/util')
const Op = require('sequelize').Op;
const errors = require('../errors/errors')
const roleFields = ['id', 'appID', 'name', 'description', 'permIDs', 'createTime'];


class Role extends BasicService {
  constructor(ctx) {
    super(ctx, RoleModel)
  }

  async log(bizMethod) {
    if (bizMethod === 'post' || bizMethod === 'put' || bizMethod === 'delete') {
      this.log4js.info('---- url: %s, method: %s, flush user cache ----', this.url, bizMethod)
      userCache.flushUserCache();
    }
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

    const options = {offset, limit, where}
    if (order) {
      options.order = order;
    }
    const roles = await RoleModel.findAll(options)
    roles.forEach((role, i) => {
      role = role.toJSON()
      roles[i] = role;
    });
    const total = await RoleModel.count({where})
    const data = {roles, total}
    this.success(data)
  }

  async post() {
    const fieldsMap = {
      appID: {type: 'string', required: true},
      id: {type: 'string', required: true},
      name: {type: 'string', required: true},
      description: {type: 'string'},
      permIDs: {type: 'array'},
    }
    const values = this.getCheckedValues(fieldsMap)

    await RoleModel.checkNotExist({appID: values.appID, id: values.id}, errors.ERR_ROLE_ID_EXIST)
    await RoleModel.checkNotExist({appID: values.appID, name: values.name}, errors.ERR_ROLE_NAME_EXIST)
    await this.checkAppIDsExist([values.appID])
    await this.checkPermIDsExist(values.appID, values.permIDs)

    values.createTime = util.unixtime();
    values.updateTime = util.unixtime();
    const role = await RoleModel.create(values);
    const data = {'role': util.filterFieldWhite(role.toJSON(), roleFields)}
    this.success(data);
  }

  async put() {
    const fieldsMap = {
      name: {type: 'string'},
      description: {type: 'string'},
      permIDs: {type: 'array'},
    }
    const appID = this.getRequiredArg('appID')
    const id = this.getRequiredArg('id')
    const values = this.getCheckedValues(fieldsMap)

    await this.checkAppIDsExist([appID])
    await RoleModel.checkExist({ appID, id }, errors.ERR_ROLE_ID_NOT_FOUND)
    if (values.name) {
      await RoleModel.checkNotExist({'id': {[Op.ne]: id}, appID: appID, name: values.name}, errors.ERR_ROLE_NAME_EXIST)
    }
    await this.checkPermIDsExist(appID, values.permIDs)

    values.updateTime = util.unixtime();
    const options = {where: {id, appID}}
    const {newValues: role} = await RoleModel.mustUpdate(values, options)
    const data = {'role': util.filterFieldWhite(role.toJSON(), roleFields)}
    this.success(data);
  }

  async delete() {
    const appID = this.getRequiredArg('appID')
    const roleID = this.getRequiredArg('id')
    const where = {appID, roleIDs: { [Op.contains]: [roleID] }}
    const existObject = await UserRoleModel.findOne({where})
    if (existObject) {
      this.log4js.error('Deleting the role(%s) failed, it has been used.', roleID)
      throw new AccessDenyError('Deleting the role failed, it has been used.')
    }
    await this.deleteBy(['id', 'appID'])
  }

  async deleteByAppId() {
    await this.deleteBy(['appID'])
  }
}

module.exports = Role

