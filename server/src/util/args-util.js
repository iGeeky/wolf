const log4js = require('./log4js')
const queryUtil = require('../util/query-util')
const ArgsError = require('../errors/args-error')
const util = require('./util')
const Op = require('sequelize').Op
const _ = require('lodash')

function parseObject(field, value) {
  try {
    value = JSON.parse(value)
  } catch (err) {
    throw new ArgsError(`${field}'s type is invalid. need a object value.`)
  }
  return value
}

function parseArray(field, value) {
  try {
    if (value[0] === '[' && value[value.length - 1] === ']') {
      value = JSON.parse(value)
    } else if (typeof (value) === 'string') {
      value = value.split(',')
    } else {
      throw new ArgsError(`${field}'s type is invalid. need a array value.`)
    }
  } catch (err) {
    throw new ArgsError(`${field}'s type is invalid. need a array value.`)
  }
  return value
}

class ArgsHelper {
  constructor(args, url) {
    this.args = args
    this.url = url
    this.queryUtil = queryUtil
  }

  getArgs() {
    return _.cloneDeep(this.args)
  }

  // get the checked args, can be used for sequence's insert, update.
  getCheckedValues(fieldsMap) {
    const values = this.queryUtil.getValues(this.getArgs(), fieldsMap, this.url)
    return values
  }

  static getRequestArgs(ctx) {
    const method = ctx.request.method
    let args = ctx.query
    switch (method) {
      case 'POST':
      case 'PUT':
      case 'PATCH':
      case 'DELETE':
        args = ctx.request.body
        // console.log('>>> ctx.request.body')
        break
      default: // GET, DELETE, others
        args = ctx.query
        // console.log('>>> ctx.query')
    }

    return args
  }

  getRequiredArg(field) {
    const value = this.args[field]
    if (value === '' || value === undefined || value === null) {
      log4js.error('request [%s] arg [%s] missing', this.url, field)
      throw new ArgsError(`${field} missing, it's required.`)
    }
    return value
  }

  getRequiredStringArg(field) {
    const value = this.getRequiredArg(field)
    if (typeof (value) !== 'string') {
      log4js.error('request [%s] arg [%s] invalid', this.url, field)
      throw new ArgsError(`${field}'s type is invalid. need a string value.`)
    }
    return value
  }

  getRequiredIntArg(field) {
    let value = this.getRequiredArg(field)
    value = parseInt(value)
    if (isNaN(value)) {
      log4js.error('request [%s] arg [%s] invalid', this.url, field)
      throw new ArgsError(`${field}'s type is invalid. need a integer value.`)
    }
    return value
  }

  getRequiredFloatArg(field) {
    let value = this.getRequiredArg(field)
    value = parseFloat(value)
    if (isNaN(value)) {
      log4js.error('request [%s] arg [%s] invalid', this.url, field)
      throw new ArgsError(`${field}'s type is invalid. need a float value.`)
    }
    return value
  }

  getObjectArg(field) {
    let value = this.getArg(field)
    if (typeof (value) === 'string') {
      value = parseObject(field, value)
    }
    if (value !== undefined && typeof (value) !== 'object') {
      log4js.error('request [%s] arg [%s] invalid', this.url, field)
      throw new ArgsError(`${field}'s type is invalid. need a object value.`)
    }

    return value
  }

  getRequiredObjectArg(field) {
    let value = this.getRequiredArg(field)
    if (typeof (value) === 'string') {
      value = parseObject(field, value)
    }

    if (typeof (value) !== 'object') {
      log4js.error('request [%s] arg [%s] invalid', this.url, field)
      throw new ArgsError(`${field}'s type is invalid. need a object value.`)
    }
    return value
  }

  getArrayArg(field, defaultValue = undefined) {
    let value = this.getArg(field)
    if (typeof (value) === 'string') {
      value = parseArray(field, value)
    }
    if (!value) {
      value = defaultValue
    }

    if (value && !Array.isArray(value)) {
      log4js.error('request [%s] arg [%s] invalid', this.url, field)
      throw new ArgsError(`${field}'s type is invalid. need a array value.`)
    }

    return value
  }

  getRequiredArrayArg(field) {
    const value = this.getArrayArg(field)
    if (!value) {
      log4js.error('request [%s] arg [%s] missing', this.url, field)
      throw new ArgsError(`${field} missing, it's required.`)
    }
    return value
  }

  getRequiredIntArrayArg(field) {
    const values = this.getRequiredArrayArg(field)
    for (let i = 0; i < values.length; i++) {
      values[i] = parseInt(values[i])
    }
    return values
  }

  checkEnum(field, value, enums) {
    if (enums.indexOf(value) < 0) {
      log4js.error('request [%s] arg [%s] value [%s] invalid, need to be one of: %s', this.url, field, value, enums.join(','))
      throw new ArgsError(`${field}'s type is invalid. need to be one of: ${enums.join(',')}.`)
    }
  }

  getArg(field, defaultValue = undefined) {
    let value = this.args[field]
    if (!value) {
      value = defaultValue
    }
    return value
  }

  getStringArg(field, defaultValue = undefined) {
    let value = this.args[field]
    if (!value) {
      value = defaultValue
    }
    if (typeof (value) !== 'string') {
      value = `${value}`
    }
    return value
  }

  getIntArg(field, defaultValue = undefined) {
    let value = parseInt(this.getArg(field))
    if (isNaN(value)) {
      value = defaultValue
    }
    return value
  }

  // get datetime(format: YYYY-MM-DD hh:mm:ss), convert to unixtime in second.
  getDatetimeAsUnixtime(field, defaultValue = undefined) {
    let value = this.getArg(field)
    if (value) {
      value = util.unixtime(value)
    }
    if (!value) {
      value = defaultValue
    }
    return value
  }

  getStartEndTimeArgs() {
    const startTime = this.getDatetimeAsUnixtime('startTime')
    const endTime = this.getDatetimeAsUnixtime('endTime')
    if (startTime && endTime) {
      return { [Op.between]: [startTime, endTime] }
    } else if (startTime) {
      return { [Op.gte]: startTime }
    } else if (endTime) {
      return { [Op.lte]: endTime }
    }
    return undefined
  }

  //
  getOrderByArgs(defOrder) {
    const argOrder = this.getArg('sort', defOrder)
    if (argOrder) {
      if (argOrder.startsWith('+')) {
        const field = argOrder.substring(1)
        return [[field, 'ASC']]
      } else {
        const field = argOrder.replace('-', '')
        return [[field, 'DESC']]
      }
    }
    return undefined
  }
}

module.exports = ArgsHelper
