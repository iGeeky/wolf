function isFloat(n) {
  return Number(n) === n && n % 1 !== 0
}

function getType(value) {
  let type = typeof (value)
  if (type === 'object') {
    if (Array.isArray(value)) {
      type = 'array'
    } else if (value === null) {
      type = 'null'
    }
  } else if (type === 'number' && !isFloat(value)) {
    type = 'integer'
  }
  return type
}

function generateSchema(field, value, opts) {
  const type = getType(value)
  const schema = { type }
  const {
    enums = false, // 是否添加枚举值检测.
    forceEnumFields = { ok: true, reason: true }, // 默认添加枚举值检测的字段.
    deep = 10, // 递归处理的深度.
    curLevel = 0, // 当前处理到的深度.
  } = opts || {}

  const level = curLevel + 1
  opts.curLevel = level

  switch (type) {
    case 'object':
      if (level <= deep) {
        const properties = {}
        const required = []
        const subFields = Object.keys(value)
        subFields.forEach(subField => {
          const childValue = value[subField]
          properties[subField] = generateSchema(subField, childValue, Object.assign({}, opts))
          required.push(subField)
        })
        schema.properties = properties
        schema.required = required
      }
      break
    case 'array':
      if (level <= deep && value.length > 0) {
        schema.items = generateSchema(null, value[0], Object.assign({}, opts))
      }
      break
    case 'number':
    case 'string':
    case 'integer':
    case 'boolean':
      if (enums || (field && forceEnumFields && forceEnumFields[field])) {
        schema.enum = [value]
      }
      break
    case 'null': // null的不自动生成,指定null容易有出错的情况.
      delete (schema.type)
      break
    default:
      throw new Error('UnKnown type:' + type, ', value:', value)
  }
  return schema
}

function autoSchema(value, opts) {
  return generateSchema(null, value, opts || {})
}

exports.autoSchema = autoSchema
