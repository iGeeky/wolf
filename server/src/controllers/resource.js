const BasicService = require('./basic-service')
const ResourceModel = require('../model/resource')
const resourceCache = require('../util/resource-cache')
const constant = require('../util/constant')
const util = require('../util/util')
const Op = require('sequelize').Op;
const errors = require('../errors/errors')
const _ = require('lodash')
const resourceFields = ['id', 'appID', 'matchType', 'name', 'priority', 'action', 'permID', 'createTime'];


function getPriority(values) {
  let priority = 500 - values.name.length
  const matchType = values.matchType;
  const action = values.action;
  if (action === 'ALL') {
    priority += 1000;
  }
  if (matchType === constant.MatchType.equal) {
    priority += 10000;
  } else if (matchType === constant.MatchType.suffix) {
    priority += 100000;
  } else if (matchType === constant.MatchType.prefix) {
    priority += 1000000;
  }
  return priority;
}

class Resource extends BasicService {
  constructor(ctx) {
    super(ctx, ResourceModel)
  }
  async log(bizMethod) {
    if (bizMethod === 'post' || bizMethod === 'put' || bizMethod === 'delete') {
      this.log4js.info('---- url: %s, method: %s, flush resource cache ----', this.url, bizMethod)
      resourceCache.flushResourceCache();
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
      where[Op.or] = [{name: {[Op.regexp]: key}}, {permID: {[Op.regexp]: key}}]
    }

    const options = {offset, limit, where}
    if (order) {
      options.order = order;
    }
    const resources = await ResourceModel.findAll(options)
    resources.forEach((resource, i) => {
      resource = resource.toJSON()
      resources[i] = util.filterFieldWhite(resource, resourceFields)
    });
    const total = await ResourceModel.count({where})
    const data = {resources, total}
    this.success(data)
  }

  async post() {
    const fieldsMap = {
      appID: {type: 'string', required: true},
      matchType: {type: 'string', required: true, enums: [constant.MatchType.equal, constant.MatchType.suffix, constant.MatchType.prefix]},
      name: {type: 'string', required: true},
      action: {type: 'string', required: true, enums: ['ALL', 'GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH']},
      permID: {type: 'string', required: true},
    }

    const values = this.getCheckedValues(fieldsMap)
    await this.checkAppIDsExist([values.appID])
    await ResourceModel.checkNotExist({appID: values.appID, matchType: values.matchType, action: values.action, name: values.name}, errors.ERR_RESOURCE_EXIST)
    await this.checkPermIDExist(values.appID, values.permID)

    values.nameLen = values.name.length
    values.priority = getPriority(values)
    values.createTime = util.unixtime();
    values.updateTime = util.unixtime();
    const resource = await ResourceModel.create(values);
    const data = {'resource': util.filterFieldWhite(resource.toJSON(), resourceFields)}
    this.success(data);
  }

  async put() {
    const fieldsMap = {
      matchType: {type: 'string', required: true, enums: [constant.MatchType.equal, constant.MatchType.suffix, constant.MatchType.prefix]},
      name: {type: 'string', required: true},
      action: {type: 'string', required: true, enums: ['GET', 'HEAD', 'POST', 'OPTIONS', 'DELETE', 'PUT', 'PATCH', 'ALL']},
      permID: {type: 'string', required: true},
    }
    const id = this.getRequiredArg('id')
    const values = this.getCheckedValues(fieldsMap)
    const existResource = await ResourceModel.checkExist({ id }, errors.ERR_RESOURCE_ID_NOT_FOUND)
    await ResourceModel.checkNotExist({'id': {[Op.ne]: id}, appID: existResource.appID, matchType: values.matchType, action: values.action, name: values.name}, errors.ERR_RESOURCE_EXIST)
    await this.checkPermIDExist(existResource.appID, values.permID)

    values.nameLen = values.name.length
    values.priority = getPriority(values)
    values.updateTime = util.unixtime();
    const options = {where: {id}}
    const {newValues: resource} = await ResourceModel.mustUpdate(values, options)
    const data = {'resource': util.filterFieldWhite(resource.toJSON(), resourceFields)}
    this.success(data);
  }

  async delete() {
    await this.deleteByPk('id')
  }

  async deleteByAppId() {
    await this.deleteBy(['appID'])
  }
}

module.exports = Resource

