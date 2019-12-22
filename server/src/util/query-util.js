/**
 * Sequelize query helper
 */

const _ = require('lodash')
const ArgsError = require('../errors/args-error')
const log4js = require('./log4js')
const Op = require('sequelize').Op
const typeUtil = require('./type-util')

const TYPE_OBJECT = typeUtil.TYPES.OBJECT
const TYPE_ARRAY = typeUtil.TYPES.ARRAY
const TYPE_STRING = typeUtil.TYPES.STRING
const TYPE_INTEGER = typeUtil.TYPES.INTEGER
const TYPE_FLOAT = typeUtil.TYPES.FLOAT

function checkValueType(value, type_) {
  // if value is null, do not check value's type.
  const ok = true
  if (value === null) {
    return { ok, value }
  }

  const valueType = typeUtil.getType(value)

  if (type_ === valueType) { // value's type is matched, copy the value to values.
    return { ok, value }
  }

  // is value's type not matched, convert the value's type.
  if (type_ === TYPE_INTEGER) {
    value = parseInt(value)
    if (!isNaN(value)) {
      return { ok, value }
    }
  } else if (type_ === TYPE_FLOAT) {
    value = parseFloat(value)
    if (!isNaN(value)) {
      return { ok, value }
    }
  } else if (type_ === TYPE_OBJECT) {
    value = JSON.parse(value)
    if (typeUtil.isObject(value)) {
      return { ok, value }
    }
  } else if (type_ === TYPE_ARRAY) {
    value = JSON.parse(value)
    if (typeUtil.isArray(value)) {
      return { ok, value }
    }
  }
  return { ok: false }
}

/**
 * build a values params for sequence from request args.
 * @param {object} args http request arguments
 * @param {object} fieldsMap {field: 'integer', field2: {type: 'string', default: 'test', enums: ['test','foo','bar']}, field3: {type: 'integer', required: true}}
 *      support types: object, array, string, integer, float, boolean
 * @param {string} url request url, used for debug.
 * @return {object} values, the values params for sequence query or update.
 */
function getValues(args, fieldsMap = {}, url) {
  const fields = Object.keys(fieldsMap)
  const values = {}
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i]
    let type_ = TYPE_STRING
    let defValue
    let required = false
    const attributes = fieldsMap[field]
    if (typeof (attributes) === TYPE_STRING) {
      type_ = attributes
    } else {
      type_ = attributes.type || TYPE_STRING
      defValue = attributes.default
      required = attributes.required
    }
    if (!typeUtil.isValidType(type_)) {
      throw new ArgsError(`invalid type [${type_}] in fieldsMap ${fieldsMap}`)
    }

    let value = args[field]
    if (required && (value === '' || value === undefined || value === null)) {
      log4js.error('request [%s] arg [%s] missing, attributes: %s', url, field, JSON.stringify(attributes))
      throw new ArgsError(`${field} is missing, but it is required!`)
    }

    if (defValue !== undefined && (value === '' || value === undefined || value === null)) {
      if (typeof (defValue) === 'function') {
        value = defValue()
      } else {
        value = defValue
      }
    }

    if (value === undefined) {
      continue
    }

    const { ok, value: newValue } = checkValueType(value, type_)
    if (!ok) {
      log4js.error('request [%s] arg [%s] invalid', url, field)
      throw new ArgsError(`type of '${field}' is invalid`)
    }
    value = newValue

    if (attributes.enums && typeUtil.isArray(attributes.enums)) {
      if (_.indexOf(attributes.enums, value) === -1) { // value not in enums.
        throw new ArgsError(`value of '${field}' is invalid, must be any of ${attributes.enums}`)
      }
    }

    values[field] = value
  }
  return values
}

exports.getValues = getValues
