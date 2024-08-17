const config = require('../../conf/config')
const ResourceModel = require('../model/resource')
const {WolfCache} = require('../util/wolf-cache')
const constant = require('../util/constant')
const Sequelize = require('sequelize')
const Op = require('sequelize').Op;
const log4js = require('../util/log4js')
const {HttpRadixTree} = require('rax-radix-tree')

const keyPrefix = 'wolfres:'

const resourceCache = new WolfCache(keyPrefix)
let radixTreeCache = {}

function setRadixTreeCache(newCache) {
  radixTreeCache = newCache
}

function getRadixTreeCache() {
  return radixTreeCache
}

async function initRadixTreeCache() {
  if (!config.rbacAccessCheckByRadixTree) {
    return
  }
  // 创建一个对象来存储每个appId的RadixTree
  const appRadixTrees = {}

  // 使用迭代器方法获取matchType=radixtree的数据
  const resourceIterator = await ResourceModel.findAll({
    where: { matchType: 'radixtree' },
    raw: true,
    order: [['id', 'ASC']],
  }).then(resources => resources[Symbol.iterator]());
  const appRoutes = {};

  for (const resourceData of resourceIterator) {
    const { appID, name, action, hosts, remoteAddrs, exprs } = resourceData

    // 如果这个appID还没有对应的路由列表，就创建一个
    if (!appRoutes[appID]) {
      appRoutes[appID] = [];
    }

    const route = {
      paths: [name],
      methods: [action],
      hosts,
      meta: resourceData,
      remoteAddrs,
      exprs,
    };

    appRoutes[appID].push(route);
  }

  // 为每个appID创建RadixTree并添加路由
  for (const [appID, routes] of Object.entries(appRoutes)) {
    appRadixTrees[appID] = new HttpRadixTree(routes);
  }

  // 使用函数来设新的缓存
  setRadixTreeCache(appRadixTrees)

  log4js.info(`RadixTree cache initialized for ${Object.keys(appRadixTrees).length} apps`)
}

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


async function getResourceByRadixTree(appID, query) {
  const radixTree = getRadixTreeCache()[appID];
  if (!radixTree) {
    return { resource: null, cached: 'miss' }
  }
  const matchResult = radixTree.findRoute(query)
  if(matchResult) {
    return { resource: matchResult.meta, cached: 'miss' }
  }
  return { resource: null, cached: 'miss' }
}

// 添加这些导入
const { setTimeout, clearTimeout } = require('timers');

let initRadixTreeCacheTimer = null;

// 创建一个防抖函数
function debounceInitRadixTreeCache(delay) {
  return function() {
    if (initRadixTreeCacheTimer) {
      clearTimeout(initRadixTreeCacheTimer);
    }
    log4js.info('debounceInitRadixTreeCache run initRadixTreeCache after %d seconds', delay)
    initRadixTreeCacheTimer = setTimeout(async () => {
      try {
        await initRadixTreeCache();
        log4js.info('debounceInitRadixTreeCache initRadixTreeCache successfully after debounce');
      } catch (error) {
        log4js.error('Error initializing RadixTree cache:', error);
      } finally {
        initRadixTreeCacheTimer = null; // 清空定时器引用
      }
    }, delay * 1000);
  }
}

// 创建一个延迟执行的initRadixTreeCache函数
const debouncedInitRadixTreeCache = debounceInitRadixTreeCache(config.rbacInitRadixTreeInitDelay); // n秒延迟


async function flushResourceCache() {
  await resourceCache.flushAll();
  debouncedInitRadixTreeCache();
  log4js.info("---- resourceCache.flushAll ----")
}

async function flushCacheImmediately() {
  await resourceCache.flushAll();
  await initRadixTreeCache();
  log4js.info("---- resourceCache.flushAll ----")
}

exports.initRadixTreeCache = initRadixTreeCache;
exports.initRadixTreeCacheDelay = debouncedInitRadixTreeCache;
exports.getResource = getResource
exports.flushResourceCache = flushResourceCache;
exports.flushCacheImmediately = flushCacheImmediately;
exports.getResourceByRadixTree = getResourceByRadixTree;
exports.getRadixTreeCache = getRadixTreeCache;
exports.setRadixTreeCache = setRadixTreeCache;