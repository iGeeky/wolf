'use strict'
const argv = require('minimist')(process.argv.slice(2))

const TOSTRING = Object.prototype.toString
const lineMaxWidth = argv.width || 128

const TYPES = {
  'undefined': 'undefined',
  'number': 'number',
  'boolean': 'boolean',
  'string': 'string',
  '[object Function]': 'function',
  '[object RegExp]': 'regexp',
  '[object Array]': 'array',
  '[object Date]': 'date',
  '[object Error]': 'error',
}

function valueType(o) {
  var type = TYPES[typeof o] || TYPES[TOSTRING.call(o)] || (o ? 'object' : 'null')
  return type
}

function repeatString(src, length) {
  var dst = ''
  var index
  for (index = 0; index < length; index += 1) {
    dst += src
  }

  return dst
}

const newLine = '\n'
const newLineJoin = ',' + newLine

function dumps(jsObject, indent) {
  var prettyObject,
    prettyObjectPrint,
    prettyArray,
    functionSignature,
    pretty,
    visited

  let indentString = ''
  if (typeof (indent) === 'string') {
    indentString = indent
  } else {
    indentString = repeatString(' ', indent || 4)
  }

  if (!Object.keys) {
    Object.keys = (function() {
      'use strict'
      var hasOwnProperty = Object.prototype.hasOwnProperty
      var hasDontEnumBug = !({
        toString: null,
      }).propertyIsEnumerable('toString')
      var dontEnums = [
        'toString',
        'toLocaleString',
        'valueOf',
        'hasOwnProperty',
        'isPrototypeOf',
        'propertyIsEnumerable',
        'constructor',
      ]
      var dontEnumsLength = dontEnums.length

      return function(obj) {
        if (typeof obj !== 'function' && (typeof obj !== 'object' || obj === null)) {
          throw new TypeError('Object.keys called on non-object')
        }

        var result = []
        var prop; var i

        for (prop in obj) {
          if (hasOwnProperty.call(obj, prop)) {
            result.push(prop)
          }
        }

        if (hasDontEnumBug) {
          for (i = 0; i < dontEnumsLength; i++) {
            if (hasOwnProperty.call(obj, dontEnums[i])) {
              result.push(dontEnums[i])
            }
          }
        }
        return result
      }
    }())
  }

  prettyObjectPrint = function(object, indent) {
    var value = []

    indent += indentString
    Object.keys(object).forEach(function(property) {
      const propertyValue = object[property]
      const strValue = JSON.stringify(propertyValue)
      if (strValue && strValue.length <= lineMaxWidth) {
        value.push(indent + property + ': ' + strValue)
      } else {
        value.push(indent + property + ': ' + pretty(object[property], indent))
      }
    })
    return value.join(newLineJoin) + newLine
  }

  prettyArray = function(array, indent) {
    const length = array.length
    const value = []
    const subIndent = indent + indentString
    for (let index = 0; index < length; index += 1) {
      value.push(pretty(array[index], subIndent, subIndent))
    }
    return newLine + value.join(newLineJoin) + newLine + indent
  }

  functionSignature = function(element) {
    var signatureExpression,
      signature

    element = element.toString()
    signatureExpression = new RegExp('function\\s*.*\\s*\\(.*\\)')
    signature = signatureExpression.exec(element)
    signature = signature ? signature[0] : '[object Function]'
    return '"' + signature + '"'
  }

  pretty = function(element, indent, fromArray) {
    var type

    type = valueType(element)
    fromArray = fromArray || ''
    if (visited.indexOf(element) === -1) {
      switch (type) {
        case 'array':
          visited.push(element)
          return fromArray + '[' + prettyArray(element, indent) + ']'

        case 'boolean':
          return fromArray + (element ? 'true' : 'false')

        case 'date':
          return fromArray + '"' + element.toString() + '"'

        case 'number':
          return fromArray + element

        case 'object':
          visited.push(element)
          return fromArray + '{' + newLine + prettyObject(element, indent) + indent + '}'

        case 'string':
          return fromArray + JSON.stringify(element)

        case 'function':
          return fromArray + functionSignature(element)

        case 'undefined':
          return fromArray + 'undefined'

        case 'null':
          return fromArray + 'null'

        default:
          if (element.toString) {
            return fromArray + '"' + element.toString() + '"'
          }
          return fromArray + '<<<ERROR>>> Cannot get the string value of the element'
      }
    }
    return fromArray + 'circular reference to ' + element.toString()
  }

  if (jsObject) {
    prettyObject = prettyObjectPrint
    visited = []
    return pretty(jsObject, '') + newLine
  }

  return 'Error: no Javascript object provided'
}

exports.dumps = dumps
