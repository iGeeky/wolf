const config = {
  rootUserInitialPassword: process.env.RBAC_ROOT_PASSWORD || '123456',
  tokenKey: process.env.RBAC_TOKEN_KEY || 'b5155b92b13a02d08d2cc1bf8b81bec7c0c70fb8',
  cryptKey: process.env.WOLF_CRYPT_KEY || 'fbd4962351924792cb5e5b131435cd30b24e3570',
  rbacTokenExpireTime: parseInt(process.env.RBAC_TOKEN_EXPIRE_TIME) || 3600 * 24 * 30,
  consoleTokenExpireTime: parseInt(process.env.CONSOLE_TOKEN_EXPIRE_TIME) || 3600 * 24 * 30,
  rbacRecordAccessLog: (process.env.RBAC_RECORD_ACCESS_LOG || 'yes') === 'yes',
  memCacheTTLSecond: 600,
  memCacheByRedis: (process.env.MEM_CACHE_BY_REDIS || 'no') === 'yes',
  clientChangePassword: (process.env.CLIENT_CHANGE_PWD || 'yes') === 'yes',
  database: {
    url: process.env.RBAC_SQL_URL || 'postgres://wolfroot:123456@127.0.0.1:5432/wolf',
  },
  redis: {
    url: process.env.RBAC_REDIS_URL || 'redis://127.0.0.1:6379/0',
    // cluster: [{ port: 6379, host: '127.0.0.1' }],
  },
  oauthOptions: {
    allowEmptyState: false,
    allowExtendedTokenAttributes: true,
    grants: ['authorization_code', 'refresh_token', 'client_credentials', 'password', 'implicit'],
    accessTokenLifetime: parseInt(process.env.OAUTH_ACCESS_TOKEN_LIFETIME) || 3600 * 24 * 7, // 7 days
    refreshTokenLifetime: parseInt(process.env.OAUTH_REFRESH_TOKEN_LIFETIME) || 3600 * 24 * 30, // 30 days.
  },
  ldapConfig__: {
    label: 'OpenLDAP',
    url: 'ldap://127.0.0.1:389',
    baseDn: 'dc=example,dc=org',
    adminDn: 'cn=admin,dc=example,dc=org',
    adminPassword: '123456',
    userIdBase: 10000 * 100, // wolf user id = ldap user id + userIdBase
    fieldsMap: { // key=wolf-fieldname, value=ldap-fieldname
      id: 'uidNumber',
      username: 'uid',
      nickname: 'dn',
      email: 'mail',
    },
  },
}

module.exports = config

// RBAC_SQL_URL = 'mysql://wolfroot:123456@127.0.0.1:3306/wolf'
