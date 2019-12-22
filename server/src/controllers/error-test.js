const BasicService = require('./basic-service')
const AccessLogModel = require('../model/access-log')
const BackendError = require('../errors/backend-error')

const Op = require('sequelize').Op;

class ErrorTest extends BasicService {
  constructor(ctx) {
    super(ctx, AccessLogModel)
  }

  async backendError() {
    throw new BackendError('backend database failed!')
    this.success({})
  }

  async unknowError() {
    throw "unknow-error"
    this.success({})
  }

  async requiredIntArg() {
    const value = this.getRequiredIntArg('value')
    this.success({value})
  }
  async requiredFloatArg() {
    const value = this.getRequiredFloatArg('value')
    this.success({value})
  }
  async objectArg() {
    const value = this.getObjectArg('value')
    this.success({value})
  }

  async requiredObjectArg() {
    const value = this.getRequiredObjectArg('value')
    this.success({value})
  }

  async arrayArg() {
    const value = this.getArrayArg('value')
    this.success({value})
  }

  async requiredArrayArg() {
    const value = this.getRequiredArrayArg('value')
    this.success({value})
  }

  async requiredIntArrayArg() {
    const value = this.getRequiredIntArrayArg('value')
    this.success({value})
  }

  async enum() {
    const value = this.checkEnum('value')
    this.success({value})
  }
}


module.exports = ErrorTest

