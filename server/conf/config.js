const config = {
  rootUserInitialPassword: process.env.RBAC_ROOT_PASSWORD || '123456',
  tokenKey: process.env.RBAC_TOKEN_KEY || 'b5155b92b13a02d08d2cc1bf8b81bec7c0c70fb8',
  cryptKey: process.env.WOLF_CRYPT_KEY || 'fbd4962351924792cb5e5b131435cd30b24e3570',
  rbacTokenExpireTime: parseInt(process.env.RBAC_TOKEN_EXPIRE_TIME) || 3600 * 24 * 30,
  consoleTokenExpireTime: parseInt(process.env.CONSOLE_TOKEN_EXPIRE_TIME) || 3600 * 24 * 30,
  consoleLoginWithCaptcha: ((process.env.CONSOLE_LOGIN_WITH_CAPTCHA || 'no') === 'yes'),
  rbacRecordAccessLog: (process.env.RBAC_RECORD_ACCESS_LOG || 'yes') === 'yes',
  memCacheTTLSecond: 600,
  memCacheByRedis: (process.env.MEM_CACHE_BY_REDIS || 'no') === 'yes',
  clientChangePassword: (process.env.CLIENT_CHANGE_PWD || 'yes') === 'yes',
  rbacUseRadixTreeRouting: (process.env.RBAC_USE_RADIX_TREE_ROUTING || 'no') === 'yes',
  rbacInitRadixTreeInitDelay: parseFloat(process.env.RBAC_INIT_RADIX_TREE_INIT_DELAY) || 0.1,
  database: {
    url: process.env.RBAC_SQL_URL || 'postgres://wolfroot:123456@127.0.0.1:5432/wolf',
  },
  redis: {
    url: process.env.RBAC_REDIS_URL || 'redis://:audit123456@127.0.0.1:6379/0',
    // cluster: [{ port: 6379, host: '127.0.0.1' }],
  },
  oauthOptions: {
    allowEmptyState: false,
    allowExtendedTokenAttributes: true,
    grants: ['authorization_code', 'refresh_token', 'client_credentials', 'password', 'implicit'],
    accessTokenLifetime: parseInt(process.env.OAUTH_ACCESS_TOKEN_LIFETIME) || 3600 * 24 * 7, // 7 days
    refreshTokenLifetime: parseInt(process.env.OAUTH_REFRESH_TOKEN_LIFETIME) || 3600 * 24 * 30, // 30 days.
  },
  ai: {
    // AI 模型与服务配置（本段为准；亦可仅通过环境变量注入，见各字段）
    // 未配置有效 API Key 时 AI 功能不可用（ai.apiKey 或 OPENAI_API_KEY 等）
    provider: process.env.AI_PROVIDER || 'openai',
    model: process.env.AI_MODEL || 'deepseek-v4-flash',
    // API 协议类型。若模型已在 pi-ai 内置注册表中则自动识别，否则使用此值作为 fallback
    // 可选值: openai-completions(兼容所有 OpenAI 兼容 API), openai-responses(仅官方 OpenAI), anthropic-messages, google-generative-ai 等
    api: process.env.AI_API || 'openai-completions',
    // API Key：可选。不设则回退到各 provider 环境变量（如 OPENAI_API_KEY）
    apiKey: process.env.AI_API_KEY || '',
    // 可选：自定义 API 地址（如代理、自建 OpenAI 兼容服务）。不设则使用 pi-ai 默认
    // 填写时需包含 API 版本路径，例如 https://api.deepseek.com/v1（末尾的 /v1 不可省略）
    baseUrl: process.env.AI_BASE_URL || '',
    // wolf AI 行为配置
    maxTurns: parseInt(process.env.AI_MAX_TURNS) || 20,
    maxHistoryMessages: parseInt(process.env.AI_MAX_HISTORY) || 100,
    thinkingLevel: process.env.AI_THINKING_LEVEL || 'low',
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
