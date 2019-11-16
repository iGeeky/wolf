
const TYPES = {
  OBJECT: 'object',
  ARRAY: 'array',
  STRING: 'string',
  INTEGER: 'integer',
  FLOAT: 'float',
  BOOLEAN: 'boolean',
  NULL: 'null',
}

const TYPES_MAP = {
  [TYPES.ARRAY]: true,
  [TYPES.BOOLEAN]: true,
  [TYPES.FLOAT]: true,
  [TYPES.INTEGER]: true,
  [TYPES.OBJECT]: true,
  [TYPES.STRING]: true,
}

function isValidType(type_) {
  return TYPES_MAP[type_]
}
function isInt(n) {
  return Number(n) === n && n % 1 === 0
}

function isFloat(n) {
  return Number(n) === n && n % 1 !== 0
}

function isObject(value) {
  return typeof (value) === 'object' && !Array.isArray(value)
}

function isArray(value) {
  return typeof (value) === 'object' && Array.isArray(value)
}

/**
{"attr":3} => object
[{"attr":3}] => array
"string" => string
"" => string
3.17 => float
123 => integer
-23 => integer
true => boolean
undefined => undefined
null => null
 */
function getType(value) {
  let type = typeof (value)
  if (type === TYPES.OBJECT) {
    if (Array.isArray(value)) {
      type = TYPES.ARRAY
    } else if (value === null) {
      type = TYPES.NULL
    }
  } else if (type === 'number') {
    if (isFloat(value)) {
      type = TYPES.FLOAT
    } else {
      type = TYPES.INTEGER
    }
  }
  return type
}

exports.TYPES = TYPES
exports.isValidType = isValidType
exports.getType = getType
exports.isObject = isObject
exports.isArray = isArray
