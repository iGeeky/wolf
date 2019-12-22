const config = require('../../conf/config')
const BasicService = require('./basic-service')
const UserModel = require('../model/user')
const ResourceModel = require('../model/resource')
const RbacTokenError = require('../errors/rbac-token-error')
const AccessLogModel = require('../model/access-log')
const util = require('../util/util')
const userCache = require('../util/user-cache')
const Sequelize = require('sequelize')
const Op = require('sequelize').Op;

const userFields = ['username', 'nickname', 'email', 'createTime'];

const errors = {
  ERR_USERNAME_MISSING: 'Username missing!',
  ERR_PASSWORD_MISSING: 'Password missing!',
  ERR_USER_NOT_FOUND: 'User not found!',
  ERR_PASSWORD_ERROR: 'Password error!',

  ERR_PASSWORD_CHANGE_NOT_ALLOWED: 'Password change is not allowed',
  ERR_OLD_PASSWORD_REQUIRED: 'Old password is required',
  ERR_NEW_PASSWORD_REQUIRED: 'New password is required',
  ERR_REPEATED_PASSWORD_INCORRECT: 'The password you entered repeatedly is incorrect.',
  ERR_OLD_PASSWORD_INCORRECT: 'Old password is incorrect.',
}

class Rbac extends BasicService {
  constructor(ctx) {
    super(ctx, UserModel)
  }

  async loginPageRender() {
    const url = this.getArg('url', '/');
    const username = this.getArg('username');
    const error = this.getArg('error');
    const password = this.getArg('password');
    await this.ctx.render('login', {
      url,
      username,
      password,
      error,
    })
  }

  async login() {
    await this.loginPageRender();
  }

  async index() {
    this.ctx.status = 200;
    this.ctx.body = `index`
  }

  async _loginPostInternal() {
    const username = this.getArg('username')
    const password = this.getArg('password')
    const url = this.getArg('url', '/')
    this.log4js.info('username %s login, redirect url: %s', username, url)
    if (!username) {
      return {ok: false, reason: 'ERR_USERNAME_MISSING'}
    }

    if (!password) {
      return {ok: false, reason: 'ERR_PASSWORD_MISSING'}
    }

    const userInfo = await UserModel.findOne({where: {username}})
    if (!userInfo) { // user not exist
      this.log4js.warn('rbac user [%s] login failed! user not exist', username)
      return {ok: false, reason: 'ERR_USER_NOT_FOUND'}
    }

    // compare the password.
    if (userInfo.password && util.comparePassword(password, userInfo.password)) {
      // do nothing
    } else {
      this.log4js.warn('user [%s] login failed! password error', username)
      return {ok: false, reason: 'ERR_PASSWORD_ERROR'}
    }

    const {token} = await this.tokenCreate(userInfo)
    return {ok: true, token, userInfo}
  }

  async loginRest() {
    const {ok, reason, token, userInfo} = await this._loginPostInternal();
    if (!ok) {
      this.fail(200, reason, {})
      return
    }
    const {id, username, nickname} = userInfo;
    const data = {userInfo: {id, username, nickname}, token}
    this.success(data)
  }

  async loginPost() {
    const res = await this._loginPostInternal();
    if(!res.ok) {
      const error = errors[res.reason] || 'Login failed!'
      this.args.error = error
      await this.loginPageRender();
      return
    }

    const url = this.getArg('url', '/')

    const maxAge = config.tokenExpireTime * 1000;
    this.ctx.cookies.set('x-rbac-token', res.token,
      {
        maxAge: maxAge,
        httpOnly: false,
        overwrite: false,
      }
    )
    this.ctx.status = 302;
    this.ctx.redirect(url);
  }

