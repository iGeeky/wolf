const Sequelize = require('sequelize');
const Seq = require('sequelize')
const log4js = require('./log4js')
const config = require('../../conf/config')
const errors = require('../errors/errors')
const BackendError = require('../errors/backend-error')
const ArgsError = require('../errors/args-error')
const DataExistError = require('../errors/data-exist-error')
const DataNotFoundError = require('../errors/data-not-found-error')
const _ = require('lodash');

require('pg').defaults.parseInt8 = true

const dbConfig = config.database
const isMysql = config.database.url.substring(0, 8) === 'mysql://'

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

  let effects = 0
  let newValues = null;
  if (isMysql) {
    effects = result[1]
    if (returningAsList) {
      newValues = await this.findAll(options)
    } else {
      newValues = await this.findOne(options)
    }
  } else {
    effects = result[0];
    if (effects < minEffects) {
      log4js.error('%s.mustUpdate(values:%s, options: %s) failed! effects(%d) < 1', this.getTableName(), JSON.stringify(values), JSON.stringify(_.omit(options, ['transaction'])), result[0])
      throw new ArgsError('update failed! data not found')
    }
    if (returningAsList) {
      newValues = result[1];
    } else {
      newValues = result[1][0]; // returning one object.
    }
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
    throw new DataExistError(reason, '')
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
    throw new DataNotFoundError(reason, '')
  }
  return existObject
}

const arraySeparator = "|||"

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

function arrayGet(field_name) {
  function get() {
    const arr_value = this.getDataValue(field_name)
    if (arr_value) {
      const startPos = arr_value.startsWith(arraySeparator) ? 3 : undefined
      const endPos = arr_value.endsWith(arraySeparator) ? -3 : undefined
      return arr_value.slice(startPos, endPos).split(arraySeparator)
    }
    return []
  }
  return get
}

function arraySet(field_name) {
  function set(arr) {
    let value = ''
    if (arr) {
      value = arraySeparator + arr.join(arraySeparator) + arraySeparator
    }
    this.setDataValue(field_name, value)
  }
  return set
}

function objectGet(field_name) {
  function get() {
    const value = this.getDataValue(field_name)
    if (value) {
      return JSON.parse(value)
    }
    return {}
  }
  return get
}

function objectSet(field_name) {
  function set(obj) {
    let value = ''
    if (obj) {
      value = JSON.stringify(obj)
    }
    this.setDataValue(field_name, value)
  }
  return set
}

function mysqlCustomDefine(modelName, attributes, options) {
  // 判断是否为mysql
  if(!isMysql) {
    return
  }

  for (const attr in attributes) {
    const cfg = attributes[attr]
    const field_type = cfg.type
    if (field_type.key === 'ARRAY') {
      cfg.get = arrayGet(attr)
      cfg.set = arraySet(attr)
      cfg.type = field_type.type
    } else if (field_type.key === 'JSONB') {
      cfg.get = objectGet(attr)
      cfg.set = objectSet(attr)
      cfg.type = Seq.TEXT
    }
  }
}

let dialectOptions = {}
if (isMysql) {
  dialectOptions = {
    supportBigNumbers: true,
    // bigNumberStrings: true,
  }
} else {
  dialectOptions = {
    useUTC: false, // for reading from database
  }
}

const sequelize = new Sequelize(dbConfig.url, {
  pool: {
    max: dbConfig.max || 100,
    min: 0,
    idle: dbConfig.idle || 10000,
  },
  logging: (sql) => log4js.info(sql),
  define: {
    timestamps: false, // default is true
  },
  operatorsAliases: '0',
  dialectOptions: dialectOptions,
  timezone: '+08:00', // for writing to database
})


function addMethodToModel() {
  const oldDefine = Sequelize.prototype.define;
  function customDefine(modelName, attributes, options) {
    mysqlCustomDefine(modelName, attributes, options)
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
