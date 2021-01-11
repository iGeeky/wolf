const util = require('../src/util/util')
const ArgsHelper = require('../src/util/args-util')
const OAuthUtil = require('../src/util/oauth-util')
const ArgsError = require('../src/errors/args-error')
const chai = require('chai')
const assert = chai.assert

describe('util', function() {
  describe('args-helper', function() {
    const args = {
      'string': 'value',
      'int': 1,
      'strint': '123',
      'float': 3.14,
      'strfloat': 5.67,
      'object': { hello: 'world', value: 3.23 },
      'strobject': JSON.stringify({ hello: 'world' }),
      'array': [1, 2, 3],
      'strarray': '1,2,3',
      'strjsonarray': '[1,2,3]',

    }
    const argsHelper = new ArgsHelper(args, '/test/url')
    it('getRequiredStringArg', function() {
      assert.throws(() => argsHelper.getRequiredStringArg('int'), ArgsError)
      assert.throws(() => argsHelper.getRequiredStringArg('not-exist'), ArgsError)
      assert.equal(argsHelper.getRequiredStringArg('string'), 'value')
    })

    it('getRequiredIntArg', function() {
      assert.throws(() => argsHelper.getRequiredIntArg('not-exist'), ArgsError)
      assert.throws(() => argsHelper.getRequiredIntArg('object'), ArgsError)
      assert.throws(() => argsHelper.getRequiredIntArg('string'), ArgsError)
      assert.equal(argsHelper.getRequiredIntArg('int'), 1)
      assert.equal(argsHelper.getRequiredIntArg('strint'), 123)
      assert.equal(argsHelper.getRequiredIntArg('float'), 3)
    })
    it('getRequiredFloatArg', function() {
      assert.throws(() => argsHelper.getRequiredFloatArg('not-exist'), ArgsError)
      assert.throws(() => argsHelper.getRequiredFloatArg('object'), ArgsError)
      assert.throws(() => argsHelper.getRequiredFloatArg('string'), ArgsError)
      assert.equal(argsHelper.getRequiredFloatArg('float'), 3.14)
      assert.equal(argsHelper.getRequiredFloatArg('strfloat'), 5.67)
      assert.equal(argsHelper.getRequiredFloatArg('int'), 1)
    })
    it('getObjectArg', function() {
      assert.equal(argsHelper.getObjectArg('not-exist'), undefined)
      assert.throws(() => argsHelper.getObjectArg('int'), ArgsError)
      assert.throws(() => argsHelper.getObjectArg('strfloat'), ArgsError)
      assert.equal(JSON.stringify(argsHelper.getObjectArg('object')), JSON.stringify({ hello: 'world', value: 3.23 }))
      assert.equal(JSON.stringify(argsHelper.getObjectArg('strobject')), JSON.stringify({ hello: 'world' }))
    })

    it('getRequiredObjectArg', function() {
      assert.throws(() => argsHelper.getRequiredObjectArg('not-exist'), ArgsError)
      assert.throws(() => argsHelper.getRequiredObjectArg('int'), ArgsError)
      assert.throws(() => argsHelper.getRequiredObjectArg('strfloat'), ArgsError)
      assert.equal(JSON.stringify(argsHelper.getRequiredObjectArg('object')), JSON.stringify({ hello: 'world', value: 3.23 }))
      assert.equal(JSON.stringify(argsHelper.getRequiredObjectArg('strobject')), JSON.stringify({ hello: 'world' }))
    })

    it('getArrayArg', function() {
      assert.equal(argsHelper.getArrayArg('not-exist'), undefined)
      assert.throws(() => argsHelper.getArrayArg('int'), ArgsError)
      assert.throws(() => argsHelper.getArrayArg('strfloat'), ArgsError)
      assert.equal(JSON.stringify(argsHelper.getArrayArg('array')), JSON.stringify([1, 2, 3]))
      assert.equal(JSON.stringify(argsHelper.getArrayArg('strarray')), JSON.stringify(['1', '2', '3']))
      assert.equal(JSON.stringify(argsHelper.getArrayArg('strjsonarray')), JSON.stringify([1, 2, 3]))
    })

    it('getRequiredArrayArg', function() {
      assert.throws(() => argsHelper.getRequiredArrayArg('not-exist'), ArgsError)
      assert.equal(JSON.stringify(argsHelper.getRequiredArrayArg('array')), JSON.stringify([1, 2, 3]))
      assert.equal(JSON.stringify(argsHelper.getRequiredArrayArg('strarray')), JSON.stringify(['1', '2', '3']))
      assert.equal(JSON.stringify(argsHelper.getRequiredArrayArg('strjsonarray')), JSON.stringify([1, 2, 3]))
    })

    // (field, value, enums)
    it('checkEnum', function() {
      assert.throws(() => argsHelper.checkEnum('key', 'value', ['my', 'test']), ArgsError)
    })

    it('normal', function() {
      assert.equal(argsHelper.getStringArg('string'), 'value')
      assert.equal(argsHelper.getIntArg('int'), 1)
    })
  })
  describe('oauth-util', function() {
    it('encode and decode', function() {
      const userID = util.unixtime()
      const clientID = 'test'
      const oauthUserID = OAuthUtil.OAuthUserID(userID, clientID)
      // console.log('>>>oauthUserID:', oauthUserID)
      const { error, userID: userID2, clientID: clientID2 } = OAuthUtil.parseOAuthUserID(oauthUserID)
      assert.ifError(error, error)
      assert.equal(userID, userID2)
      assert.equal(clientID, clientID2)
      // console.info('oauthUserID: %s, parsed userID: %d, clientID: %s', oauthUserID, userID2, clientID2)
    })
  })
})
