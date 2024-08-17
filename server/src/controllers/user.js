const BasicService = require('./basic-service')
const UserModel = require('../model/user')
const AccessDenyError = require('../errors/access-deny-error')
const ApplicationModel = require('../model/application')
const UserRoleModel = require('../model/user-role')
const {captchaValidate} = require('../util/captcha-util');
const {like} = require('../util/op-util')
const Op = require('sequelize').Op;
const errors = require('../errors/errors')
const userCache = require('../service/user-cache')
const constant = require('../util/constant')
const util = require('../util/util')
const config = require('../../conf/config')
const {ldapOptions} = require('./helper')
const _ = require('lodash')

const userFields = ['id', 'username', 'nickname', 'email', 'tel', 'appIDs', "authType", 'manager', 'status', 'lastLogin', 'profile', 'createTime'];
const applicationFields = ['id', 'name', 'description', 'createTime'];


class User extends BasicService {
  constructor(ctx) {
    super(ctx, UserModel)
  }

  async access(bizMethod) {
    const method = this.ctx.method
    if (method !== 'GET' && this.ctx.userInfo && bizMethod !== 'checkExist' && bizMethod !== 'logout') { // POST, PUT, DELETE
      if (this.ctx.userInfo.manager !== constant.Manager.super) {
        this.log4js.error('access [%s] failed! user:%s have no permission to do this operation', bizMethod, this.ctx.userInfo.username)
        throw new AccessDenyError('ERR_NEED_SUPER_USER')
      }
    }
  }

  async log(bizMethod) {
    if (bizMethod === 'put' || bizMethod === 'delete') {
      this.log4js.info('---- url: %s, method: %s, flush user cache ----', this.url, bizMethod)
      await userCache.flushUserCache();
    }
  }


  async userApplications(userInfo) {
    // console.log('>>> userInfo::', JSON.stringify(userInfo))
    let applications = [];
    if (userInfo.manager === constant.Manager.super) {
      applications = await ApplicationModel.findAll({});
    } else if (userInfo.manager === constant.Manager.admin && userInfo.appIDs) {
      if (!userInfo.appIDs || userInfo.appIDs.length === 0) {
        applications = []
      } else {
        const where = {id: {[Op.in]: userInfo.appIDs}}
        applications = await ApplicationModel.findAll({where});
      }
    }
    if (applications) {
      applications.forEach((application, i) => {
        applications[i] = util.filterFieldWhite(application.toJSON(), applicationFields)
      });
    }
    return applications;
  }

  /**
     * backend user login
     * @request
     * @return json
     */

  async login() {
    const username = this.getRequiredArg('username')
    const password = this.getRequiredArg('password')
    const authType = this.getIntArg('authType', constant.AuthType.PASSWORD)
    if (config.consoleLoginWithCaptcha) {
      const cid = this.getRequiredArg('cid');
      const captchaText = this.getRequiredArg('captchaText')
      const {valid, errmsg} = await captchaValidate(cid, captchaText)
      if (!valid) {
        this.fail(200, errmsg);
        return
      }
    }

    this.log4js.info('### user[%s] login authType=%s...', username, authType)
    const {userInfo, err: loginErr} = await this.userLoginInternal(username, password, {authType})

    if (loginErr) {
      this.fail(200, loginErr)
      return
    }

    if (!(userInfo.manager === constant.Manager.super || userInfo.manager === constant.Manager.admin)) {
      this.log4js.error('login failed! user:%s have no permission to login the rbac console', username)
      throw new AccessDenyError('ERR_LOGIN_NEED_SUPER_OR_ADMIN')
    }

    const {token} = await this.tokenCreate(userInfo)
    this.log4js.info('username: %s, token: %s', username, token)

    let applications = await this.userApplications(userInfo);
    userInfo.appIDs = userInfo.appIDs || []

    const data = {token, 'userInfo': util.filterFieldWhite(userInfo, userFields), applications}
    this.success(data)
  }

  async logout() {
    const token = this.ctx.request.headers['x-rbac-token']
    await this.tokenDelete(token)
    this.success({})
  }

  async info() {
    this.checkMethod('GET')
    const userInfo = this.ctx.userInfo
    let applications = await this.userApplications(userInfo);
    userInfo.appIDs = userInfo.appIDs || []
    const data = {'userInfo': util.filterFieldWhite(userInfo, userFields), applications}

    this.success(data)
  }

  async loginOptions() {
    const data = {
      password: {supported: true},
      ldap: ldapOptions(),
      consoleLoginWithCaptcha: config.consoleLoginWithCaptcha,
    }
    this.success(data)
  }

  async list() {
    this.checkMethod('GET')
    const limit = this.getIntArg('limit', 10)
    const page = this.getIntArg('page', 1)
    const offset = (page-1) * limit
    const order = this.getOrderByArgs('-id')
    const key = this.getArg('key')
    const username = this.getArg('username')
    const where = {}
    if (key && key !== '') {
      where[Op.or] = [like('username', key), like('nickname', key), like('tel', key)]
    }
    if (username && username !== '') {
      where.username = username
    }
    const userInfo = this.ctx.userInfo
    if (userInfo.manager === constant.Manager.admin) {
      const appIds = userInfo.appIDs || []
      where.appIDs = { [Op.overlap]:  appIds}
    }

    const options = {offset, limit, where}
    if (order) {
      options.order = order;
    }
    const userInfos = await UserModel.findAll(options)
    userInfos.forEach((userInfo, i) => {
      userInfo = util.filterFieldWhite(userInfo.toJSON(), userFields)
      userInfo.appIDs = userInfo.appIDs || []
      userInfos[i] = userInfo;
    });
    const total = await UserModel.count({where})
    const data = {userInfos, total}
    this.success(data)
  }

