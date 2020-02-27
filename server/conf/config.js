const config = {
  rootUserInitialPassword: process.env.RBAC_ROOT_PASSWORD || '123456',
  tokenKey: process.env.RBAC_TOKEN_KEY || 'b5155b92b13a02d08d2cc1bf8b81bec7c0c70fb8',
  tokenExpireTime: 3600 * 24 * 7,
  memCacheTTLSecond: 600,
  clientChangePassword: (process.env.CLIENT_CHANGE_PWD || 'yes') === 'yes',
  database: {
    url: process.env.RBAC_SQL_URL || 'postgres://wolfroot:123456@127.0.0.1:5432/wolf',
  },
}

// console.log('>>> token KEY:', config.tokenKey)

module.exports = config
