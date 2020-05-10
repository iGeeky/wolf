const config = require('../../conf/config')
const _ = require('lodash')
const util = require('../util/util')
const constant = require('../util/constant')
const RbacPub = require('./rbac-pub')
const OAuth2Model = require('../model/oauth2')
const OAuth2Server = require('oauth2-server');
const Request = OAuth2Server.Request;
const Response = OAuth2Server.Response;
const OAuthError = OAuth2Server.OAuthError;
const ServerError = OAuth2Server.ServerError;
const InvalidTokenError = OAuth2Server.InvalidTokenError;
const tokenUtil = require('../util/token-util')
const userCache = require('../util/user-cache')

const oauthTokenFields = ["client_id","user_id","access_token","refresh_token","token_type","expires_in"]

// doc: https://oauth2-server.readthedocs.io/en/latest/api/oauth2-server.html

const oauthOptions = Object.assign({
  model: OAuth2Model,
}, config.oauthOptions)
const oauth = new OAuth2Server(oauthOptions)

function getClientToken(ctx) {
  let token = ctx.request.headers['x-rbac-token']
  if (!token) {
    token = ctx.cookies.get('x-rbac-token')
  }
  return token
}

class OAuth2 extends RbacPub {
  constructor(ctx) {
    super(ctx, undefined)
  }

  _getOAuth2RequestResponse() {
    const {method, query=this.ctx.request.query, headers, body=this.ctx.request.body} = this.ctx.req
    const request = new Request({method, query, headers, body});
    const response = new Response(this.ctx.res);
    return {request, response }
  }

  _handleResponse (response) {
    this.ctx.status = response.status;
    this.ctx.body = response.body;
    this.ctx.set(response.headers);
  }

  _handleError(err, reason) {
    let errmsg = err;
    let status = 400;
    if (err instanceof ServerError) {
      this.log4js.error(err)
      errmsg = err.message
      reason = 'ERR_SERVER_ERROR'
      status = 500;
    }else if (err instanceof InvalidTokenError) {
      errmsg = err.message
      reason = 'ERR_TOKEN_INVALID'
    } else if (err instanceof OAuthError) {
      errmsg = err.message
    } else if(err && err.message) {
      this.log4js.error(err)
      errmsg = err.message
      status = 500;
    } else {
      this.log4js.error(err)
      status = 500;
    }
    this.fail2(status, reason, errmsg)
  }

  _redirectToLogin(error) {
    const ctx = this.ctx;
    let returnTo = ctx.path;
    const query = ctx.querystring
    if (query) {
      returnTo = returnTo + "?" + query
    }
    returnTo = encodeURIComponent(returnTo)
    const appid = ctx.query.client_id
    const url = `/wolf/rbac/login?appid=${appid}&return_to=${returnTo}&error=${error}`
    ctx.redirect(url)
  }

  async _checkRbacToken() {
    const ctx = this.ctx;
    const token = getClientToken(ctx)
    if (!token) {
      this._redirectToLogin('')
      return {}
    }
    const tokenUserInfo = tokenUtil.tokenDecrypt(token)
    if (tokenUserInfo.error) { // failed
      this.log4js.warn('oauth2 request [%s %s] invalid! token [%s] decrypt failed!', ctx.method, ctx.path, token)
      this._redirectToLogin('')
      return {}
    }
    const userId = tokenUserInfo.id
    const appid = tokenUserInfo.appid
    const {userInfo, cached} = await userCache.getUserInfoById(tokenUserInfo.id, appid)
    this.log4js.info('getUserInfoById(userId:%d, appID:%s) cached: %s', tokenUserInfo.id, appid, cached)
    if (!userInfo) {
      this.log4js.error('request [%s %s] invalid! userId:%d (from token) not found in database', ctx.method, ctx.path, userId)
      this._redirectToLogin('User not found')
      return {}
    }
    if (userInfo.status === constant.UserStatus.Disabled) {
      this.log4js.error('request [%s %s] failed! user [%s] is disabled', ctx.method, ctx.path, userInfo.username)
      this._redirectToLogin('User is disabled')
      return {}
    }
    return {userInfo: util.filterFieldWhite(userInfo, ['id', 'username', 'nickname', 'email', 'appIDs', 'manager']), appid}
  }

