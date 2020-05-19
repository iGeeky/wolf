const Sequelize = require('../util/sequelize')
const Seq = require('sequelize')
const log4js = require('../util/log4js')
const util = require('../util/util')
const oauthUtil = require('../util/oauth-util')
const constant = require('../util/constant')
const userCache = require('../util/user-cache')
const UserModel = require('./user')
const ApplicationModel = require('./application')
const InvalidClientError = require('oauth2-server/lib/errors/invalid-client-error');
const InvalidGrantError = require('oauth2-server/lib/errors/invalid-grant-error');
const userFields = ['id', 'username', 'nickname', 'email', 'appIDs',
  'manager',  'lastLogin', 'profile', 'createTime', 'permissions', 'roles'];

// doc: https://oauth2-server.readthedocs.io/en/latest/model/spec.html

const OAuthCodeModel = Sequelize.define('oauth_code', {
  id: {
    type: Seq.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  },
  authorizationCode: { type: Seq.TEXT, field: 'authorization_code' },
  expiresAt: { type: Seq.DATE, field: 'expires_at' },
  redirectUri: { type: Seq.TEXT, field: 'redirect_uri' },
  scope: { type: Seq.TEXT, field: 'scope' },
  clientID: { type: Seq.TEXT, field: 'client_id' },
  userID: { type: Seq.TEXT, field: 'user_id' },
  createTime: { type: Seq.INTEGER, field: 'create_time' },
  updateTime: { type: Seq.INTEGER, field: 'update_time' },
}, {
  freezeTableName: true,
});

const OAuthTokenModel = Sequelize.define('oauth_token', {
  id: {
    type: Seq.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  },
  accessToken: { type: Seq.TEXT, field: 'access_token' },
  accessTokenExpiresAt: { type: Seq.DATE, field: 'access_token_expires_at' },
  refreshToken: { type: Seq.TEXT, field: 'refresh_token' },
  refreshTokenExpiresAt: { type: Seq.DATE, field: 'refresh_token_expires_at' },
  clientID: { type: Seq.TEXT, field: 'client_id' },
  scope: { type: Seq.TEXT, field: 'scope' },
  userID: { type: Seq.TEXT, field: 'user_id' },
  createTime: { type: Seq.INTEGER, field: 'create_time' },
  updateTime: { type: Seq.INTEGER, field: 'update_time' },
}, {
  freezeTableName: true,
});


async function getClientAndUser(clientID, userID, debugInfo) {
  log4js.info("%s getClientAndUser(clientID: %s, userID: %s) ...", debugInfo, clientID, userID)
  // user is application.
  if(userID.startsWith('app:')) {
    const client =  await ApplicationModel.findByPk(clientID)
    if (!client) {
      log4js.warn('%s failed, clientID(%s) not found', debugInfo, clientID)
      return {}
    }
    const { id, name } = client;
    const user = {id: `app:${id}`, username: name, nickname: name}
    return {
      client: {id: clientID, name: client.name, accessTokenLifetime: client.accessTokenLifetime,
          refreshTokenLifetime: client.refreshTokenLifetime},
      user: user,
    }
  }

  const client = await ApplicationModel.findByPk(clientID)
  if (!client) {
    log4js.warn('%s failed, clientID(%s) not found', debugInfo, clientID)
    return {}
  }
  let {userInfo} = await userCache.getUserInfoById(userID, clientID)

  if (!userInfo) {
    log4js.warn('%s failed, user(%s) not found', debugInfo, userID)
    return {}
  }
  const user = util.filterFieldWhite(userInfo, userFields)
  user.id =  oauthUtil.OAuthUserID(user.id, client.id)

  return {
    client: {id: clientID, name: client.name, accessTokenLifetime: client.accessTokenLifetime,
        refreshTokenLifetime: client.refreshTokenLifetime},
    user: user,
  }
}

