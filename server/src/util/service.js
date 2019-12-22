
const log4js = require('./log4js')
const ArgsUtil = require('./args-util')
const Sequelize = require('./sequelize')
const json = require('./ok-json')
const errors = require('../errors/errors')
const config = require('../../conf/config')

class Service extends ArgsUtil {
  constructor(ctx) {
    super(null, ctx.url);
    this.args = ArgsUtil.getRequestArgs(ctx)
    // console.log('this.args: ', this.args)
    this.method = ctx.request.method;
    this.log4js = log4js
    this.config = config
    this.ctx = ctx;

    this.transaction = null;
  }

  /**
   * begin a transaction
   */
  /* istanbul ignore next */
  async begin() {
    if (this.transaction === null) {
      this.transaction = await Sequelize.transaction();
    } else {
      this.log4js.error('[%s %s]: start transaction failed! this.transaction is not null', this.method, this.url);
    }
    return this.transaction;
  }

  /* istanbul ignore next */
  async tryCommit() {
    if (this.transaction) {
      await this.transaction.commit();
      this.transaction = null;
    }
  }

  /**
   * commit a transaction
   */
  /* istanbul ignore next */
  async commit() {
    if (this.transaction) {
      await this.transaction.commit();
      this.transaction = null;
    } else {
      this.log4js.error('[%s %s]: commit failed! this.transaction is null', this.method, this.url);
    }
  }

  /* istanbul ignore next */
  async tryRollback() {
    if (this.transaction) {
      await this.transaction.rollback();
      this.transaction = null;
    }
  }

  /**
   * rollback a transaction.
   */
  /* istanbul ignore next */
  async rollback() {
    if (this.transaction) {
      await this.transaction.rollback();
      this.transaction = null;
    } else {
      this.log4js.error('[%s %s]: rollback failed! this.transaction is null', this.method, this.url);
    }
  }

  async access(bizMethod) {

  }

  async log(bizMethod) {

  }

  async do(method) {
    console.log(' url : %s, method: %s', this.url, method)
    try {
      await this.access(method);
      if (this[method] && typeof(this[method]) === 'function') {
        await this[method]()
      } else { // 404, method not found
        this.fail(404, `method '${method}' not found`)
      }
    } finally {
      await this.log(method);
    }
  }


  fail(status, reason, data=null) {
    this.ctx.status = status;
    const body = json.fail(reason, data || errors.errmsg(reason))
    this.ctx.body = body
  }

  success(data, reason) {
    this.ctx.status = 200;
    const body = json.json(true, reason, data)
    this.ctx.body = body
  }
}


module.exports = Service;
