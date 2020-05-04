const NodeCache = require( 'node-cache' );
const config = require('../../conf/config')
const ResourceModel = require('../model/resource')
const resourceCache = new NodeCache({stdTTL: config.memCacheTTLSecond, checkperiod: 60*5});
const constant = require('./constant')
const Sequelize = require('sequelize')
const Op = require('sequelize').Op;
const log4js = require('./log4js')


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
  const key = `res:${appID}-${action}-${name}`
  let resource = resourceCache.get(key);
  if (resource) {
    return {resource, cached: 'hit'}
  }
  resource = await getResourceFromDb(appID, action, name)
  if (!resource) {
    return {}
  }

  resourceCache.set(key, resource)

  return {resource, cached: 'miss'}
}

function flushResourceCache() {
  resourceCache.flushAll();
  log4js.info("---- resourceCache.flushAll ----")
}

exports.getResource = getResource
exports.flushResourceCache = flushResourceCache;
