const config = require('../../conf/config')
const NodeCache = require( 'node-cache' );
const { redisClient } = require('./redis-util')
const log4js = require('./log4js')

const keyListPrefix = 'setkeys'

class RedisCache {
  constructor(redisClient, args = { stdTTL: 60 * 10 }) {
    this.redisClient = redisClient
    this.stdTTL = args.stdTTL
    this.prefix = args.prefix || ''
  }

  async set(key, value) {
    if (value === undefined) {
      value = '-'
    } else if (value && typeof value !== 'string') {
      value = JSON.stringify(value)
    }
    await this.redisClient.set(key, value, 'EX', this.stdTTL )
    const skey = `${this.prefix}:${keyListPrefix}` 
    await this.redisClient.sadd(skey, key)
    await this.redisClient.expire(skey, this.stdTTL * 1000)
  }

  async get(key) {
    let value = await this.redisClient.get(key)
    if (value && typeof value === 'string') {
      if (value === '-') {
        value = undefined
      } else if (value.length > 1) {
        value = JSON.parse(value)
      }
    }
    return value
  }

  async del(key) {
    return await this.redisClient.del(key)
  }

  async flushAll() {
    const skey = `${this.prefix}:${keyListPrefix}` 
    const keys = await this.redisClient.smembers(skey)
    const delKeys = []
    for (const key of keys) {
      delKeys.push(['del', key])
    }
    await this.redisClient.multi(delKeys).exec()
    log4js.info("---- RedisCache.flushAll() ---- %s", JSON.stringify(keys))
    await this.redisClient.del(skey)
  }
}

function initCache(keyPrefix) {
  if (config.memCacheByRedis) {
    const cache = new RedisCache(redisClient, {stdTTL: config.memCacheTTLSecond, prefix: keyPrefix})
    return {cache, cacheByRedis: true}
  } else {
    let checkperiod = Math.floor(config.memCacheTTLSecond / 2)
    if (checkperiod < 1) {
      checkperiod = 1
    }
    const cache = new NodeCache({stdTTL: config.memCacheTTLSecond, checkperiod});
    return {cache, cacheByRedis: false}
  }
}

class WolfCache {
  constructor(keyPrefix) {
    const {cache, cacheByRedis} = initCache(keyPrefix)
    this.cache = cache
    this.cacheByRedis = cacheByRedis
  }


  async set(key, value) {
    if (this.cacheByRedis) {
      await this.cache.set(key, value)
    } else {
      this.cache.set(key, value)
    }
  }

  async get(key) {
    if (this.cacheByRedis) {
      return await this.cache.get(key)
    } else {
      return this.cache.get(key)
    }
  }

  async flushAll() {
    if (this.cacheByRedis) {
      return await this.cache.flushAll()
    } else {
      return this.cache.flushAll()
    }
  }

  async del(key) {
    if (this.cacheByRedis) {
      return await this.cache.del(key)
    } else {
      return this.cache.del(key)
    }
  }
}

exports.WolfCache = WolfCache