exports.getClient = async function (clientID, clientSecret) {
  log4js.info('oauth2 getClient(', {clientID}, ') ...')
  const client = await ApplicationModel.findByPk(clientID)
  if (!client) {
    log4js.warn('getClient(%s) failed, client not found', clientID)
    throw new InvalidClientError('Client not found')
  }
  const {id, name, redirectUris, accessTokenLifetime, refreshTokenLifetime} = client;
  if (!redirectUris || redirectUris.length === 0) {
    log4js.warn('getClient(%s) failed, the redirectUris is empty', clientID)
    throw new InvalidClientError('Invalid client: redirectUris is empty')
  }
  // check secret for token request only
  let secret = client.secret;
  if (secret) {
    secret = oauthUtil.decryptSecret(secret)
  }
  if (clientSecret && secret !== clientSecret) {
    log4js.warn('getClient(%s) failed, the secret is wrong', clientID)
    throw new InvalidClientError('Secret is incorrect')
  }
  const grants = ['authorization_code', 'refresh_token', 'password', 'client_credentials']
  const clientInfo = { id, name, redirectUris, grants, accessTokenLifetime, refreshTokenLifetime }
  log4js.info("oauth2.getClient(", clientID, ") result: ", clientInfo)
  return clientInfo
}

exports.getUserFromClient = async function(client) {
  const { id, name } = client;
  return {id: `app:${id}`, username: name, nickname: name}
}

exports.getUser = async function (username, password) {
  log4js.info('oauth2 getUser(%s) ...', {username})
  let userInfo = await UserModel.findOne({ where: { username }})
  if (!userInfo) { // user not exist
    log4js.warn('getUser(%s) failed! user not exist', username)
    throw new InvalidGrantError('User not found')
  }

  // compare the password.
  if (!userInfo.password || !util.comparePassword(password, userInfo.password)) {
    log4js.warn('getUser(%s) failed! password error', username)
    throw new InvalidGrantError('Password is incorrect')
  }

  if (userInfo.status === constant.UserStatus.Disabled) {
    log4js.warn('getUser(%s) failed! disabled', username)
    throw new InvalidGrantError('User is disabled')
  }
  userInfo = userInfo.toJSON()
  userInfo = util.filterFieldWhite(userInfo, userFields)
  log4js.info('oauth2 getUser(%s) result: %s', {username}, JSON.stringify(userInfo))
  return userInfo
}


exports.saveToken = async function (token, client, user) {
  log4js.info('oauth2 saveToken(%s) ...', JSON.stringify({token, client, user}))

  let originalUserID = null;
  let oauthUserID = null;
  let idIsNumber = util.isNumeric(user.id)
  if(idIsNumber) {
    originalUserID = user.id;
    oauthUserID = oauthUtil.OAuthUserID(user.id, client.id)
    user.id = oauthUserID
  } else {
    if(`${user.id}`.startsWith('app:')) {
      originalUserID = user.id
      oauthUserID = user.id
    } else {
      const result = oauthUtil.parseOAuthUserID(user.id)
      if (result.error) {
        log4js.error('parse UserID(%s) failed', user.id)
        return false
      }
      if (result.clientID !== client.id) {
        log4js.error('clientID(%s) != clientIDInUserID(%s)', client.id, result.clientID)
        return false
      }
      originalUserID = result.userID
      oauthUserID = user.id
    }
  }

  const values = {
    accessToken: token.accessToken,
    accessTokenExpiresAt: token.accessTokenExpiresAt,
    refreshToken: token.refreshToken,
    refreshTokenExpiresAt: token.refreshTokenExpiresAt,
    clientID: client.id,
    scope: token.scope,
    userID: originalUserID,
    createTime: util.unixtime(),
    updateTime: util.unixtime(),
  }
  let oauthToken = await OAuthTokenModel.create(values);
  oauthToken = oauthToken.toJSON()
  oauthToken.userID = oauthUserID
  oauthToken.client = client
  oauthToken.user = user

  return oauthToken
}

