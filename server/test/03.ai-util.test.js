const assert = require('assert')

// sanitize-message (already exported)
const { stripThinkingFromMessage, isThinkingStreamEvent } = require('../src/ai/sanitize-message')
// generate-title (newly exported)
const { buildTitlePrompts, stripXmlLikeTaggedBlocks, assistantPlainText } = require('../src/ai/generate-title')
// system-prompt (already exported)
const { buildSystemPrompt, isChineseLocale } = require('../src/ai/system-prompt')
// tool-helper (already exported)
const { extractContext, injectUserContext, toToolResult } = require('../src/ai/tools/tool-helper')
// agent-factory (newly exported)
const { pruneMessages } = require('../src/ai/agent-factory')
// internal-caller (already exported as static method)
const InternalCaller = require('../src/ai/internal-caller')
// memory-extractor (newly exported)
const { extractText, serializeConversation, formatExistingMemories, buildExtractionPrompt } = require('../src/ai/memory-extractor')
// ai-chat (static methods on class)
const AiChat = require('../src/controllers/ai-chat')

describe('ai-util', function() {

  describe('sanitize-message', function() {
    describe('stripThinkingFromMessage', function() {
      it('null input', function() {
        assert.strictEqual(stripThinkingFromMessage(null), null)
      })

      it('undefined input', function() {
        assert.strictEqual(stripThinkingFromMessage(undefined), undefined)
      })

      it('non-object input', function() {
        assert.strictEqual(stripThinkingFromMessage('string'), 'string')
        assert.strictEqual(stripThinkingFromMessage(42), 42)
      })

      it('no content array returns shallow copy', function() {
        const msg = { role: 'user', text: 'hello' }
        const result = stripThinkingFromMessage(msg)
        assert.deepStrictEqual(result, msg)
        assert.notStrictEqual(result, msg) // shallow copy
      })

      it('filters thinking blocks', function() {
        const msg = {
          role: 'assistant',
          content: [
            { type: 'thinking', text: 'let me think' },
            { type: 'text', text: 'hello' },
          ],
        }
        const result = stripThinkingFromMessage(msg)
        assert.strictEqual(result.content.length, 1)
        assert.strictEqual(result.content[0].type, 'text')
        assert.strictEqual(result.content[0].text, 'hello')
      })

      it('only thinking blocks result in empty content', function() {
        const msg = {
          role: 'assistant',
          content: [
            { type: 'thinking', text: 'a' },
            { type: 'thinking', text: 'b' },
          ],
        }
        const result = stripThinkingFromMessage(msg)
        assert.strictEqual(result.content.length, 0)
      })

      it('mixed content preserves non-thinking', function() {
        const msg = {
          role: 'assistant',
          content: [
            { type: 'thinking', text: 'inner' },
            { type: 'text', text: 'reply' },
            { type: 'thinking', text: 'more' },
            { type: 'toolCall', name: 'foo' },
          ],
        }
        const result = stripThinkingFromMessage(msg)
        assert.strictEqual(result.content.length, 2)
        assert.strictEqual(result.content[0].type, 'text')
        assert.strictEqual(result.content[1].type, 'toolCall')
      })

      it('does not mutate original', function() {
        const content = [
          { type: 'thinking', text: 'x' },
          { type: 'text', text: 'y' },
        ]
        const msg = { role: 'assistant', content }
        const result = stripThinkingFromMessage(msg)
        assert.strictEqual(msg.content.length, 2)
        assert.strictEqual(result.content.length, 1)
      })
    })

    describe('isThinkingStreamEvent', function() {
      it('thinking_start returns true', function() {
        assert.strictEqual(isThinkingStreamEvent('thinking_start'), true)
      })

      it('thinking_delta returns true', function() {
        assert.strictEqual(isThinkingStreamEvent('thinking_delta'), true)
      })

      it('thinking_end returns true', function() {
        assert.strictEqual(isThinkingStreamEvent('thinking_end'), true)
      })

      it('random string returns false', function() {
        assert.strictEqual(isThinkingStreamEvent('text_delta'), false)
      })

      it('empty string returns false', function() {
        assert.strictEqual(isThinkingStreamEvent(''), false)
      })

      it('null returns false', function() {
        assert.strictEqual(isThinkingStreamEvent(null), false)
      })

      it('undefined returns false', function() {
        assert.strictEqual(isThinkingStreamEvent(undefined), false)
      })

      it('non-string returns false', function() {
        assert.strictEqual(isThinkingStreamEvent(42), false)
        assert.strictEqual(isThinkingStreamEvent(true), false)
      })
    })
  })

  describe('generate-title helpers', function() {
    describe('buildTitlePrompts', function() {
      it('zh-CN locale returns Chinese prompts', function() {
        const result = buildTitlePrompts('zh-CN', 'some conversation')
        assert.ok(result.system.includes('标题'))
        assert.ok(result.user.includes('some conversation'))
      })

      it('zh locale returns Chinese prompts', function() {
        const result = buildTitlePrompts('zh', 'test')
        assert.ok(result.system.includes('标题'))
      })

      it('en locale returns English prompts', function() {
        const result = buildTitlePrompts('en', 'test')
        assert.ok(result.system.includes('title'))
        assert.ok(!result.system.includes('标题'))
      })

      it('null locale returns English prompts', function() {
        const result = buildTitlePrompts(null, 'test')
        assert.ok(result.system.includes('title'))
      })

      it('undefined locale returns English prompts', function() {
        const result = buildTitlePrompts(undefined, 'test')
        assert.ok(result.system.includes('title'))
      })
    })

    describe('stripXmlLikeTaggedBlocks', function() {
      it('null returns empty string', function() {
        assert.strictEqual(stripXmlLikeTaggedBlocks(null), '')
      })

      it('empty string returns empty string', function() {
        assert.strictEqual(stripXmlLikeTaggedBlocks(''), '')
      })

      it('plain text unchanged', function() {
        assert.strictEqual(stripXmlLikeTaggedBlocks('hello world'), 'hello world')
      })

      it('removes think tags', function() {
        const input = 'before<think>inner thoughts</think>after'
        assert.strictEqual(stripXmlLikeTaggedBlocks(input), 'beforeafter')
      })

      it('removes nested tags', function() {
        const input = 'start<think>outer<think>inner</think></think>end'
        const result = stripXmlLikeTaggedBlocks(input)
        assert.strictEqual(result, 'startend')
      })

      it('removes self-closing tags', function() {
        const input = 'before<br/>after'
        assert.strictEqual(stripXmlLikeTaggedBlocks(input), 'beforeafter')
      })

      it('removes unclosed tag fragments', function() {
        const input = 'before<tag attr="x">after'
        assert.strictEqual(stripXmlLikeTaggedBlocks(input), 'beforeafter')
      })

      it('handles deep nesting', function() {
        const input = 'A<quote1>B<quote2>C</quote2>D</quote1>E'
        const result = stripXmlLikeTaggedBlocks(input)
        assert.strictEqual(result, 'AE')
      })
    })

    describe('assistantPlainText', function() {
      it('null msg returns empty', function() {
        assert.strictEqual(assistantPlainText(null), '')
      })

      it('undefined msg returns empty', function() {
        assert.strictEqual(assistantPlainText(undefined), '')
      })

      it('non-array content returns empty', function() {
        assert.strictEqual(assistantPlainText({ content: 'string' }), '')
      })

      it('text blocks joined', function() {
        const msg = {
          content: [
            { type: 'text', text: 'hello ' },
            { type: 'text', text: 'world' },
          ],
        }
        assert.strictEqual(assistantPlainText(msg), 'hello world')
      })

      it('thinking blocks skipped', function() {
        const msg = {
          content: [
            { type: 'thinking', text: 'hmm' },
            { type: 'text', text: 'reply' },
          ],
        }
        assert.strictEqual(assistantPlainText(msg), 'reply')
      })

      it('null blocks in array skipped', function() {
        const msg = {
          content: [null, { type: 'text', text: 'ok' }, null],
        }
        assert.strictEqual(assistantPlainText(msg), 'ok')
      })

      it('trims whitespace', function() {
        const msg = {
          content: [{ type: 'text', text: '  hello  ' }],
        }
        assert.strictEqual(assistantPlainText(msg), 'hello')
      })
    })
  })

  describe('system-prompt', function() {
    describe('isChineseLocale', function() {
      it('zh returns true', function() {
        assert.strictEqual(isChineseLocale('zh'), true)
      })

      it('zh-CN returns true', function() {
        assert.strictEqual(isChineseLocale('zh-CN'), true)
      })

      it('ZH (uppercase) returns true', function() {
        assert.strictEqual(isChineseLocale('ZH'), true)
      })

      it('zh-tw returns true', function() {
        assert.strictEqual(isChineseLocale('zh-tw'), true)
      })

      it('en returns false', function() {
        assert.strictEqual(isChineseLocale('en'), false)
      })

      it('en-US returns false', function() {
        assert.strictEqual(isChineseLocale('en-US'), false)
      })

      it('null returns false', function() {
        assert.strictEqual(isChineseLocale(null), false)
      })

      it('undefined returns false', function() {
        assert.strictEqual(isChineseLocale(undefined), false)
      })

      it('empty string returns false', function() {
        assert.strictEqual(isChineseLocale(''), false)
      })
    })

    describe('buildSystemPrompt', function() {
      it('Chinese locale with super user', function() {
        const userInfo = { username: 'root', nickname: 'Root', manager: 'super' }
        const prompt = buildSystemPrompt(userInfo, 'zh-CN')
        assert.ok(prompt.includes('超级管理员'))
        assert.ok(prompt.includes('root'))
        assert.ok(prompt.includes('全部权限'))
      })

      it('Chinese locale with admin user', function() {
        const userInfo = { username: 'admin', nickname: 'Admin', manager: 'admin' }
        const prompt = buildSystemPrompt(userInfo, 'zh-CN')
        assert.ok(prompt.includes('普通管理员'))
      })

      it('Chinese locale with regular user', function() {
        const userInfo = { username: 'user', nickname: 'User', manager: '' }
        const prompt = buildSystemPrompt(userInfo, 'zh-CN')
        assert.ok(prompt.includes('普通用户'))
      })

      it('English locale with super user', function() {
        const userInfo = { username: 'root', nickname: 'Root', manager: 'super' }
        const prompt = buildSystemPrompt(userInfo, 'en')
        assert.ok(prompt.includes('super administrator'))
        assert.ok(prompt.includes('root'))
      })

      it('English locale with admin user', function() {
        const userInfo = { username: 'admin', nickname: 'Admin', manager: 'admin' }
        const prompt = buildSystemPrompt(userInfo, 'en')
        assert.ok(prompt.includes('administrator'))
      })

      it('English locale with regular user', function() {
        const userInfo = { username: 'user', nickname: 'User', manager: '' }
        const prompt = buildSystemPrompt(userInfo, 'en')
        assert.ok(prompt.includes('regular user'))
      })

      it('null userInfo uses defaults', function() {
        const prompt = buildSystemPrompt(null, 'zh-CN')
        assert.ok(prompt.includes('unknown'))
        assert.ok(prompt.includes('普通用户'))
      })

      it('with memories', function() {
        const userInfo = { username: 'u', nickname: 'U', manager: '' }
        const memories = [
          { id: 1, category: 'preference', content: 'likes tables' },
          { id: 2, category: 'knowledge', content: 'app OA exists' },
        ]
        const prompt = buildSystemPrompt(userInfo, 'zh-CN', memories)
        assert.ok(prompt.includes('用户记忆'))
        assert.ok(prompt.includes('likes tables'))
        assert.ok(prompt.includes('app OA exists'))
      })

      it('English with memories', function() {
        const userInfo = { username: 'u', nickname: 'U', manager: '' }
        const memories = [{ id: 1, category: 'preference', content: 'likes dark mode' }]
        const prompt = buildSystemPrompt(userInfo, 'en', memories)
        assert.ok(prompt.includes('User Memory'))
        assert.ok(prompt.includes('likes dark mode'))
      })
    })
  })

  describe('tool-helper', function() {
    describe('extractContext', function() {
      it('extracts userInfo and clientIp', function() {
        const params = { _userInfo: { id: 1 }, _clientIp: '10.0.0.1', name: 'test' }
        const result = extractContext(params)
        assert.deepStrictEqual(result.userInfo, { id: 1 })
        assert.strictEqual(result.clientIp, '10.0.0.1')
        assert.strictEqual(result.cleanParams.name, 'test')
        assert.strictEqual(result.cleanParams._userInfo, undefined)
      })

      it('defaults clientIp to 127.0.0.1', function() {
        const params = { _userInfo: { id: 1 }, name: 'test' }
        const result = extractContext(params)
        assert.strictEqual(result.clientIp, '127.0.0.1')
      })

      it('preserves extra params in cleanParams', function() {
        const params = { _userInfo: {}, _clientIp: '1.1.1.1', a: 1, b: 2 }
        const result = extractContext(params)
        assert.strictEqual(result.cleanParams.a, 1)
        assert.strictEqual(result.cleanParams.b, 2)
      })
    })

    describe('injectUserContext', function() {
      it('wraps execute and injects context', function() {
        const originalExecute = (id, params) => params
        const toolDefs = [{ name: 'test-tool', execute: originalExecute }]
        const userInfo = { id: 1 }
        const wrapped = injectUserContext(toolDefs, userInfo, '10.0.0.1')

        assert.strictEqual(wrapped.length, 1)
        assert.strictEqual(wrapped[0].name, 'test-tool')
        // The wrapped execute should inject _userInfo and _clientIp
        const result = wrapped[0].execute('call-1', { foo: 'bar' })
        assert.deepStrictEqual(result._userInfo, { id: 1 })
        assert.strictEqual(result._clientIp, '10.0.0.1')
        assert.strictEqual(result.foo, 'bar')
      })

      it('returns new array', function() {
        const toolDefs = [{ name: 'a', execute: () => {} }]
        const result = injectUserContext(toolDefs, {}, '')
        assert.notStrictEqual(result, toolDefs)
      })

      it('does not mutate original toolDefs', function() {
        const origExec = () => 'orig'
        const toolDefs = [{ name: 'a', execute: origExec }]
        injectUserContext(toolDefs, {}, '')
        assert.strictEqual(toolDefs[0].execute, origExec)
      })
    })

    describe('toToolResult', function() {
      it('falsy result throws ERR_SERVER_ERROR', function() {
        assert.throws(() => toToolResult(null), { message: 'ERR_SERVER_ERROR' })
        assert.throws(() => toToolResult(undefined), { message: 'ERR_SERVER_ERROR' })
        assert.throws(() => toToolResult(false), { message: 'ERR_SERVER_ERROR' })
      })

      it('ok=false throws with reason', function() {
        assert.throws(() => toToolResult({ ok: false, reason: 'ERR_NOT_FOUND' }), { message: 'ERR_NOT_FOUND' })
      })

      it('ok=false throws with errmsg fallback', function() {
        assert.throws(() => toToolResult({ ok: false, errmsg: 'something failed' }), { message: 'something failed' })
      })

      it('ok=false with no reason/errmsg throws ERR_SERVER_ERROR', function() {
        assert.throws(() => toToolResult({ ok: false }), { message: 'ERR_SERVER_ERROR' })
      })

      it('ok=true returns formatted result', function() {
        const result = toToolResult({ ok: true, data: { id: 1 } })
        assert.deepStrictEqual(result.content, [{ type: 'text', text: '{"id":1}' }])
        assert.deepStrictEqual(result.details, { id: 1 })
      })

      it('ok=true with no data', function() {
        const result = toToolResult({ ok: true })
        // JSON.stringify(undefined) returns undefined (not a string)
        assert.strictEqual(result.content[0].text, JSON.stringify(undefined))
        assert.deepStrictEqual(result.details, {})
      })
    })
  })

  describe('agent-factory', function() {
    describe('pruneMessages', function() {
      it('returns all messages when within limit', function() {
        const msgs = [{ role: 'user' }, { role: 'assistant' }]
        const result = pruneMessages(msgs, 5)
        assert.deepStrictEqual(result, msgs)
      })

      it('trims to maxMessages', function() {
        const msgs = [
          { role: 'user', id: 1 },
          { role: 'assistant', id: 2 },
          { role: 'user', id: 3 },
          { role: 'assistant', id: 4 },
          { role: 'user', id: 5 },
        ]
        const result = pruneMessages(msgs, 3)
        assert.strictEqual(result.length, 3)
        assert.strictEqual(result[0].id, 3)
      })

      it('includes preceding assistant when first is toolResult', function() {
        const msgs = [
          { role: 'user', id: 1 },
          { role: 'assistant', id: 2 },
          { role: 'toolResult', id: 3 },
          { role: 'assistant', id: 4 },
          { role: 'user', id: 5 },
        ]
        // maxMessages=3, last 3: [toolResult#3, assistant#4, user#5]
        // toolResult#3 is first, so prepend assistant#2
        const result = pruneMessages(msgs, 3)
        assert.strictEqual(result.length, 4)
        assert.strictEqual(result[0].id, 2) // assistant prepended
        assert.strictEqual(result[1].id, 3) // toolResult
      })

      it('empty messages returns empty', function() {
        const result = pruneMessages([], 5)
        assert.deepStrictEqual(result, [])
      })

      it('exact limit returns all', function() {
        const msgs = [{ role: 'user' }, { role: 'assistant' }]
        const result = pruneMessages(msgs, 2)
        assert.deepStrictEqual(result, msgs)
      })
    })
  })

  describe('internal-caller', function() {
    describe('createMockCtx', function() {
      it('POST method puts args in body', function() {
        const ctx = InternalCaller.createMockCtx({
          method: 'POST', path: '/wolf/role', args: { name: 'test' },
          userInfo: { id: 1 },
        })
        assert.strictEqual(ctx.method, 'POST')
        assert.deepStrictEqual(ctx.request.body, { name: 'test' })
        assert.deepStrictEqual(ctx.query, {})
      })

      it('GET method puts args in query', function() {
        const ctx = InternalCaller.createMockCtx({
          method: 'GET', path: '/wolf/role/list', args: { appID: 'test' },
          userInfo: { id: 1 },
        })
        assert.deepStrictEqual(ctx.query, { appID: 'test' })
        assert.strictEqual(ctx.request.body, undefined)
      })

      it('PUT method puts args in body', function() {
        const ctx = InternalCaller.createMockCtx({
          method: 'PUT', path: '/wolf/role', args: { id: 1 },
          userInfo: { id: 1 },
        })
        assert.deepStrictEqual(ctx.request.body, { id: 1 })
      })

      it('DELETE method puts args in body', function() {
        const ctx = InternalCaller.createMockCtx({
          method: 'DELETE', path: '/wolf/role', args: { id: 1 },
          userInfo: { id: 1 },
        })
        assert.deepStrictEqual(ctx.request.body, { id: 1 })
      })

      it('PATCH method puts args in body', function() {
        const ctx = InternalCaller.createMockCtx({
          method: 'PATCH', path: '/wolf/role', args: { id: 1 },
          userInfo: { id: 1 },
        })
        assert.deepStrictEqual(ctx.request.body, { id: 1 })
      })

      it('default clientIp is 127.0.0.1', function() {
        const ctx = InternalCaller.createMockCtx({
          method: 'GET', path: '/wolf/test', args: {},
          userInfo: { id: 1 },
        })
        assert.strictEqual(ctx.clientIp, '127.0.0.1')
      })

      it('custom clientIp', function() {
        const ctx = InternalCaller.createMockCtx({
          method: 'GET', path: '/wolf/test', args: {},
          userInfo: { id: 1 }, clientIp: '10.0.0.1',
        })
        assert.strictEqual(ctx.clientIp, '10.0.0.1')
      })

      it('_isAiAgent flag is set', function() {
        const ctx = InternalCaller.createMockCtx({
          method: 'GET', path: '/wolf/test', args: {},
          userInfo: { id: 1 },
        })
        assert.strictEqual(ctx._isAiAgent, true)
      })

      it('initial status is 200', function() {
        const ctx = InternalCaller.createMockCtx({
          method: 'GET', path: '/wolf/test', args: {},
          userInfo: { id: 1 },
        })
        assert.strictEqual(ctx.status, 200)
      })
    })
  })

  describe('memory-extractor helpers', function() {
    describe('extractText', function() {
      it('string content returns as-is', function() {
        assert.strictEqual(extractText('hello'), 'hello')
      })

      it('array with text blocks joined', function() {
        const content = [
          { type: 'text', text: 'a' },
          { type: 'text', text: 'b' },
        ]
        assert.strictEqual(extractText(content), 'ab')
      })

      it('array filters non-text blocks', function() {
        const content = [
          { type: 'thinking', text: 'hmm' },
          { type: 'text', text: 'ok' },
        ]
        assert.strictEqual(extractText(content), 'ok')
      })

      it('empty array returns empty string', function() {
        assert.strictEqual(extractText([]), '')
      })

      it('null/undefined returns empty string', function() {
        assert.strictEqual(extractText(null), '')
        assert.strictEqual(extractText(undefined), '')
      })
    })

    describe('serializeConversation', function() {
      it('user and assistant messages', function() {
        const msgs = [
          { content: { role: 'user', content: 'hello' } },
          { content: { role: 'assistant', content: [{ type: 'text', text: 'hi there' }] } },
        ]
        const result = serializeConversation(msgs)
        assert.ok(result.includes('[User]: hello'))
        assert.ok(result.includes('[Assistant]: hi there'))
      })

      it('toolResult messages skipped', function() {
        const msgs = [
          { content: { role: 'user', content: 'test' } },
          { content: { role: 'toolResult', content: 'tool output' } },
        ]
        const result = serializeConversation(msgs)
        assert.ok(result.includes('[User]: test'))
        assert.ok(!result.includes('tool output'))
      })

      it('empty text skipped', function() {
        const msgs = [
          { content: { role: 'user', content: '' } },
        ]
        const result = serializeConversation(msgs)
        assert.strictEqual(result, '')
      })

      it('null agentMsg skipped', function() {
        const msgs = [{ content: null }]
        const result = serializeConversation(msgs)
        assert.strictEqual(result, '')
      })

      it('agentMsg without role skipped', function() {
        const msgs = [{ content: { content: 'no role' } }]
        const result = serializeConversation(msgs)
        assert.strictEqual(result, '')
      })

      it('only user message', function() {
        const msgs = [
          { content: { role: 'user', content: 'question' } },
        ]
        const result = serializeConversation(msgs)
        assert.strictEqual(result, '[User]: question')
      })
    })

    describe('formatExistingMemories', function() {
      it('null returns placeholder', function() {
        assert.strictEqual(formatExistingMemories(null), '(no existing memories)')
      })

      it('empty array returns placeholder', function() {
        assert.strictEqual(formatExistingMemories([]), '(no existing memories)')
      })

      it('formats memories', function() {
        const memories = [
          { id: 1, category: 'preference', content: 'likes dark mode' },
          { id: 2, category: 'knowledge', content: 'OA app exists' },
        ]
        const result = formatExistingMemories(memories)
        assert.ok(result.includes('[id=1, category=preference]: likes dark mode'))
        assert.ok(result.includes('[id=2, category=knowledge]: OA app exists'))
      })
    })

    describe('buildExtractionPrompt', function() {
      it('includes conversation and memories', function() {
        const result = buildExtractionPrompt('user: hello\nassistant: hi', 'existing memories')
        assert.ok(result.includes('user: hello'))
        assert.ok(result.includes('existing memories'))
      })

      it('includes extraction task instructions', function() {
        const result = buildExtractionPrompt('conv', 'mem')
        assert.ok(result.includes('Extraction Task'))
        assert.ok(result.includes('preference'))
        assert.ok(result.includes('knowledge'))
      })
    })
  })

  describe('ai-chat static helpers', function() {
    describe('parseClientLocale', function() {
      it('returns first accept-language value', function() {
        const ctx = { request: { headers: { 'accept-language': 'en-US,en;q=0.9' } } }
        assert.strictEqual(AiChat.parseClientLocale(ctx), 'en-US')
      })

      it('trims whitespace', function() {
        const ctx = { request: { headers: { 'accept-language': ' zh-CN , zh;q=0.8' } } }
        assert.strictEqual(AiChat.parseClientLocale(ctx), 'zh-CN')
      })

      it('missing header returns zh-CN default', function() {
        const ctx = { request: { headers: {} } }
        assert.strictEqual(AiChat.parseClientLocale(ctx), 'zh-CN')
      })

      it('Accept-Language (capitalized) header works', function() {
        const ctx = { request: { headers: { 'Accept-Language': 'ja' } } }
        assert.strictEqual(AiChat.parseClientLocale(ctx), 'ja')
      })

      it('non-string header returns default', function() {
        const ctx = { request: { headers: { 'accept-language': 123 } } }
        assert.strictEqual(AiChat.parseClientLocale(ctx), 'zh-CN')
      })
    })

    describe('extractTextFromStoredMessage', function() {
      it('falsy input returns empty', function() {
        assert.strictEqual(AiChat.extractTextFromStoredMessage(null), '')
        assert.strictEqual(AiChat.extractTextFromStoredMessage(undefined), '')
        assert.strictEqual(AiChat.extractTextFromStoredMessage(''), '')
      })

      it('plain string returns as-is', function() {
        assert.strictEqual(AiChat.extractTextFromStoredMessage('hello'), 'hello')
      })

      it('array content with text blocks', function() {
        const raw = {
          content: [
            { type: 'text', text: 'line1' },
            { type: 'text', text: 'line2' },
          ],
        }
        assert.strictEqual(AiChat.extractTextFromStoredMessage(raw), 'line1\nline2')
      })

      it('filters non-text blocks', function() {
        const raw = {
          content: [
            { type: 'thinking', text: 'hmm' },
            { type: 'text', text: 'ok' },
          ],
        }
        assert.strictEqual(AiChat.extractTextFromStoredMessage(raw), 'ok')
      })

      it('empty array returns empty', function() {
        assert.strictEqual(AiChat.extractTextFromStoredMessage({ content: [] }), '')
      })

      it('non-array content returns empty', function() {
        assert.strictEqual(AiChat.extractTextFromStoredMessage({ content: 'string' }), '')
      })
    })
  })
})
