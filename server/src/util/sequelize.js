const Sequelize = require('sequelize');
const log4js = require('./log4js')
const config = require('../../conf/config')
const errors = require('../errors/errors')
const BackendError = require('../errors/backend-error')
const ArgsError = require('../errors/args-error')
const DataExistError = require('../errors/data-exist-error')
const DataNotFoundError = require('../errors/data-not-found-error')
const _ = require('lodash');

require('pg').defaults.parseInt8 = true

const pgConfig = config.database

/**
 * update object, if effects < options.minEffects, throw ArgsError.
 * @param {object} values
 * @param {object} options
 */
const mustUpdate = async function(values, options) {
  const returningAsList = options.returningAsList;
  let minEffects = options.minEffects;
  if (isNaN(minEffects)) {
    minEffects = 1
  }
  delete(options.returningAsList);
  options.returning = true;
  const result = await this.update(values, options)
  if (!result || !Array.isArray(result) || result.length !== 2) {
    log4js.error('%s.mustUpdate(values:%s, options: %s) failed! result: %s', this.getTableName(), JSON.stringify(values), JSON.stringify(_.omit(options, ['transaction'])), result)
    throw new BackendError('update failed!')
  }
  const effects = result[0];
  if (effects < minEffects) {
    log4js.error('%s.mustUpdate(values:%s, options: %s) failed! effects(%d) < 1', this.getTableName(), JSON.stringify(values), JSON.stringify(_.omit(options, ['transaction'])), result[0])
    throw new ArgsError('update failed! data not found')
  }
  let newValues = null;
  if (returningAsList) {
    newValues = result[1];
  } else {
    newValues = result[1][0]; // returning one object.
  }

  return {effects, newValues}
};

/**
 * check data not exist, if exist, throw DataExistError
 * @param {*} where
 * @param {*} reason
 */
const checkNotExist = async function(where, reason) {
  const existObject = await this.findOne({"where": where})
  if (existObject) {
    throw new DataExistError(reason, errors.errmsg(reason))
  }
  return existObject
}

/**
 * check data exist, if not exist, throw DataNotFoundError
 * @param {*} where
 * @param {*} reason
 */
const checkExist = async function(where, reason) {
  const existObject = await this.findOne({"where": where})
  if (!existObject) {
    throw new DataNotFoundError(reason, errors.errmsg(reason))
  }
  return existObject
}


const upsert = async function(values, options) {
  const obj = await this.findOne(options)
  let operation = null;
  if (obj) {
    delete(values.createTime);
    const newValues = await obj.update(values);
    operation = 'update'
    return {operation, newValues}
  } else {
    const newValues = await this.create(values)
    operation = 'insert'
    return {operation, newValues}
  }
}


const sequelize = new Sequelize(pgConfig.url, {
  pool: {
    max: pgConfig.max || 100,
    min: 0,
    idle: pgConfig.idle || 10000,
  },
  logging: (sql) => log4js.info(sql),
  define: {
    timestamps: false, // default is true
  },
  operatorsAliases: false,
  dialectOptions: {
    useUTC: false, // for reading from database
  },
  timezone: '+08:00', // for writing to database
})


function addMethodToModel() {
  const oldDefine = Sequelize.prototype.define;
  function customDefine(modelName, attributes, options) {
    const NewModel = Reflect.apply(oldDefine, this, [modelName, attributes, options])
    NewModel.mustUpdate = mustUpdate;
    NewModel.upsert = upsert;
    NewModel.checkNotExist = checkNotExist;
    NewModel.checkExist = checkExist;
    if (options && options.deleteDefaultId) {
      NewModel.removeAttribute('id')
    }
    return NewModel;
  }
  Sequelize.prototype.define = customDefine;
}

addMethodToModel()

module.exports = sequelize