exports.revokeToken = async function(token) {
  log4js.info('oauth2 revokeToken(%s) ...', JSON.stringify({token}))
  const where = {refreshToken: token.refreshToken}
  if (token.client) {
    where.clientID = token.client.id
  }
  const rowCount = await OAuthTokenModel.destroy({where})
  return rowCount > 0;
}

exports.getAccessToken = async function(accessToken) {
  log4js.info('oauth2 getAccessToken(%s) ...', JSON.stringify({accessToken}))

  let oauthToken = await OAuthTokenModel.findOne({where: {accessToken}})
  if (!oauthToken) {
    log4js.warn('getAccessToken(%s) failed, accessToken not found', accessToken)
    return
  }

  const {client, user} = await getClientAndUser(oauthToken.clientID, oauthToken.userID, `getAccessToken(accessToken: ${accessToken})`)
  if (!client) {
    return
  }
  return {
    accessToken: oauthToken.accessToken,
    accessTokenExpiresAt: oauthToken.accessTokenExpiresAt,
    scope: oauthToken.scope,
    client,
    user,
  }
}

exports.getRefreshToken = async function (refreshToken) {
  log4js.info('oauth2 getRefreshToken(%s) ...', JSON.stringify({refreshToken}))
  let oauthToken = await OAuthTokenModel.findOne({where: {refreshToken}})
  if (!oauthToken) {
    log4js.warn('getRefreshToken(%s) failed, refreshToken not found', refreshToken)
    return
  }

  const {client, user} = await getClientAndUser(oauthToken.clientID, oauthToken.userID, `getRefreshToken(refreshToken: ${refreshToken})`)
  if (!client) {
    return
  }
  return {
    refreshToken: oauthToken.refreshToken,
    refreshTokenExpiresAt: oauthToken.refreshTokenExpiresAt,
    scope: oauthToken.scope,
    userId: oauthToken.userId,
    client,
    user,
  }
}

exports.saveAuthorizationCode = async function (code, client, user) {
  log4js.info('oauth2 saveAuthorizationCode(%s) ...', JSON.stringify({code, client, user}))
  const values = {
    authorizationCode: code.authorizationCode,
    expiresAt: code.expiresAt,
    redirectUri: code.redirectUri,
    scope: code.scope,
    clientID: client.id,
    userID: user.id,
    createTime: util.unixtime(),
    updateTime: util.unixtime(),
  }

  const oauthCode = await OAuthCodeModel.create(values);
  log4js.info('oauth2 saveAuthorizationCode(%s) result: %s', JSON.stringify({code, client, user}), JSON.stringify(oauthCode))
  const userID = oauthUtil.OAuthUserID(user.id, client.id)
  oauthCode.userID = userID
  return oauthCode
}

exports.revokeAuthorizationCode = async function(code) {
  log4js.info('oauth2 revokeAuthorizationCode(%s) ...', JSON.stringify({code}))
  const where = {authorizationCode: code.authorizationCode}
  if (code.client) {
    where.clientID = code.client.id
  }
  const rowCount = await OAuthCodeModel.destroy({where})
  return rowCount > 0;
}

exports.getAuthorizationCode = async function(authorizationCode) {
  log4js.info('oauth2 getAuthorizationCode(%s) ...', JSON.stringify({authorizationCode}))
  let code = await OAuthCodeModel.findOne({where: {authorizationCode}})
  if (!code) {
    log4js.warn('getAuthorizationCode(%s) failed, authorizationCode not found', authorizationCode)
    return
  }

  const {client, user} = await getClientAndUser(code.clientID, code.userID, `getAuthorizationCode(${authorizationCode})`)
  if (!client) {
    return
  }
  const codeInfo = {
    authorizationCode: code.authorizationCode,
    expiresAt: code.expiresAt,
    // redirectUri: code.redirectUri, // remove redirectUri.
    scope: code.scope,
    client,
    user,
  }
  log4js.info('oauth2 getAuthorizationCode(%s) result: %s', JSON.stringify({authorizationCode}), JSON.stringify(codeInfo))
  return codeInfo
}
