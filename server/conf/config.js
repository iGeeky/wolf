const config = {
  rootUserInitialPassword: process.env.RBAC_ROOT_PASSWORD || '123456',
  tokenKey: process.env.RBAC_TOKEN_KEY || 'b5155b92b13a02d08d2cc1bf8b81bec7c0c70fb8',
  cryptKey: process.env.WOLF_CRYPT_KEY || 'fbd4962351924792cb5e5b131435cd30b24e3570',
  rbacTokenExpireTime: parseInt(process.env.RBAC_TOKEN_EXPIRE_TIME) || 3600 * 24 * 30,
  consoleTokenExpireTime: parseInt(process.env.CONSOLE_TOKEN_EXPIRE_TIME) || 3600 * 24 * 30,
  memCacheTTLSecond: 600,
  clientChangePassword: (process.env.CLIENT_CHANGE_PWD || 'yes') === 'yes',
  database: {
    url: process.env.RBAC_SQL_URL || 'postgres://wolfroot:123456@127.0.0.1:5432/wolf',
  },
  oauthOptions: {
    allowEmptyState: false,
    allowExtendedTokenAttributes: true,
    grants: ['authorization_code', 'refresh_token', 'client_credentials', 'password', 'implicit'],
    accessTokenLifetime: parseInt(process.env.OAUTH_ACCESS_TOKEN_LIFETIME) || 3600 * 24 * 7, // 7 days
    refreshTokenLifetime: parseInt(process.env.OAUTH_REFRESH_TOKEN_LIFETIME) || 3600 * 24 * 30, // 30 days.
  },
}

module.exports = config
