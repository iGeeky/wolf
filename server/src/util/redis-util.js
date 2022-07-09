const config = require('../../conf/config')
const Redis = require('ioredis')

const redisConfig = config.redis
function initRedisClient() {
  if (redisConfig.cluster) { // https://github.com/luin/ioredis#cluster
    const clusterOptions = redisConfig.clusterOptions
    return new Redis.Cluster(redisConfig.cluster, clusterOptions)
  }
  return new Redis(redisConfig.url)
}

const redisClient = initRedisClient()

exports.redisClient = redisClient
