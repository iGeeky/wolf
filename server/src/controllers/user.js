const BasicService = require('./basic-service')
const UserModel = require('../model/user')
const AccessDenyError = require('../errors/access-deny-error')
const ApplicationModel = require('../model/application')
const UserRoleModel = require('../model/user-role')
const Op = require('sequelize').Op;
const errors = require('../errors/errors')
const userCache = require('../util/user-cache')
const util = require('../util/util')
const _ = require('lodash')

const userFields = ['id', 'username', 'nickname', 'email', 'appIDs', 'manager', 'createTime'];


class User extends BasicService {
  constructor(ctx) {
    super(ctx, UserModel)
  }

  async access(bizMethod) {
    const method = this.ctx.method
    if (method !== 'GET' && this.ctx.userInfo && bizMethod !== 'checkExist') { // POST, PUT, DELETE
      if (this.ctx.userInfo.manager !== 'super') {
        this.log4js.error('access [%s] failed! user:%s have no permission to do this operation', bizMethod, this.ctx.userInfo.username)
        throw new AccessDenyError('need super user to do this operation.')
      }
    }
  }

  async log(bizMethod) {
    if (bizMethod === 'update' || bizMethod === 'delete') {
      this.log4js.info('---- url: %s, method: %s, flush user cache ----', this.url, bizMethod)
      userCache.flushUserCache();
    }
  }

  async userLogin(username, password) {
    const user = await UserModel.findOne({where: {username}})
    if (!user) { // user not exist
      this.log4js.warn('user [%s] login failed! user not exist', username)
      return {err: errors.ERR_USER_NOT_FOUND}
    }

    // compare the password.
    this.log4js.info('password: %s', util.encodePassword(password))
    if (user.password && util.comparePassword(password, user.password)) {
      // do nothing
    } else {
      this.log4js.warn('user [%s] login failed! password error', username)
      return {err: errors.ERR_PASSWORD_ERROR}
    }
    return {userInfo: user.toJSON()};
  }

  async userApplications(userInfo) {
    // console.log('>>> userInfo::', JSON.stringify(userInfo))
    let applications = [];
    if (userInfo.manager === 'super') {
      applications = await ApplicationModel.findAll({});
    } else if (userInfo.manager === 'admin' && userInfo.appIDs) {
      if (!userInfo.appIDs || userInfo.appIDs.length === 0) {
        applications = []
      } else {
        const where = {id: {[Op.in]: userInfo.appIDs}}
        applications = await ApplicationModel.findAll({where});
      }

      if (applications) {
        applications = _.map(applications, (ele) => ele.toJSON())
      }
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

    this.log4js.info('### user[%s] login ...', username)
    const {userInfo, err: loginErr} = await this.userLogin(username, password)

    if (loginErr) {
      this.fail(200, loginErr)
      return
    }

    if (!(userInfo.manager === 'super' || userInfo.manager === 'admin')) {
      this.log4js.error('login failed! user:%s have no permission to login the rbac console', username)
      throw new AccessDenyError('need super or admin user to login the rbac console.')
    }

    const {token} = await this.tokenCreate(userInfo)
    this.log4js.info('username: %s, token: %s', username, token)

    let applications = await this.userApplications(userInfo);
    userInfo.appIDs = userInfo.appIDs || []

    const data = {token, 'userInfo': util.filterFieldWhite(userInfo, userFields), applications}
    this.success(data)
  }

  async info() {
    const userInfo = this.ctx.userInfo
    let applications = await this.userApplications(userInfo);
    userInfo.appIDs = userInfo.appIDs || []
    const data = {'userInfo': util.filterFieldWhite(userInfo, userFields), applications}

    this.success(data)
  }

  async list() {
    const limit = this.getIntArg('limit', 10)
    const page = this.getIntArg('page', 1)
    const offset = (page-1) * limit
    const order = this.getOrderByArgs('-id')
    const key = this.getArg('key')
    const where = {}
    if (key && key !== '') {
      where[Op.or] = [{username: {[Op.regexp]: key}}, {nickname: {[Op.regexp]: key}}, {tel: {[Op.regexp]: key}}]
    }

    const userInfo = this.ctx.userInfo
    if (userInfo.manager === 'admin') {
      const appIds = userInfo.appIDs || []
      where.appIDs = { [Op.overlap]:  appIds}
    }

    const options = {offset, limit, where}
    if (order) {
      options.order = order;
    }
    const userInfos = await UserModel.findAll(options)
    userInfos.forEach((userInfo, i) => {
      userInfo = userInfo.toJSON()
      userInfo.appIDs = userInfo.appIDs || []
      userInfos[i] = userInfo;
    });
    const total = await UserModel.count({where})
    const data = {userInfos, total}
    this.success(data)
  }

  async add() {
    const fieldsMap = {
      username: {type: 'string', required: true},
      nickname: {type: 'string', required: true},
      password: {type: 'string', default: () => util.randomString(12)},
      email: {type: 'string'},
      tel: {type: 'string'},
      appIDs: {type: 'array'},
      manager: {type: 'string'},
    }
    const values = this.getCheckedValues(fieldsMap)
    const password = values.password;
    values.password = util.encodePassword(password);
    values.status = 0;
    values.lastLogin = 0;
    values.createTime = util.unixtime();
    values.updateTime = util.unixtime();
    const userInfo = await UserModel.create(values);
    const data = {password, 'userInfo': util.filterFieldWhite(userInfo.toJSON(), userFields)}
    this.success(data);
  }

  async resetPwd() {
    const id = this.getRequiredIntArg('id')
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

  async update() {
    const fieldsMap = {
      username: {type: 'string'},
      nickname: {type: 'string'},
      email: {type: 'string'},
      tel: {type: 'string'},
      appIDs: {type: 'array'},
      manager: {type: 'string'},
    }
    const id = this.getRequiredIntArg('id')
    const values = this.getCheckedValues(fieldsMap)
    values.updateTime = util.unixtime();
    const options = {where: {id}}
    const {effects, newValues: userInfo} = await UserModel.mustUpdate(values, options)
    const data = {effects, 'userInfo': util.filterFieldWhite(userInfo.toJSON(), userFields)}
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

    if (userInfo.manager === 'super') {
      this.log4js.error('delete super user {id:%s, username:%s} failed!', userInfo.id, userInfo.username)
      this.fail(200, errors.ERR_PERMISSION_DENY, `Can't delete 'super' user`)
      return
    }

    await UserRoleModel.destroy({where: {userID: userInfo.id}})

    const options = {where}
    const rowCount = await UserModel.destroy(options);
    this.success({'count': rowCount, 'userInfo': util.filterFieldWhite(userInfo.toJSON(), userFields)})
  }
}

module.exports = User

