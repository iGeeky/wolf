const mocha = require('./util/mocha')
const querystring = require('querystring')
const util = require('./util/util')
const rbacUtil = require('./init/0-rbac-util')
const policyFileName = './test/init/0-rbac-data-unittest.md'
const data = rbacUtil.rbacDataRead(policyFileName)
const argv = require('minimist')(process.argv.slice(2))

function getCodeFromLocation(location) {
  const regex = /code=(\w+)/
  const m = regex.exec(location)
  if (m !== null && m.length === 2) {
    return m[1]
  }
  return ''
}

function getTokenSchema(expiresIn) {
  const expiresInSchema = {
    type: 'integer',
  }
  if (expiresIn) {
    expiresInSchema.minimum = expiresIn - 5
    expiresInSchema.maximum = expiresIn
  }
  const dataSchema= {
    type: "object",
    properties: {
        access_token: {"type":"string"},
        token_type: {"type":"string"},
        expires_in: expiresInSchema,
        refresh_token: {"type":"string"},
        client_id: {"type":"string"},
        user_id: {"type":"string"}
    },
    required: ["access_token","token_type","expires_in","refresh_token","client_id","user_id"]
  }
  const schema = util.okSchema(dataSchema)
  return schema
}

function getClientCredentialsTokenSchema(expiresIn) {
  const expiresInSchema = {
    type: 'integer',
  }
  if (expiresIn) {
    expiresInSchema.minimum = expiresIn - 5
    expiresInSchema.maximum = expiresIn
  }
  const dataSchema= {
    type: "object",
    properties: {
        access_token: {"type":"string"},
        token_type: {"type":"string"},
        expires_in: expiresInSchema,
        client_id: {"type":"string"},
        user_id: {"type":"string"}
    },
    required: ["access_token","token_type","expires_in","client_id","user_id"]
  }
  const schema = util.okSchema(dataSchema)
  return schema
}


