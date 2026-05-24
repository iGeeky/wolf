const assert = require('assert')
const Chksum = require('../src/util/chksum')

describe('chksum', function() {

  describe('constructor', function() {
    it('default length defaults to 3 when < 1', function() {
      const c = new Chksum('magic', 0)
      assert.strictEqual(c.length, 3)
    })

    it('negative length defaults to 3', function() {
      const c = new Chksum('magic', -1)
      assert.strictEqual(c.length, 3)
    })

    it('valid length preserved', function() {
      const c = new Chksum('magic', 5)
      assert.strictEqual(c.length, 5)
    })

    it('default digest is base64', function() {
      const c = new Chksum('magic', 3)
      assert.strictEqual(c.digest, 'base64')
    })

    it('custom digest preserved', function() {
      const c = new Chksum('magic', 3, 'hex')
      assert.strictEqual(c.digest, 'hex')
    })

    it('magic string preserved', function() {
      const c = new Chksum('my-secret', 3)
      assert.strictEqual(c.magic, 'my-secret')
    })
  })

  describe('calcCksum', function() {
    it('base64 encoding replaces special chars', function() {
      const c = new Chksum('test', 20, 'base64')
      const sum = c.calcCksum('hello')
      // base64 URL-safe: no +, no /, no =
      assert.ok(!sum.includes('+'))
      assert.ok(!sum.includes('/'))
      assert.ok(!sum.includes('='))
    })

    it('hex encoding produces hex chars', function() {
      const c = new Chksum('test', 10, 'hex')
      const sum = c.calcCksum('hello')
      assert.ok(/^[0-9a-f]+$/i.test(sum))
    })

    it('different data produces different checksums', function() {
      const c = new Chksum('test', 10)
      assert.notStrictEqual(c.calcCksum('hello'), c.calcCksum('world'))
    })

    it('different magic produces different checksums', function() {
      const c1 = new Chksum('magic1', 10)
      const c2 = new Chksum('magic2', 10)
      assert.notStrictEqual(c1.calcCksum('hello'), c2.calcCksum('hello'))
    })

    it('respects length parameter', function() {
      const c = new Chksum('test', 5)
      assert.strictEqual(c.calcCksum('hello').length, 5)
    })
  })

  describe('add + check round-trip', function() {
    it('check succeeds on valid data', function() {
      const c = new Chksum('test', 4)
      const data = 'hello-world'
      const withCksum = c.add(data)
      const result = c.check(withCksum)
      assert.strictEqual(result.output, data)
      assert.strictEqual(result.error, undefined)
    })

    it('check fails on tampered data', function() {
      const c = new Chksum('test', 4)
      const withCksum = c.add('hello')
      const tampered = withCksum.slice(0, -1) + 'X'
      const result = c.check(tampered)
      assert.strictEqual(result.error, 'ERR_DATA_INVALID')
    })

    it('check fails on too-short data', function() {
      const c = new Chksum('test', 4)
      const result = c.check('ab') // length <= length + 1 = 5
      assert.strictEqual(result.error, 'ERR_DATA_INVALID')
    })

    it('round-trip with hex digest', function() {
      const c = new Chksum('secret', 6, 'hex')
      const data = 'some-data-to-protect'
      const withCksum = c.add(data)
      const result = c.check(withCksum)
      assert.strictEqual(result.output, data)
    })

    it('round-trip with different lengths', function() {
      for (const len of [1, 3, 5, 10]) {
        const c = new Chksum('m', len)
        const data = 'test-data-' + len
        const result = c.check(c.add(data))
        assert.strictEqual(result.output, data, `failed for length ${len}`)
      }
    })
  })

  describe('mustCheck', function() {
    it('returns output on success', function() {
      const c = new Chksum('test', 4)
      const data = 'important'
      const output = c.mustCheck(c.add(data))
      assert.strictEqual(output, data)
    })

    it('throws on error', function() {
      const c = new Chksum('test', 4)
      assert.throws(() => c.mustCheck('short'), { message: 'ERR_DATA_INVALID' })
    })

    it('throws on tampered data', function() {
      const c = new Chksum('test', 4)
      const tampered = c.add('hello').slice(0, -1) + 'Z'
      assert.throws(() => c.mustCheck(tampered), { message: 'ERR_DATA_INVALID' })
    })
  })
})