  async clientTest() {
    const client_id = this.getArg('client_id', 'restful')
    await this.ctx.render('oauth2/clientAuthenticate', {client_id})
  }

  async clientApp() {
    const client_id = this.getArg('client_id', 'restful')
    const secret = this.getArg('client_id', '123456')
    await this.ctx.render('oauth2/clientApp', {client_id, secret})
  }

  async loginStatus() {
    const ctx = this.ctx;
    const token = getClientToken(ctx)
    let userInfo = null;
    if (token) {
      const tokenUserInfo = tokenUtil.tokenDecrypt(token)
      if (!tokenUserInfo.error) { // failed
        userInfo = tokenUserInfo
        const appid = tokenUserInfo.appid
        let res = await userCache.getUserInfoById(tokenUserInfo.id, appid)
        userInfo = res.userInfo
      }
    }
    await this.ctx.render('login_status', {userInfo})
  }

  async authorizeGet() {
    const {userInfo} = await this._checkRbacToken()
    if(!userInfo) {
      return
    }
    const {request, response} = this._getOAuth2RequestResponse()
    let authenticateHandler = {
      handle: function(request, response) {
        return userInfo
      }
    };
    return oauth.authorize(request, response, {authenticateHandler}).then((resp)=>{
      this._handleResponse(response)
    }).catch((err) => {
      this._handleError(err, 'ERR_OAUTH_AUTHORIZE_FAILED')
    })
  }

  async token() {
    const grantType = this.getArg('grant_type')
    const {request, response} = this._getOAuth2RequestResponse()
    const options = {
      requireClientAuthentication: { password: false },
    }
    return oauth.token(request, response, options).then((resp)=>{
      const data = _.mapKeys(response.body, function(value, key) {
        return _.snakeCase(key)
      });
      this.success(_.pick(data, oauthTokenFields))
    }).catch((err) => {
      let reason = 'ERR_OAUTH_GET_TOKEN_FAILED'
      if(grantType === 'refresh_token') {
        reason = 'ERR_OAUTH_REFRESH_TOKEN_FAILED'
      }
      this._handleError(err, reason)
    })
  }

  async userInfo() {
    const {request, response} = this._getOAuth2RequestResponse()
    return oauth.authenticate(request, response).then((resp) => {
      this.ctx.userInfo = resp.user
      this.ctx.appid = resp.client.id
      this.success({userInfo: resp.user})
    })
    .catch((err) => {
      this._handleError(err, 'ERR_TOKEN_INVALID')
    });
  }

  async accessCheck() {
    const {request, response} = this._getOAuth2RequestResponse()
    return oauth.authenticate(request, response).then(async (resp) => {
      this.ctx.userInfo = resp.user
      this.ctx.appid = resp.client.id

      const appID = this.ctx.appid
      const action = this.getRequiredStringArg('action')
      const resName = this.getRequiredStringArg('resName')
      const userInfo = this.ctx.userInfo
      try {
        await this._accessCheckInternal(userInfo, appID, action, resName)
      } finally {
        try{
          this._writeAccessLog();
        }catch(err) {
          this.log4js.error('write access log failed! %s', err)
        }
      }
    })
    .catch((err) => {
      this._handleError(err, 'ERR_TOKEN_INVALID')
    });
  }


  errorTest() {
    const t = this.getArg('t')
    if (t === 'server') {
      const err = new ServerError('server internal error')
      this._handleError(err, 'ERR_TEST_ERROR')
    } else if (t === 'error') {
      const err = new Error('unknow error')
      this._handleError(err, 'ERR_TEST_ERROR')
    } else {
      this._handleError(t, 'STRING_ERROR')
    }
  }
}

module.exports = OAuth2

