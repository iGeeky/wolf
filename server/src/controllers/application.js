const BasicService = require('./basic-service')
const ApplicationModel = require('../model/application')
const UserModel = require('../model/user')
const errors = require('../errors/errors')
const AccessDenyError = require('../errors/access-deny-error')
const constant = require('../util/constant')
const util = require('../util/util')
const oauthUtil = require('../util/oauth-util')
const Op = require('sequelize').Op;
const applicationFields = ['id', 'name', 'description', 'redirectUris', 'grants', 'accessTokenLifetime', 'refreshTokenLifetime', 'createTime', 'updateTime'];
const applicationDetailFields =  applicationFields.slice()

class Application extends BasicService {
  constructor(ctx) {
    super(ctx, ApplicationModel)
  }


  async access(bizMethod) {
    const method = this.ctx.method
    const checkSuperRole = (method !== 'GET' && bizMethod !== 'checkExist') || (method === 'GET' && bizMethod === 'secret')
    if (checkSuperRole) { // POST, PUT, DELETE
      if (this.ctx.userInfo.manager !== constant.Manager.super) {
        this.log4js.error('access [%s] failed! user:%s have no permission to do this operation', bizMethod, this.ctx.userInfo.username)
        throw new AccessDenyError('need super user to do this operation.')
      }
    }
  }


  async diagram() {
    const id = this.getRequiredArg('id');
    const application = await ApplicationModel.findByPk(id);
    if(!application) {
      this.fail(200, errors.ERR_OBJECT_NOT_FOUND)
      return
    }
    const where = {appIDs: { [Op.contains]: [id] }}
    const users = await UserModel.findAll({where})
    const userIds = [];

    const nodes = [];
    const links = [];
    const appKey = `app:${application.id}`
    const rootNode =  { key:  appKey, text: application.name, category: 'application' };
    nodes.push(rootNode);

    if(users) {
      users.forEach((user) => {
        userIds.push(user.id);
        const userKey = `user:${user.id}`
        let username = user.username;
        if(user.nickname) {
          username = `${username}::${user.nickname}`
        }
        const node = {key: userKey, text: username, category: 'user'}
        nodes.push(node);
        const link = {from: appKey, to: userKey};
        links.push(link);
      })

      const data = await this.getDiagramByUserIds(userIds, id);
      if(data.nodes) {
        nodes.push(...data.nodes);
      }
      if(data.links) {
        links.push(...data.links);
      }
    }

    const data = {nodeDataArray: nodes, linkDataArray: links};
    this.success(data);
  }

  async get() {
    const id = this.getRequiredArg('id')
    const application = await ApplicationModel.findByPk(id)
    if (!application) {
      this.fail(200, errors.ERR_OBJECT_NOT_FOUND)
      return
    }

    const data = {application: util.filterFieldWhite(application.toJSON(), applicationDetailFields)}
    this.success(data)
  }

  async secret() {
    this.checkMethod('GET')
    const id = this.getRequiredArg('id')
    const application = await ApplicationModel.findByPk(id)
    if (!application) {
      this.fail(200, errors.ERR_OBJECT_NOT_FOUND)
      return
    }
    let secret = application.secret
    if(secret) {
      secret = oauthUtil.decryptSecret(secret)
    }
    const data = {secret: secret}
    this.success(data)
  }

  async list() {
    this.checkMethod('GET')
    const limit = this.getIntArg('limit', 10)
    const page = this.getIntArg('page', 1)
    const offset = (page-1) * limit
    const order = this.getOrderByArgs('-id')
    const key = this.getArg('key')
    const where = {}
    if (key && key !== '') {
      where[Op.or] = [{id: {[Op.regexp]: key}}, {name: {[Op.regexp]: key}}]
    }
    const userInfo = this.ctx.userInfo
    if (userInfo.manager === constant.Manager.admin) {
      const appIds = userInfo.appIDs || []
      where.id = { [Op.in]:  appIds}
    }

    const options = {offset, limit, where}
    if (order) {
      options.order = order;
    }
    const applications = await ApplicationModel.findAll(options)
    applications.forEach((application, i) => {
      applications[i] = util.filterFieldWhite(application.toJSON(), applicationFields)
    });
    const total = await ApplicationModel.count({where})
    const data = {applications, total}
    this.success(data)
  }

  async listAll() {
    this.checkMethod('GET')
    const options = {}
    const applications = await ApplicationModel.findAll(options)
    applications.forEach((application, i) => {
      applications[i] = util.filterFieldWhite(application.toJSON(), applicationFields)
    });
    const total = applications.length;
    const data = {applications, total}
    this.success(data)
  }

  async post() {
    const fieldsMap = {
      id: {type: 'string', required: true},
      name: {type: 'string', required: true},
      description: {type: 'string'},
      secret: {type: 'string', required: false},
      redirectUris: {type: 'array'},
      grants: {type: 'array', required: false},
      accessTokenLifetime: {type: 'integer', required: false},
      refreshTokenLifetime: {type: 'integer', required: false},
    }
    const values = this.getCheckedValues(fieldsMap)
    if(values.secret) {
      values.secret = oauthUtil.encryptSecret(values.secret)
    }

    await ApplicationModel.checkNotExist({'id': values.id}, errors.ERR_APPLICATION_ID_EXIST)
    await ApplicationModel.checkNotExist({'name': values.name}, errors.ERR_APPLICATION_NAME_EXIST)

    values.createTime = util.unixtime();
    values.updateTime = util.unixtime();
    const application = await ApplicationModel.create(values);
    const data = {'application': util.filterFieldWhite(application.toJSON(), applicationFields)}
    this.success(data);
  }

  async put() {
    const fieldsMap = {
      name: {type: 'string'},
      description: {type: 'string'},
      secret: {type: 'string', required: false},
      redirectUris: {type: 'array'},
      grants: {type: 'array', required: false},
      accessTokenLifetime: {type: 'integer', required: false},
      refreshTokenLifetime: {type: 'integer', required: false},
    }
    const id = this.getRequiredArg('id')
    const values = this.getCheckedValues(fieldsMap)
    if(values.secret) {
      values.secret = oauthUtil.encryptSecret(values.secret)
    }
    if (values.name) {
      await ApplicationModel.checkNotExist({'id': {[Op.ne]: id}, 'name': values.name}, errors.ERR_APPLICATION_NAME_EXIST)
    }

    values.updateTime = util.unixtime();
    const options = {where: {id}}
    const {newValues: application} = await ApplicationModel.mustUpdate(values, options)
    const data = {'application': util.filterFieldWhite(application.toJSON(), applicationFields)}
    this.success(data);
  }

  async delete() {
    await this.deleteByPk('id')
  }
}

module.exports = Application

