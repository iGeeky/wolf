const assert = require('assert')
const mocha = require('./util/mocha')
const util = require('./util/util')

// Only run when RUN_AI_TESTS is set (costs LLM tokens)
const describe_ = process.env.RUN_AI_TESTS ? describe : describe.skip

const headers = util.adminHeaders()

describe_('ai-chat', function() {
  this.timeout(60000)

  let sessionId = null

  describe('sessions', function() {
    it('list sessions (empty or existing)', async function() {
      const url = '/wolf/ai-chat/sessions'
      const schema = util.okSchema({
        type: 'object',
        properties: {
          sessions: { type: 'array' },
          total: { type: 'integer' },
        },
        required: ['sessions', 'total'],
      })
      await mocha.get({ url, headers, schema })
    })

    it('create session', async function() {
      const url = '/wolf/ai-chat/session'
      const schema = util.okSchema({
        type: 'object',
        properties: {
          session: { type: 'object' },
        },
        required: ['session'],
      })
      const res = await mocha.post({ url, headers, schema })
      sessionId = res.body.data.session.id
      assert.ok(sessionId)
    })

    it('get messages for session', async function() {
      if (!sessionId) { this.skip() }
      const url = '/wolf/ai-chat/messages'
      const args = { sessionId }
      const schema = util.okSchema({
        type: 'object',
        properties: {
          messages: { type: 'array' },
          total: { type: 'integer' },
        },
        required: ['messages', 'total'],
      })
      await mocha.get({ url, headers, args, schema })
    })

    it('rename session', async function() {
      if (!sessionId) { this.skip() }
      const url = '/wolf/ai-chat/session/rename'
      const body = { id: sessionId, title: 'Test Session Title' }
      const schema = util.okSchema({
        type: 'object',
        properties: {
          count: { type: 'integer' },
        },
        required: ['count'],
      })
      await mocha.put({ url, headers, body, schema })
    })

    it('rename session failed, missing id', async function() {
      const url = '/wolf/ai-chat/session/rename'
      const body = { title: 'Test' }
      const schema = util.failSchema('ERR_ARGS_ERROR')
      await mocha.put({ url, headers, body, status: 400, schema })
    })

    it('rename session failed, missing title', async function() {
      const url = '/wolf/ai-chat/session/rename'
      const body = { id: sessionId }
      const schema = util.failSchema('ERR_ARGS_ERROR')
      await mocha.put({ url, headers, body, status: 400, schema })
    })
  })

  describe('chat', function() {
    it('chat post failed, empty message', async function() {
      const url = '/wolf/ai-chat/chat-post'
      const body = { message: '', sessionId }
      const schema = util.failSchema('ERR_ARGS_ERROR')
      await mocha.post({ url, headers, body, status: 400, schema })
    })

    it('chat post failed, missing message', async function() {
      const url = '/wolf/ai-chat/chat-post'
      const body = { sessionId }
      const schema = util.failSchema('ERR_ARGS_ERROR')
      await mocha.post({ url, headers, body, status: 400, schema })
    })
  })

  describe('memories', function() {
    let memoryId = null

    it('list memories', async function() {
      const url = '/wolf/ai-chat/memories'
      const schema = util.okSchema({
        type: 'object',
        properties: {
          memories: { type: 'array' },
          total: { type: 'integer' },
        },
        required: ['memories', 'total'],
      })
      await mocha.get({ url, headers, schema })
    })

    it('create memory', async function() {
      const url = '/wolf/ai-chat/memory'
      const body = { category: 'preference', content: 'test memory from integration test' }
      const schema = util.okSchema({
        type: 'object',
        properties: {
          memory: { type: 'object' },
        },
        required: ['memory'],
      })
      const res = await mocha.post({ url, headers, body, schema })
      memoryId = res.body.data.memory.id
      assert.ok(memoryId)
    })

    it('create memory failed, invalid category', async function() {
      const url = '/wolf/ai-chat/memory'
      const body = { category: 'invalid_cat', content: 'test' }
      const schema = util.failSchema('ERR_ARGS_ERROR')
      await mocha.post({ url, headers, body, status: 400, schema })
    })

    it('create memory failed, empty content', async function() {
      const url = '/wolf/ai-chat/memory'
      const body = { category: 'preference', content: '' }
      const schema = util.failSchema('ERR_ARGS_ERROR')
      await mocha.post({ url, headers, body, status: 400, schema })
    })

    it('update memory', async function() {
      if (!memoryId) { this.skip() }
      const url = '/wolf/ai-chat/memory'
      const body = { id: memoryId, category: 'knowledge', content: 'updated memory content' }
      const schema = util.okSchema({
        type: 'object',
        properties: {
          count: { type: 'integer' },
        },
        required: ['count'],
      })
      await mocha.put({ url, headers, body, schema })
    })

    it('update memory failed, missing id', async function() {
      const url = '/wolf/ai-chat/memory'
      const body = { category: 'knowledge', content: 'test' }
      const schema = util.failSchema('ERR_ARGS_ERROR')
      await mocha.put({ url, headers, body, status: 400, schema })
    })

    it('delete memory', async function() {
      if (!memoryId) { this.skip() }
      const url = '/wolf/ai-chat/memory'
      const body = { id: memoryId }
      const schema = util.okSchema({
        type: 'object',
        properties: {
          count: { type: 'integer' },
        },
        required: ['count'],
      })
      await mocha.delete({ url, headers, body, schema })
    })

    it('delete memory failed, missing id', async function() {
      const url = '/wolf/ai-chat/memory'
      const body = {}
      const schema = util.failSchema('ERR_ARGS_ERROR')
      await mocha.delete({ url, headers, body, status: 400, schema })
    })
  })

  // Cleanup
  after(async function() {
    if (sessionId) {
      const url = '/wolf/ai-chat/session'
      const body = { id: sessionId }
      await mocha.delete({ url, headers, body }).catch(() => {})
    }
  })
})
