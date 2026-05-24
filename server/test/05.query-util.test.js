const assert = require('assert')
const { getValues } = require('../src/util/query-util')

describe('query-util', function() {

  describe('getValues', function() {
    describe('string type', function() {
      it('string shorthand type', function() {
        const result = getValues({ name: 'hello' }, { name: 'string' }, '/test')
        assert.strictEqual(result.name, 'hello')
      })

      it('object type with string', function() {
        const result = getValues({ name: 'hello' }, { name: { type: 'string' } }, '/test')
        assert.strictEqual(result.name, 'hello')
      })

      it('string value unchanged', function() {
        const result = getValues({ val: '123' }, { val: 'string' }, '/test')
        assert.strictEqual(result.val, '123')
      })
    })

    describe('integer type', function() {
      it('integer value passes', function() {
        const result = getValues({ count: 42 }, { count: 'integer' }, '/test')
        assert.strictEqual(result.count, 42)
      })

      it('string "123" converts to integer', function() {
        const result = getValues({ count: '123' }, { count: 'integer' }, '/test')
        assert.strictEqual(result.count, 123)
      })

      it('invalid string throws', function() {
        assert.throws(() => {
          getValues({ count: 'abc' }, { count: 'integer' }, '/test')
        })
      })
    })

    describe('float type', function() {
      it('float value passes', function() {
        const result = getValues({ price: 3.14 }, { price: 'float' }, '/test')
        assert.strictEqual(result.price, 3.14)
      })

      it('string "3.14" converts to float', function() {
        const result = getValues({ price: '3.14' }, { price: 'float' }, '/test')
        assert.strictEqual(result.price, 3.14)
      })

      it('invalid string throws', function() {
        assert.throws(() => {
          getValues({ price: 'abc' }, { price: 'float' }, '/test')
        })
      })
    })

    describe('object type', function() {
      it('object value passes', function() {
        const obj = { key: 'val' }
        const result = getValues({ data: obj }, { data: 'object' }, '/test')
        assert.deepStrictEqual(result.data, obj)
      })

      it('JSON string converts to object', function() {
        const result = getValues({ data: '{"key":"val"}' }, { data: 'object' }, '/test')
        assert.deepStrictEqual(result.data, { key: 'val' })
      })

      it('invalid JSON throws', function() {
        assert.throws(() => {
          getValues({ data: 'not-json' }, { data: 'object' }, '/test')
        })
      })

      it('JSON array does not match object type', function() {
        assert.throws(() => {
          getValues({ data: '[1,2]' }, { data: 'object' }, '/test')
        })
      })
    })

    describe('array type', function() {
      it('array value passes', function() {
        const arr = [1, 2, 3]
        const result = getValues({ items: arr }, { items: 'array' }, '/test')
        assert.deepStrictEqual(result.items, arr)
      })

      it('JSON string converts to array', function() {
        const result = getValues({ items: '[1,2,3]' }, { items: 'array' }, '/test')
        assert.deepStrictEqual(result.items, [1, 2, 3])
      })

      it('JSON object does not match array type', function() {
        assert.throws(() => {
          getValues({ items: '{"a":1}' }, { items: 'array' }, '/test')
        })
      })
    })

    describe('null value', function() {
      it('null value passes through without type check', function() {
        const result = getValues({ name: null }, { name: 'integer' }, '/test')
        assert.strictEqual(result.name, null)
      })
    })

    describe('required field', function() {
      it('missing required field throws', function() {
        assert.throws(() => {
          getValues({}, { name: { type: 'string', required: true } }, '/test')
        })
      })

      it('empty string required field throws', function() {
        assert.throws(() => {
          getValues({ name: '' }, { name: { type: 'string', required: true } }, '/test')
        })
      })

      it('null required field throws', function() {
        assert.throws(() => {
          getValues({ name: null }, { name: { type: 'string', required: true } }, '/test')
        })
      })

      it('provided required field passes', function() {
        const result = getValues({ name: 'ok' }, { name: { type: 'string', required: true } }, '/test')
        assert.strictEqual(result.name, 'ok')
      })
    })

    describe('default value', function() {
      it('static default used when value missing', function() {
        const result = getValues({}, { name: { type: 'string', default: 'fallback' } }, '/test')
        assert.strictEqual(result.name, 'fallback')
      })

      it('function default called when value missing', function() {
        const result = getValues({}, { name: { type: 'string', default: () => 'generated' } }, '/test')
        assert.strictEqual(result.name, 'generated')
      })

      it('provided value overrides default', function() {
        const result = getValues({ name: 'provided' }, { name: { type: 'string', default: 'fallback' } }, '/test')
        assert.strictEqual(result.name, 'provided')
      })

      it('undefined value with no default is skipped', function() {
        const result = getValues({}, { name: 'string' }, '/test')
        assert.strictEqual(result.name, undefined)
        assert.ok(!('name' in result))
      })
    })

    describe('enum validation', function() {
      it('value in enum passes', function() {
        const result = getValues({ status: 'active' }, { status: { type: 'string', enums: ['active', 'inactive'] } }, '/test')
        assert.strictEqual(result.status, 'active')
      })

      it('value not in enum throws', function() {
        assert.throws(() => {
          getValues({ status: 'deleted' }, { status: { type: 'string', enums: ['active', 'inactive'] } }, '/test')
        })
      })
    })

    describe('invalid type', function() {
      it('invalid type in fieldsMap throws', function() {
        assert.throws(() => {
          getValues({ name: 'test' }, { name: 'foobar' }, '/test')
        })
      })
    })

    describe('multiple fields', function() {
      it('processes multiple fields correctly', function() {
        const result = getValues(
          { name: 'test', count: '5', data: '{"a":1}' },
          { name: 'string', count: 'integer', data: 'object' },
          '/test',
        )
        assert.strictEqual(result.name, 'test')
        assert.strictEqual(result.count, 5)
        assert.deepStrictEqual(result.data, { a: 1 })
      })
    })

    describe('empty fieldsMap', function() {
      it('returns empty object', function() {
        const result = getValues({ name: 'test' }, {}, '/test')
        assert.deepStrictEqual(result, {})
      })
    })
  })
})
