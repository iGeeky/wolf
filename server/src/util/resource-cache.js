const NodeCache = require( 'node-cache' );
const ResourceModel = require('../model/resource')
const resourceCache = new NodeCache({stdTTL: 3600, checkperiod: 60*5});
const Sequelize = require('sequelize')
const Op = require('sequelize').Op;


async function getResourceFromDb(appID, action, name) {
  const where = {appID: appID}
  where.action = {[Op.in]: [action, 'ALL']}
  where[Op.or] = [
    {matchType: 'equal', name: name},
    {matchType: 'suffix', name: Sequelize.literal(`right('${name}', length(name)) = name`)},
    {matchType: 'prefix', name: Sequelize.literal(`substr('${name}', 1, length(name)) = name`)},
  ]

  const order = [['priority', 'ASC']]
  const options = {where, order}

  let resource = await ResourceModel.findOne(options)
  resource = resource.toJSON()
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
}

exports.getResource = getResource
exports.flushResourceCache = flushResourceCache;