  async getResource(query) {
    const {appID, action, name} = query;
    const where = {appID: appID}
    where.action = {[Op.in]: [action, 'ALL']}
    where[Op.or] = [
      {matchType: 'equal', name: name},
      {matchType: 'suffix', name: Sequelize.literal(`right('${name}', length(name)) = name`)},
      {matchType: 'prefix', name: Sequelize.literal(`substr('${name}', 1, length(name)) = name`)},
    ]

    const order = [['priority', 'ASC']]
    const options = {where, order}

    const resource = await ResourceModel.findOne(options)
    return resource
  }

  isRecordAccessLog() {
    if (this.ctx.action === 'OPTIONS') {
      return false;
    }

    return true;
  }

  _writeAccessLog() {
    let userID = -1;
    let username = 'none'
    let nickname = 'none';
    let matchedResource = {}
    const userInfo = this.ctx.userInfo;
    if (userInfo) {
      userID = userInfo.id;
      username = userInfo.username;
      nickname = userInfo.nickname;
    }
    if (this.ctx.resource) {
      matchedResource = util.filterFieldWhite(this.ctx.resource, ['id', 'appID', 'matchType', 'url', 'action', 'permID'])
      // ignore url when permID ===ALLOW_ALL
      if (matchedResource.permID === 'ALLOW_ALL') {
        return
      }
    }
    if (this.isRecordAccessLog()) { // Record the access log if the user logs in
      const appID = this.getStringArg('appID')
      const action = this.getStringArg('action')
      const resName = this.getStringArg('resName')
      const ip = this.getStringArg('clientIP')
      const body = {}
      const contentType = null;
      const status = this.ctx.status
      const date = util.currentDate('YYYY-MM-DD')
      const accessTime = util.unixtime();
      const values = {appID, userID, username, nickname, action, resName, matchedResource, status, body, contentType, date, accessTime, ip}
      AccessLogModel.create(values);
    }
  }

  async _accessCheckInternal(userInfo, appId, action, resName) {
    const query = {appID: appId, action, name: resName}
    const resource = await this.getResource(query)
    this.log4js.info('getResource(%s) res: %s', JSON.stringify(query), JSON.stringify(resource))
    const data = {userInfo: util.filterFieldWhite(userInfo, userFields)}
    if (resource) {
      this.ctx.resource = resource;
      const permID = resource.permID;
      if (permID === 'ALLOW_ALL') { // allow all user access
        this.log4js.info('resource %s permission is [%s], allow all user to access!', JSON.stringify(query), permID)
        this.success(data)
      } else if (permID === 'DENY_ALL') { // deny all user access
        this.log4js.info('resource %s permission is [%s], not allow any user to access!', JSON.stringify(query), permID)
        const reason = `Access failure. resource '${resName}' is deny all user`
        this.fail(401, reason, data)
      } else if (userInfo.permissions[permID]) { // have permission
        this.log4js.info('user [%s] have permission [%s] to access %s', userInfo.username, permID, JSON.stringify(query))
        this.success(data)
      } else { // have no permission
        this.log4js.info('user [%s] have no permission [%s] to access %s', userInfo.username, permID, JSON.stringify(query))
        // TODO: get perm name.
        const reason = `Access failure. resource '${resName}' is required permission [${permID}]`
        this.fail(401, reason, data)
      }
      return
    } else {
      this.log4js.info('user [%s] check permission for resource %s failed, resource not exist!', userInfo.username, JSON.stringify(query))
      const reason = `Access failure. resource '${resName}' not exist`
      this.fail(401, reason, data)
    }
  }

  async accessCheck() {
    const appId = this.getRequiredStringArg('appID')
    const action = this.getRequiredStringArg('action')
    const resName = this.getRequiredStringArg('resName')

    const tokenUserInfo = this.ctx.userInfo
    const {userInfo, cached} = await userCache.getUserInfoById(tokenUserInfo.id, appId)
    this.log4js.info('getUserInfoById(userId:%d, appId:%s) cached: %s', tokenUserInfo.id, appId, cached)
    if (!userInfo) {
      this.log4js.error('accessCheck(args: %s) failed! token user %s not found in database', JSON.stringify(this.args), JSON.stringify(tokenUserInfo))
      throw new TokenError('TOKEN USER NOT FOUND IN DATABASE')
    }

    try {
      await this._accessCheckInternal(userInfo, appId, action, resName)
    } finally {
      try{
        this._writeAccessLog();
      }catch(err) {
        this.log4js.error('write access log failed! %s', err)
      }
    }
  }