describe('oauth2', function() {
  const password = 'd22f6718ff24'
  const appID = data.applications[0].id

  if (argv.rbacInit) {
    const opts = { quiet: true }
    rbacUtil.rbacInit(data, password, opts)
    process.exit(0)
  }

  if (argv.rbacDestroy) {
    rbacUtil.rbacDestroy(data)
  }

  describe('rbac-init', function() {
    const opts = { quiet: true }
    rbacUtil.rbacInit(data, password, opts)
  })

  describe('basic', function(){
    it('server error', async function() {
      const url = '/wolf/oauth2/error_test'
      const args = {t: 'server'}
      const headers = {}
      const schema = util.failSchema('ERR_SERVER_ERROR', 'server internal error')
      await mocha.get({url, headers, args, status: 500, schema})
    });
    it('unknow error', async function() {
      const url = '/wolf/oauth2/error_test'
      const args = {t: 'error'}
      const headers = {}
      const schema = util.failSchema('ERR_TEST_ERROR', 'unknow error')
      await mocha.get({url, headers, args, status: 500, schema})
    });
    it('string error', async function() {
      const url = '/wolf/oauth2/error_test'
      const args = {t: 'error-info'}
      const headers = {}
      const schema = util.failSchema('STRING_ERROR', 'error-info')
      await mocha.get({url, headers, args, status: 500, schema})
    });
  });

  describe('oauth2 api', function() {
    const headers = {}
    const tokenHeaders = {'Content-Type': 'application/x-www-form-urlencoded'}
    const applicationID = 'oauth-test-app';
    const appSecret = 'app-secret-2020'
    const appSecretNew = 'app-secret-new'
    const accessTokenLifetime = 2;
    let code1 = null;
    let tokenInfo1 = null;
    let refreshTokenInfo1 = null;
    let code2 = null;
    let tokenInfo2 = null;
    let passwordTokenInfo = null;
    let clientCredentialsTokenInfo = null;

    it('authorize failed, token missing', async function() {
      const url = '/wolf/oauth2/authorize'
      const headers = {}
      const args = {client_id: appID}
      const options = Object.assign({url, headers, args, status: 302, match: 'location:\/wolf\/rbac\/login\\?appid=unittest&return_to=%2Fwolf%2Foauth2%2Fauthorize%3Fclient_id%3Dunittest&error='})
      await mocha.get(options)
    });
    it('authorize failed, token is invalid', async function() {
      const url = '/wolf/oauth2/authorize'
      const args = {client_id: appID}
      const headers = {}
      headers['x-rbac-token'] = 'invalid-rbac-token'
      const options = Object.assign({url, headers, args, status: 302, match: 'location:\/wolf\/rbac\/login\\?appid=unittest&return_to=%2Fwolf%2Foauth2%2Fauthorize%3Fclient_id%3Dunittest&error='})
      await mocha.get(options)
    });


    it('add application', async function() {
      const id = applicationID
      const name = 'oauth-test-application'
      const description = 'appplication for oauth test'
      const headers = util.adminHeaders()
      const body = {id, name, description}
      const schema = util.okSchema()
      const url = '/wolf/application';
      await mocha.post({url, headers, body, schema})
    });

    it('login status: not logged in', async function() {
      const headers = {}
      const args = {}
      const url = '/wolf/oauth2/login_status';
      await mocha.get({url, headers, args, match: ['None', 'Login']})
    });

    it('login success', async function() {
      const url = '/wolf/rbac/login.submit'
      const body = {username: 'unit-user', password, appid: appID, return_to: '/wolf/oauth2/authorize?client_id=' + applicationID}
      const res = await mocha.post({url, headers, body, status: 302, match: 'location:\/wolf\/oauth2\/authorize\\?client_id=' + applicationID})
      const cookie = util.getRbacCookie(res.headers['set-cookie'])
      headers['Cookie'] = cookie;
    });


    it('login status: logged in', async function() {
      const headers = util.adminHeaders()
      const args = {}
      const url = '/wolf/oauth2/login_status';
      await mocha.get({url, headers, args, match: ['Logout', 'Change Password']})
    });

    it('authorize failed, client not found', async function() {
      const url = '/wolf/oauth2/authorize'
      const args = {client_id: 'clientid-not-exist'}
      const schema = util.failSchema('ERR_OAUTH_AUTHORIZE_FAILED', 'Client not found')
      const options = Object.assign({url, headers, args, status: 400, schema})
      await mocha.get(options)
    });

    it('authorize failed, redirectUris is empty', async function() {
      const url = '/wolf/oauth2/authorize'
      const args = {client_id: applicationID}
      const schema = util.failSchema('ERR_OAUTH_AUTHORIZE_FAILED', 'Invalid client: redirectUris is empty')
      const options = Object.assign({url, headers, args, status: 400, schema})
      await mocha.get(options)
    });

    it('update application, set redirectUris', async function() {
      const id = applicationID
      const name = 'oauth-test-application'
      const description = 'appplication for oauth test'
      const redirectUris = ['http://localhost:1234/callback']
      const headers = util.adminHeaders()
      const body = {id, name, description, redirectUris}
      const schema = util.okSchema()
      const url = '/wolf/application';
      await mocha.put({url, headers, body, schema})
    });

    it('authorize failed, Missing parameter: `response_type`', async function() {
      const url = '/wolf/oauth2/authorize'
      const args = {client_id: applicationID, state: 'my-state-random'}
      const headers = util.adminHeaders()
      const schema = util.failSchema('ERR_OAUTH_AUTHORIZE_FAILED', 'Missing parameter: `response_type`')
      await mocha.get({url, headers, args, status: 400, schema})
    });

    it('authorize failed, Missing parameter: `state`', async function() {
      const url = '/wolf/oauth2/authorize'
      const args = {client_id: applicationID, response_type: 'code'}
      const headers = util.adminHeaders()
      const schema = util.failSchema('ERR_OAUTH_AUTHORIZE_FAILED', 'Missing parameter: `state`')
      await mocha.get({url, headers, args, status: 400, schema})
    });

    it('authorize successed', async function() {
      const url = '/wolf/oauth2/authorize'
      const args = {client_id: applicationID, response_type: 'code', state: 'my-state1'}
      const headers = util.adminHeaders()
      const options = Object.assign({url, headers, args, status: 302, match: 'location:http://localhost:1234/callback\\?code=[0-9a-f]{40}&state=my-state1'})
      await mocha.get(options)
    });

    it('authorize successed, post all params', async function() {
      const url = '/wolf/oauth2/authorize'
      const args = {client_id: applicationID, response_type: 'code', state: 'my-state2',
                redirect_uri: 'http://localhost:1234/callback'}
      const headers = util.adminHeaders()
      const options = Object.assign({url, headers, args, status: 302, match: 'location:http://localhost:1234/callback\\?code=[0-9a-f]{40}&state=my-state2'})
      await mocha.get(options)
    });

    it('update application, set multi redirectUris', async function() {
      const id = applicationID
      const name = 'oauth-test-application'
      const description = 'appplication for oauth test'
      const redirectUris = ['http://localhost:1234/callback/v2', 'http://localhost/callback/v3']
      const headers = util.adminHeaders()
      const body = {id, name, description, redirectUris}
      const schema = util.okSchema()
      const url = '/wolf/application';
      await mocha.put({url, headers, body, schema})
    });

    it('authorize failed, `redirect_uri` does not match client value', async function() {
      const url = '/wolf/oauth2/authorize'
      const args = {client_id: applicationID, response_type: 'code', state: 'my-state-random',
                redirect_uri: 'http://localhost:1234/callback'}
      const headers = util.adminHeaders()
      const schema = util.failSchema('ERR_OAUTH_AUTHORIZE_FAILED', 'Invalid client: `redirect_uri` does not match client value')
      await mocha.get({url, headers, args, status: 400, schema})
    });

    it('authorize successed, redirect_uri used `http://localhost:1234/callback/v2`', async function() {
      const url = '/wolf/oauth2/authorize'
      const args = {client_id: applicationID, response_type: 'code', state: 'my-state3',
                  redirect_uri: 'http://localhost:1234/callback/v2'}
      const headers = util.adminHeaders()
      const options = Object.assign({url, headers, args, status: 302, match: 'location:http://localhost:1234/callback/v2\\?code=[0-9a-f]{40}&state=my-state3'})
      const res = await mocha.get(options)
      const location = res.headers.location
      code1 = getCodeFromLocation(location)
    });


    it('authorize successed, redirect_uri used `http://localhost/callback/v3`', async function() {
      const url = '/wolf/oauth2/authorize'
      const args = {client_id: applicationID, response_type: 'code', state: 'my-state4',
            redirect_uri: 'http://localhost/callback/v3'}
      const headers = util.adminHeaders()
      const options = Object.assign({url, headers, args, status: 302, match: 'location:http://localhost/callback/v3\\?code=[0-9a-f]{40}&state=my-state4'})
      const res = await mocha.get(options)
      const location = res.headers.location
      code2 = getCodeFromLocation(location)
    });

    // get token
    it('token failed, content must be application/x-www-form-urlencoded', async function() {
      const url = '/wolf/oauth2/token'
      const body = {client_id: applicationID}
      const schema = util.failSchema('ERR_OAUTH_GET_TOKEN_FAILED', 'Invalid request: content must be application/x-www-form-urlencoded')
      await mocha.post({url, headers, body, status: 400, schema})
    });

    it('token failed, client_id missing', async function() {
      const url = '/wolf/oauth2/token'
      const body = {code: code1, client_secret: appSecret, grant_type: 'authorization_code'}
      const headers = tokenHeaders
      const schema = util.failSchema('ERR_OAUTH_GET_TOKEN_FAILED', 'Invalid client: cannot retrieve client credentials')
      await mocha.post({url, headers, body: querystring.stringify(body), status: 400, schema})
    });

    it('token failed, client not found', async function() {
      const url = '/wolf/oauth2/token'
      const body = {code: code1, client_id: 'clientid-not-exist', client_secret: appSecret, grant_type: 'authorization_code'}
      const headers = tokenHeaders
      const schema = util.failSchema('ERR_OAUTH_GET_TOKEN_FAILED', 'Client not found')
      await mocha.post({url, headers, body: querystring.stringify(body), status: 400, schema})
    });

    it('token failed, secret not set in database', async function() {
      const url = '/wolf/oauth2/token'
      let body = {code: code1, client_secret: appSecret, client_id: applicationID,  grant_type: 'authorization_code'}
      body = querystring.stringify(body)
      const headers = tokenHeaders
      const schema = util.failSchema('ERR_OAUTH_GET_TOKEN_FAILED', 'Secret is incorrect')
      await mocha.post({url, headers, body, status: 400, schema})
    });

    it('update application, set secret', async function() {
      const id = applicationID
      const name = 'oauth-test-application'
      const description = 'appplication for oauth test'
      const secret = appSecret
      const redirectUris = ['http://localhost:1234/callback/v2', 'http://localhost/callback/v3']
      const accessTokenLifetime = 3600
      const refreshTokenLifetime = 2592000
      const headers = util.adminHeaders()
      const body = {id, name, description, secret, redirectUris, accessTokenLifetime, refreshTokenLifetime}
      const schema = util.okSchema()
      const url = '/wolf/application';
      await mocha.put({url, headers, body, schema})
    });

    it('token failed, secret missing', async function() {
      const url = '/wolf/oauth2/token'
      let body = {code: code1, client_id: applicationID,  grant_type: 'authorization_code'}
      body = querystring.stringify(body)
      const headers = tokenHeaders
      const schema = util.failSchema('ERR_OAUTH_GET_TOKEN_FAILED', 'Invalid client: cannot retrieve client credentials')
      await mocha.post({url, headers, body, status: 400, schema})
    });

    it('token failed, secret is incorrect', async function() {
      const url = '/wolf/oauth2/token'
      let body = {code: code1, client_secret: 'error-secret', client_id: applicationID,  grant_type: 'authorization_code'}
      body = querystring.stringify(body)
      const headers = tokenHeaders
      const schema = util.failSchema('ERR_OAUTH_GET_TOKEN_FAILED', 'Secret is incorrect')
      await mocha.post({url, headers, body, status: 400, schema})
    });

    it('token failed, Missing parameter: `grant_type`', async function() {
      const url = '/wolf/oauth2/token'
      let body = {code: code1, client_secret: appSecret, client_id: applicationID}
      body = querystring.stringify(body)
      const headers = tokenHeaders
      const schema = util.failSchema('ERR_OAUTH_GET_TOKEN_FAILED', 'Missing parameter: `grant_type`')
      await mocha.post({url, headers, body, status: 400, schema})
    });

   it('token failed, Unsupported grant type: `grant_type` is invalid', async function() {
      const url = '/wolf/oauth2/token'
      let body = {code: code1, client_secret: appSecret, client_id: applicationID, grant_type: 'error-grant-type'}
      body = querystring.stringify(body)
      const headers = tokenHeaders
      const schema = util.failSchema('ERR_OAUTH_GET_TOKEN_FAILED', 'Unsupported grant type: `grant_type` is invalid')
      await mocha.post({url, headers, body, status: 400, schema})
    });

    it('token failed, Invalid grant: authorization code is invalid', async function() {
      const url = '/wolf/oauth2/token'
      let body = {code: 'error-code', client_secret: appSecret, client_id: applicationID,  grant_type: 'authorization_code'}
      body = querystring.stringify(body)
      const headers = tokenHeaders
      const schema = util.failSchema('ERR_OAUTH_GET_TOKEN_FAILED', 'Invalid grant: authorization code is invalid')
      await mocha.post({url, headers, body, status: 400, schema})
    });

    it('token success by code1', async function() {
      const url = '/wolf/oauth2/token'
      let body = {code: code1, client_secret: appSecret, client_id: applicationID,  grant_type: 'authorization_code'}
      body = querystring.stringify(body)
      const headers = tokenHeaders
      const schema = getTokenSchema(3600)
      const res = await mocha.post({url, headers, body, status: 200, schema})
      tokenInfo1 = res.body.data;
    });

    it('token failed, code1 is used', async function() {
      const url = '/wolf/oauth2/token'
      let body = {code: code1, client_secret: appSecret, client_id: applicationID,  grant_type: 'authorization_code'}
      body = querystring.stringify(body)
      const headers = tokenHeaders
      const schema = util.failSchema('ERR_OAUTH_GET_TOKEN_FAILED', 'Invalid grant: authorization code is invalid')
      await mocha.post({url, headers, body, status: 400, schema})
    });

    it('userInfo failed, Missing token.', async function() {
      if(!tokenInfo1) {
        this.skip()
      }
      const url = '/wolf/oauth2/user_info'
      let args = {}
      const headers = {}
      const schema = util.failSchema('ERR_TOKEN_INVALID', 'Unauthorized request: no authentication given')
      await mocha.get({url, headers, args, status: 400, schema})
    });

    it('userInfo failed, access token is invalid.', async function() {
      if(!tokenInfo1) {
        this.skip()
      }
      const url = '/wolf/oauth2/user_info'
      let args = {}
      const headers = {}
      headers['authorization'] = `${tokenInfo1.token_type} invalid-access-token`
      const schema = util.failSchema('ERR_TOKEN_INVALID', 'Invalid token: access token is invalid')
      await mocha.get({url, headers, args, status: 400, schema})
    });

    it('userInfo success by token1', async function() {
      if(!tokenInfo1) {
        this.skip()
      }
      const url = '/wolf/oauth2/user_info'
      let args = {}
      const headers = {}
      headers['authorization'] = `${tokenInfo1.token_type} ${tokenInfo1.access_token}`
      const schema = util.getUserInfoSchema()
      await mocha.get({url, headers, args, status: 200, schema})
    });

    it('update application, set tokenLifetime', async function() {
      const id = applicationID
      const name = 'oauth-test-application'
      const description = 'appplication for oauth test'
      const secret = appSecretNew
      const redirectUris = ['http://localhost:1234/callback/v2', 'http://localhost/callback/v3']
      const refreshTokenLifetime = 2592000
      const headers = util.adminHeaders()
      const body = {id, name, description, secret, redirectUris, accessTokenLifetime, refreshTokenLifetime}
      const schema = util.okSchema()
      const url = '/wolf/application';
      await mocha.put({url, headers, body, schema})
    });


    it('token success by code2', async function() {
      const url = '/wolf/oauth2/token'
      let body = {code: code2, client_secret: appSecretNew, client_id: applicationID,  grant_type: 'authorization_code'}
      body = querystring.stringify(body)
      const headers = tokenHeaders
      const schema = getTokenSchema(accessTokenLifetime)
      const res = await mocha.post({url, headers, body, status: 200, schema})
      tokenInfo2 = res.body.data;
    });

    it('refresh token1 success', async function() {
      const url = '/wolf/oauth2/token'
      let body = {refresh_token: tokenInfo1.refresh_token, client_secret: appSecretNew, client_id: applicationID,  grant_type: 'refresh_token'}
      body = querystring.stringify(body)
      const headers = tokenHeaders
      const schema = getTokenSchema(accessTokenLifetime)
      const res = await mocha.post({url, headers, body, status: 200, schema})
      refreshTokenInfo1 = res.body.data;
    });

    it('refresh token1 failed, refresh token is invalid', async function() {
      const url = '/wolf/oauth2/token'
      let body = {refresh_token: tokenInfo1.refresh_token, client_secret: appSecretNew, client_id: applicationID,  grant_type: 'refresh_token'}
      body = querystring.stringify(body)
      const headers = tokenHeaders
      const schema = util.failSchema('ERR_OAUTH_REFRESH_TOKEN_FAILED', 'Invalid grant: refresh token is invalid')
      await mocha.post({url, headers, body, status: 400, schema})
    });


    it('userInfo failed by expired token1', async function() {
      if(!tokenInfo1) {
        this.skip()
      }
      const url = '/wolf/oauth2/user_info'
      let args = {}
      const headers = {}
      headers['authorization'] = `${tokenInfo1.token_type} ${tokenInfo1.access_token}`
      const schema = util.failSchema('ERR_TOKEN_INVALID', 'Invalid token: access token is invalid')
      await mocha.get({url, headers, args, status: 400, schema})
    });

    it('userInfo success by refreshTokenInfo1.access_token', async function() {
      if(!refreshTokenInfo1) {
        this.skip()
      }
      const url = '/wolf/oauth2/user_info'
      let args = {}
      const headers = {}
      headers['authorization'] = `${refreshTokenInfo1.token_type} ${refreshTokenInfo1.access_token}`
      const schema = util.getUserInfoSchema()
      await mocha.get({url, headers, args, status: 200, schema})
    });


    it('access check success by refreshTokenInfo1.access_token', async function(){
      if(!refreshTokenInfo1) {
        this.skip()
      }
      const accessCheckUrl = '/wolf/oauth2/access_check'
      const action = 'GET';
      const ip = '192.168.168.168'
      const resName = '/resource/path'
      const args = { action, resName, ip}
      const headers = {}
      headers['authorization'] = `${refreshTokenInfo1.token_type} ${refreshTokenInfo1.access_token}`
      const schema = util.failSchema("Access failure. resource '/resource/path' not exist")
      await mocha.get({url: accessCheckUrl, headers, args, status: 401, schema})
    });

    it('userInfo failed, token expired', async function() {
      if(!refreshTokenInfo1) {
        this.skip()
      }
      this.timeout(30000)
      await util.sleep(accessTokenLifetime * 1000)
      const url = '/wolf/oauth2/user_info'
      let args = {}
      const headers = {}
      headers['authorization'] = `${refreshTokenInfo1.token_type} ${refreshTokenInfo1.access_token}`
      const schema = util.failSchema('ERR_TOKEN_INVALID', 'Invalid token: access token has expired')
      await mocha.get({url, headers, args, status: 400, schema})
    });

    it('token by password success', async function() {
      const url = '/wolf/oauth2/token'
      let body = {client_secret: appSecretNew, client_id: applicationID,  grant_type: 'password', username: 'root', 'password': util.defPassword()}
      body = querystring.stringify(body)
      const headers = tokenHeaders
      const schema = getTokenSchema(accessTokenLifetime)
      const res = await mocha.post({url, headers, body, status: 200, schema})
      passwordTokenInfo = res.body.data;
    });

    it('access check failed, token missing', async function(){
      const accessCheckUrl = '/wolf/oauth2/access_check'
      const action = 'GET';
      const ip = '192.168.168.168'
      const appID = applicationID
      const resName = '/resource/path'
      const args = {appID, action, resName, ip}
      const headers = {}
      const schema = util.failSchema('ERR_TOKEN_INVALID', 'Unauthorized request: no authentication given')
      await mocha.get({url: accessCheckUrl, headers, args, status: 400, schema})
    });


    it('access check success', async function(){
      if(!passwordTokenInfo) {
        this.skip()
      }
      const accessCheckUrl = '/wolf/oauth2/access_check'
      const action = 'GET';
      const ip = '192.168.168.168'
      const appID = applicationID
      const resName = '/resource/path'
      const args = {appID, action, resName, ip}
      const headers = {}
      headers['authorization'] = `${passwordTokenInfo.token_type} ${passwordTokenInfo.access_token}`
      const schema = util.failSchema("Access failure. resource '/resource/path' not exist")
      await mocha.get({url: accessCheckUrl, headers, args, status: 401, schema})
    });

    it('token by password failed, User not found', async function() {
      const url = '/wolf/oauth2/token'
      let body = {client_secret: appSecretNew, client_id: applicationID,  grant_type: 'password', username: 'user-not-exist', 'password': util.defPassword()}
      body = querystring.stringify(body)
      const headers = tokenHeaders
      const schema = util.failSchema('ERR_OAUTH_GET_TOKEN_FAILED', 'User not found')
      await mocha.post({url, headers, body, status: 400, schema})
    });

    it('token by password failed, Password is incorrect', async function() {
      const url = '/wolf/oauth2/token'
      let body = {client_secret: appSecretNew, client_id: applicationID,  grant_type: 'password', username: 'root', 'password': 'error-password'}
      body = querystring.stringify(body)
      const headers = tokenHeaders
      const schema = util.failSchema('ERR_OAUTH_GET_TOKEN_FAILED', 'Password is incorrect')
      await mocha.post({url, headers, body, status: 400, schema})
    });

    it('token by client_credentials success', async function() {
      const url = '/wolf/oauth2/token'
      let body = {client_secret: appSecretNew, client_id: applicationID,  grant_type: 'client_credentials'}
      body = querystring.stringify(body)
      const headers = tokenHeaders
      const schema = getClientCredentialsTokenSchema()
      const res = await mocha.post({url, headers, body, status: 200, schema})
      clientCredentialsTokenInfo = res.body.data;
    });

    it('userInfo success by clientCredentialsTokenInfo.access_token', async function() {
      if(!clientCredentialsTokenInfo) {
        this.skip()
      }
      // console.log('>>>clientCredentialsTokenInfo:', clientCredentialsTokenInfo)
      const url = '/wolf/oauth2/user_info'
      let args = {}
      const headers = {}
      headers['authorization'] = `${clientCredentialsTokenInfo.token_type} ${clientCredentialsTokenInfo.access_token}`
      const schema = util.getUserInfoSchema()
      await mocha.get({url, headers, args, status: 200, schema})
    });

    after(async function() {
      const id = applicationID
      const url = '/wolf/application';
      const body = {id}
      const headers = util.adminHeaders()
      await mocha.delete({url, headers, body, status: 200, })
    });
    // TODO: user disabled
  });

  describe('rbac-destroy', function() {
    rbacUtil.rbacDestroy(data)
  });
})


