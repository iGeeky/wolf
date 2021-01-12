const BasicService = require('./basic-service')
const AccessLogModel = require('../model/access-log')
const Op = require('sequelize').Op;

class AccessLog extends BasicService {
  constructor(ctx) {
    super(ctx, AccessLogModel)
  }

  async list() {
    this.checkMethod('GET')
    const limit = this.getIntArg('limit', 10)
    const page = this.getIntArg('page', 1)
    const offset = (page-1) * limit
    const appId = this.getRequiredArg('appID')
    const username = this.getArg('username')
    const action = this.getArg('action')
    const resName = this.getArg('resName')
    const ip = this.getArg('ip')
    const status = this.getIntArg('status')
    const accessTime = this.getStartEndTimeArgs();
    // console.log('>>> accessTime:', accessTime)

    const order = this.getOrderByArgs('-id')
    const where = {appID: appId}
    if (username) {
      where[Op.or] = {username: username, nickname: username}
    }
    if (action && action !== 'ALL') {
      where.action = action;
    }
    if (resName) {
      where.resName = resName;
    }
    if (status && status > 0) {
      where.status = status;
    }
    if (ip) {
      where.ip = ip;
    }
    if (accessTime) {
      where.accessTime = accessTime
    }

    const options = {offset, limit, where}
    if (order) {
      options.order = order;
    }
    const accessLogs = await AccessLogModel.findAll(options)
    accessLogs.forEach((accessLog, i) => {
      accessLog = accessLog.toJSON()
      accessLogs[i] = accessLog;
    });
    const total = await AccessLogModel.count({where})
    const data = {accessLogs, total}
    this.success(data)
  }

  async deleteByAppId() {
    await this.deleteBy(['appID'])
  }
}

module.exports = AccessLog