  async post() {
    const fieldsMap = {
      username: {type: 'string', required: true},
      nickname: {type: 'string', required: true},
      password: {type: 'string', default: () => util.randomString(12)},
      email: {type: 'string'},
      tel: {type: 'string'},
      appIDs: {type: 'array'},
      manager: {type: 'string'},
      status: {type: 'integer', default: constant.UserStatus.Normal}
    }
    const values = this.getCheckedValues(fieldsMap)

    await UserModel.checkNotExist({username: values.username}, errors.ERR_USERNAME_EXIST)
    await this.checkAppIDsExist(values.appIDs)

    const password = values.password;
    values.password = util.encodePassword(password);
    values.lastLogin = 0;
    values.authType = constant.AuthType.PASSWORD;
    values.createTime = util.unixtime();
    values.updateTime = util.unixtime();
    let userInfo = await UserModel.create(values);
    userInfo = userInfo.toJSON()
    const data = {password, 'userInfo': util.filterFieldWhite(userInfo, userFields)}
    this.success(data);
  }

  async put() {
    const fieldsMap = {
      username: {type: 'string'},
      nickname: {type: 'string'},
      email: {type: 'string'},
      tel: {type: 'string'},
      appIDs: {type: 'array'},
      manager: {type: 'string'},
      status: {type: 'integer'}
    }
    const id = this.getRequiredIntArg('id')
    const values = this.getCheckedValues(fieldsMap)
    const user = await UserModel.findOne({where: {id}})
    if (!user) { // user not exist
      this.log4js.warn('update user [id:%s] failed! user not exist', id)
      this.fail(400, errors.ERR_USER_NOT_FOUND)
      return
    }

    if (user.manager === constant.Manager.super && values.status === constant.UserStatus.Disabled) { // disabled.
      this.log4js.error('update failed! cannot disabled a super user(%d:%s)', id, values.username)
      throw new AccessDenyError('ERR_CANNOT_DISABLED_SUPER_USER')
    }

    // cannot change super role of the default super user 'root'
    if (id === 0 || user.username === 'root') {
      if (values.manager && user.manager != values.manager) {
        this.log4js.error('update failed! cannot remove super role of the default super user(%d:%s)', id, values.username)
        throw new AccessDenyError('ERR_CANNOT_REMOVE_SUPER_USER_MANAGER')
      }
    }

    if (values.username) {
      await UserModel.checkNotExist({'id': {[Op.ne]: id}, username: values.username}, errors.ERR_USERNAME_EXIST)
    }

    await this.checkAppIDsExist(values.appIDs)

    values.updateTime = util.unixtime();
    const options = {where: {id}}
    let {effects, newValues: userInfo} = await UserModel.mustUpdate(values, options)
    userInfo = userInfo.toJSON()
    const data = {effects, 'userInfo': util.filterFieldWhite(userInfo, userFields)}
    this.success(data);
  }

  async resetPwd() {
    this.checkMethod('PUT')
    const id = this.getRequiredIntArg('id')
    const userInfo = await UserModel.findByPk(id)
    if (userInfo.authType !== constant.AuthType.PASSWORD) {
      this.fail(400, errors.ERR_NOT_ALLOWED_RESET_PWD)
      return
    }
    const values = {}
    const password = util.randomString(12)
    values.password = util.encodePassword(password);
    values.updateTime = util.unixtime();
    const options = {where: {id}}
    const {effects} = await UserModel.mustUpdate(values, options)
    if (effects <= 0) {
      this.fail(400, errors.ERR_USER_NOT_FOUND)
      return;
    }
    const data = {password}
    this.success(data);
  }

  async delete() {
    let userInfo = null;
    const username = this.getArg('username');

    let where = null;
    if (username) {
      where = {username}
      userInfo = await UserModel.findOne({where})
      if (!userInfo) {
        this.fail(200, errors.ERR_USER_NOT_FOUND)
        return
      }
    } else {
      const id = this.getRequiredIntArg('id')
      where = {id}
      userInfo = await UserModel.findByPk(id)
      if (!userInfo) {
        this.fail(200, errors.ERR_USER_NOT_FOUND)
        return
      }
    }
    userInfo = userInfo.toJSON()

    if (userInfo.manager === constant.Manager.super) {
      this.log4js.error('delete super user {id:%s, username:%s} failed!', userInfo.id, userInfo.username)
      this.fail2(403, errors.ERR_PERMISSION_DENY, `Can't delete 'super' user`)
      return
    }

    await UserRoleModel.destroy({where: {userID: userInfo.id}})

    const options = {where}
    const rowCount = await UserModel.destroy(options);
    this.success({'count': rowCount, 'userInfo': util.filterFieldWhite(userInfo, userFields)})
  }
}

module.exports = User

