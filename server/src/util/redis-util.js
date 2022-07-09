const config = require('../../conf/config')
const redis = require('redis')
const log4js = require('./log4js')

const redisConfig = config.redis

class WolfRedisClient {
  constructor(redisConfig) {
    const config = Object.assign({}, redisConfig)
    config.socket = { connectTimeout: 3000, reconnectStrategy: this.reconnectStrategy }
    config.disableOfflineQueue = true
    this.config = config
    this.client = redis.createClient(config)
    this.lastErrorTime = 0
    this.client.on('error', function(err) {
      const now = new Date().getTime()
      if (now - this.lastErrorTime > 1000) {
        log4js.error('redis error: %s', err)
        this.lastErrorTime = now
      }
    })
  }

  reconnectStrategy(retries) {
    // https://github.com/redis/node-redis/blob/master/docs/client-configuration.md
    if (retries > 10) {
      return new Error('failed to reconnect redis, retries=' + retries)
    }
    return Math.min(retries * 100, 1000 * 3)
  }

  async connect() {
    log4js.info("connect to redis (%s) ...", this.config.url)
    await this.client.connect()
    log4js.info('successfully connected to redis')
  }

  mockMethods() {
    function mockMethod(method) {
      WolfRedisClient.prototype[method] = async function(...args) {
        try {
          return await this.client[method](...args)
        } catch( ex ) {
          log4js.error('redis.%s(%s) failed, err: %s', method, args, ex)
          await this.connect()
          throw ex
        }
      }
    }
    const methods = ['set', 'get', 'del', 'incr', 'incrBy', 'keys']
    for (let method of methods) {
      mockMethod(method)
    }
  }
}

redisClient = new WolfRedisClient(redisConfig)
redisClient.connect().catch((err)=>{
  console.error('failed to connect to redis, ', err)
  process.exit(1)
})
redisClient.mockMethods()

exports.redisClient = redisClient
