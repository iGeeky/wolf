const BasicService = require('./basic-service')
const CategoryModel = require('../model/category')
const AccessDenyError = require('../errors/access-deny-error')
const PermissionModel = require('../model/permission')
const util = require('../util/util')
const Op = require('sequelize').Op;
const errors = require('../errors/errors')
const _ = require('lodash')
const categoryFields = ['id', 'appID', 'name', 'createTime'];

class Category extends BasicService {
  constructor(ctx) {
    super(ctx, CategoryModel)
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
      where[Op.or] = [{name: {[Op.regexp]: key}}]
    }

    const options = {offset, limit, where}
    if (order) {
      options.order = order;
    }
    const categorys = await CategoryModel.findAll(options)
    categorys.forEach((category, i) => {
      category = category.toJSON()
      categorys[i] = category;
    });
    const total = await CategoryModel.count({where})
    const data = {categorys, total}
    this.success(data)
  }

  async post() {
    const fieldsMap = {
      appID: {type: 'string', required: true},
      name: {type: 'string', required: true},
    }
    const values = this.getCheckedValues(fieldsMap)

    await CategoryModel.checkNotExist({appID: values.appID, name: values.name}, errors.ERR_CATEGORY_NAME_EXIST)
    await this.checkAppIDsExist([values.appID])

    values.createTime = util.unixtime();
    values.updateTime = util.unixtime();
    const category = await CategoryModel.create(values);
    const data = {'category': util.filterFieldWhite(category.toJSON(), categoryFields)}
    this.success(data);
  }

  async put() {
    const fieldsMap = {
      name: {type: 'string'},
    }
    const id = this.getRequiredIntArg('id')
    const values = this.getCheckedValues(fieldsMap)

    await this.checkCategoryIDExist(id)
    await CategoryModel.checkNotExist({'id': {[Op.ne]: id}, name: values.name}, errors.ERR_CATEGORY_NAME_EXIST)

    values.updateTime = util.unixtime();
    const options = {where: {id}}
    const {newValues: category} = await CategoryModel.mustUpdate(values, options)
    const data = {'category': util.filterFieldWhite(category.toJSON(), categoryFields)}
    this.success(data);
  }

  async delete() {
    const categoryID = this.getRequiredArg('id')
    const where = {categoryID}
    const existObject = await PermissionModel.findOne({where})
    if (existObject) {
      this.log4js.error('Deleting the category(%s) failed, it has been used.', categoryID)
      throw new AccessDenyError('Deleting the category failed, it has been used.')
    }
    await this.deleteByPk('id')
  }

  async deleteByAppId() {
    await this.deleteBy(['appID'])
  }
}

module.exports = Category