  async noPermission() {
    const args = this.getArgs();
    this.log4js.info('---- no permission args: %s', JSON.stringify(args))
    await this.ctx.render('no_permission', args)
  }

  async noPermissionHtml() {
    await this.noPermission();
  }

  async logout() {
    const userInfo = this.ctx.userInfo;
    this.log4js.info('-------- %s logout --------', JSON.stringify(userInfo))
    const maxAge = config.tokenExpireTime * 1000;
    this.ctx.cookies.set(
      'x-rbac-token', 'logouted',
      {
        maxAge: maxAge,
        httpOnly: false,
        overwrite: false,
      }
    )
    this.ctx.status = 302;
    this.ctx.redirect('/api/v1/rbac/login');
  }

  async changePwd() {
    const {username} = this.ctx.userInfo;
    const error = null
    const success = null;
    const args = {username, error, success, oldPassword: undefined, newPassword: undefined, reNewPassword: undefined}
    await this.ctx.render('change_pwd.html', args)
  }

  async _changePwdInternal() {
    const args = this.getArgs();
    const {id: userId, username} = this.ctx.userInfo;
    args.username = username;
    let success = null;
    let error = null;
    if (!config.clientChangePassword) {
      return {ok: false, reason: 'ERR_PASSWORD_CHANGE_NOT_ALLOWED'}
    }

    const oldPassword = this.getArg('oldPassword')
    const newPassword = this.getArg('newPassword')
    const reNewPassword = this.getArg('reNewPassword')
    if (!oldPassword) {
      return {ok: false, reason: 'ERR_OLD_PASSWORD_REQUIRED'}
    }
    if (!newPassword) {
      return {ok: false, reason: 'ERR_NEW_PASSWORD_REQUIRED'}
    }

    if (newPassword !== reNewPassword) {
      return {ok: false, reason: 'ERR_REPEATED_PASSWORD_INCORRECT'}
    }

    const userInfo = await UserModel.findByPk(userId);
    if (!userInfo) {
      this.log4js.error('change password failed! userId:%d (from token) not found in database', userId)
      throw new RbacTokenError('TOKEN_USER_NOT_FOUND')
    }

    if (!util.comparePassword(oldPassword, userInfo.password)) {
      return {ok: false, reason: 'ERR_OLD_PASSWORD_INCORRECT'}
    }


    const options = {where: {id: userId}}
    const values = {password: util.encodePassword(newPassword), updateTime: util.unixtime()}
    await UserModel.mustUpdate(values, options)

    return {ok: true, userInfo}
  }

  async changePwdRest() {
    const {ok, reason} = await this._changePwdInternal();
    if (!ok) {
      this.fail(200, reason, {})
      return
    }
    const data = {}
    this.success(data)
  }

  async changePwdPost() {
    const args = this.getArgs();
    const {id: userId, username} = this.ctx.userInfo;
    args.username = username;
    args.success = null;
    args.oldPassword = args.oldPassword || '';
    args.newPassword = args.newPassword || '';
    args.reNewPassword = args.reNewPassword || '';

    const res = await this._changePwdInternal();
    if(!res.ok) {
      const error = errors[res.reason] || 'Change password failed!'
      args.error = error
      await this.ctx.render('change_pwd.html', args)
      return
    }

    args.success = 'change password successfully'
    args.error = null;
    await this.ctx.render('change_pwd.html', args)
  }
}

module.exports = Rbac

