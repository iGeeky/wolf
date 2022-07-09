const config = require('../../conf/config')
const ResourceModel = require('../model/resource')
const {WolfCache} = require('./wolf-cache')
const constant = require('./constant')
const Sequelize = require('sequelize')
const Op = require('sequelize').Op;
const log4js = require('./log4js')

const keyPrefix = 'wolfres:'

const resourceCache = new WolfCache(keyPrefix)

async function getResourceFromDb(appID, action, name) {
  const where = {appID: appID}
  where.action = {[Op.in]: [action, 'ALL']}
  where[Op.or] = [
    {matchType: constant.MatchType.equal, name: name},
    {matchType: constant.MatchType.suffix, name: Sequelize.literal(`right('${name}', length(name)) = name`)},
    {matchType: constant.MatchType.prefix, name: Sequelize.literal(`substr('${name}', 1, length(name)) = name`)},
  ]

  const order = [['priority', 'ASC']]
  const options = {where, order}

  let resource = await ResourceModel.findOne(options)
  if (resource) {
    resource = resource.toJSON()
  }
  return resource
}


async function getResource(appID, action, name) {
  const key = `${keyPrefix}:${appID}-${action}-${name}`
  let resource = await resourceCache.get(key);
  if (resource) {
    if (resource === '#') {
      resource = undefined
    }
    return {resource, cached: 'hit'}
  }
  resource = await getResourceFromDb(appID, action, name)
  if (!resource) {
    await resourceCache.set(key, '#')
  } else {
    await resourceCache.set(key, resource)
  }

  return {resource, cached: 'miss'}
}

async function flushResourceCache() {
  await resourceCache.flushAll();
  log4js.info("---- resourceCache.flushAll ----")
}

exports.getResource = getResource
exports.flushResourceCache = flushResourceCache;
