/**
 * AI Chat 控制器
 *
 * 提供以下接口：
 * - POST /wolf/ai-chat/chat              - SSE 流式对话
 * - GET  /wolf/ai-chat/sessions          - 获取当前用户会话列表
 * - POST /wolf/ai-chat/createSession     - 创建新会话（并触发老会话记忆提取）
 * - DELETE /wolf/ai-chat/deleteSession   - 删除会话
 * - PUT /wolf/ai-chat/renameSession      - 重命名会话
 * - GET /wolf/ai-chat/messages           - 获取会话历史消息
 * - POST /wolf/ai-chat/autoRenameSession - AI 根据对话生成标题
 * - GET  /wolf/ai-chat/memories          - 获取当前用户记忆列表
 * - POST /wolf/ai-chat/memory            - 手动添加一条记忆
 * - PUT  /wolf/ai-chat/memory/:id        - 编辑一条记忆
 * - DELETE /wolf/ai-chat/memory/:id      - 删除一条记忆
 */

const BasicService = require('./basic-service')
const AiChatSessionModel = require('../model/ai-chat-session')
const AiChatMessageModel = require('../model/ai-chat-message')
const AiUserMemoryModel = require('../model/ai-user-memory')
const util = require('../util/util')
const aiConfig = require('../ai/ai-config')
const agentFactory = require('../ai/agent-factory')
const generateTitleModule = require('../ai/generate-title')
const memoryExtractor = require('../ai/memory-extractor')
const {
  stripThinkingFromMessage,
  isThinkingStreamEvent,
} = require('../ai/sanitize-message')
const log4js = require('../util/log4js')

/**
 * 将数据库中的 ai_chat_message 记录转换为 pi-mono Agent 的 AgentMessage 格式
 */
function dbMsgToAgentMsg(dbMsg) {
  const content = dbMsg.content
  // content 已经存储为 AgentMessage 格式
  return content
}

/**
 * 写入 SSE 事件
 */
function sseWrite(res, data) {
  try {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  } catch (err) {
    // ignore write errors (client disconnected)
  }
}

/**
 * @param {import('koa').Context} ctx
 * @returns {string}
 */
function parseClientLocale(ctx) {
  const h = ctx.request.headers['accept-language'] || ctx.request.headers['Accept-Language']
  if (h && typeof h === 'string') {
    const first = h.split(',')[0].trim()
    if (first) return first
  }
  return 'zh-CN'
}

/**
 * @param {object} raw - ai_chat_message.content JSON
 * @returns {string}
 */
function extractTextFromStoredMessage(raw) {
  if (!raw) return ''
  if (typeof raw === 'string') return raw
  const blocks = raw.content
  if (Array.isArray(blocks)) {
    return blocks
      .filter((c) => c && c.type === 'text')
      .map((c) => c.text || '')
      .join('\n')
      .trim()
  }
  return ''
}

class AiChat extends BasicService {
  constructor(ctx) {
    super(ctx, AiChatSessionModel)
  }

  async access(bizMethod) {
    // ai-chat 接口要求登录（token-check 中间件已保证），此处只做额外检查
    if (!this.ctx.userInfo) {
      this.fail(401, 'ERR_TOKEN_INVALID')
      throw new Error('ERR_TOKEN_INVALID')
    }
  }

  /**
   * SSE 流式对话
   * POST /wolf/ai-chat/chat
   * body: { sessionId?, message }
   */
  async chatPost() {
    this.checkMethod('POST')

    if (!aiConfig.isAiAvailable()) {
      this.fail2(
        503,
        'AI_NOT_CONFIGURED',
        '请联系管理员配置 AI 服务（需设置 AI_API_KEY 或在 conf/config.js 的 ai.apiKey 中配置密钥）。'
      )
      return
    }

    const userInfo = this.ctx.userInfo
    const clientIp = this.ctx.clientIp
    const body = this.ctx.request.body || {}
    const message = body.message
    const sessionId = body.sessionId ? parseInt(body.sessionId) : null
    const locale = parseClientLocale(this.ctx)

    if (!message || typeof message !== 'string' || !message.trim()) {
      this.fail(400, 'ERR_MESSAGE_REQUIRED')
      return
    }

    // 设置 SSE 响应头，阻止 Koa 默认响应处理
    this.ctx.respond = false
    const res = this.ctx.res
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.statusCode = 200

    let session = null
    let isNewSession = false

    try {
      // 获取或创建会话
      if (sessionId) {
        session = await AiChatSessionModel.findOne({
          where: { id: sessionId, userID: userInfo.id },
        })
        if (!session) {
          sseWrite(res, { type: 'error', error: 'SESSION_NOT_FOUND' })
          res.end()
          return
        }
      } else {
        // 自动创建新会话，标题取消息前 20 字
        const title = message.slice(0, 20) + (message.length > 20 ? '...' : '')
        session = await AiChatSessionModel.create({
          userID: userInfo.id,
          title,
          appID: body.appID || null,
          status: 1,
          createTime: util.unixtime(),
          updateTime: util.unixtime(),
        })
        isNewSession = true
        sseWrite(res, { type: 'session_created', sessionId: parseInt(session.id) })
      }

      // 新建会话时，异步触发老会话的记忆提取（不阻塞当前请求）
      if (isNewSession && aiConfig.isAiAvailable()) {
        memoryExtractor.triggerMemoryExtraction(
          userInfo.id,
          AiChatSessionModel,
          AiChatMessageModel,
          AiUserMemoryModel,
          parseInt(session.id),
        ).catch(e => log4js.error('[ai-chat] memory extraction error: %s', e.message))
      }

      // 加载历史消息，还原为 AgentMessage[]
      const dbMessages = await AiChatMessageModel.findAll({
        where: { sessionID: session.id },
        order: [['id', 'ASC']],
      })
      const historyMessages = dbMessages.map(dbMsg => dbMsgToAgentMsg(dbMsg))

      // 加载用户活跃记忆，注入 system prompt
      const memories = await AiUserMemoryModel.findAll({
        where: { userID: userInfo.id, status: 1 },
        order: [['id', 'ASC']],
      })

      // 创建 Agent 实例（含历史消息 + 用户记忆）
      const agent = await agentFactory.createAgent({ userInfo, clientIp, messages: historyMessages, locale, memories })

      // 收集本轮新消息（用于持久化）
      const newMessages = []
      let totalTokenUsage = { input: 0, output: 0, cost: 0 }

      // 订阅 Agent 事件
      const unsubscribe = agent.subscribe((event) => {
        switch (event.type) {
          case 'agent_start':
            sseWrite(res, { type: 'agent_start' })
            break

          case 'message_start': {
            const msg = event.message
            if (!msg) break
            const safe =
              msg.role === 'assistant'
                ? stripThinkingFromMessage(msg)
                : msg
            sseWrite(res, { type: 'message_start', message: safe })
            break
          }

          case 'message_update': {
            const ev = event.assistantMessageEvent
            if (!ev || isThinkingStreamEvent(ev.type)) {
              break
            }
            const msg = event.message
            if (!msg) break
            const safe =
              msg.role === 'assistant'
                ? stripThinkingFromMessage(msg)
                : msg
            sseWrite(res, { type: 'message_update', message: safe, event: ev })
            break
          }

          case 'message_end': {
            const raw = event.message
            if (!raw) break
            const msg =
              raw.role === 'assistant'
                ? stripThinkingFromMessage(raw)
                : raw
            sseWrite(res, { type: 'message_end', message: msg })
            // 收集需要持久化的消息
            if (msg.role === 'assistant') {
              newMessages.push(msg)
              // 统计 token
              if (msg.usage) {
                totalTokenUsage.input += msg.usage.inputTokens || 0
                totalTokenUsage.output += msg.usage.outputTokens || 0
                totalTokenUsage.cost += (msg.usage.cost && msg.usage.cost.total) || 0
              }
            }
            break
          }

          case 'tool_execution_start':
            sseWrite(res, {
              type: 'tool_execution_start',
              toolCallId: event.toolCallId,
              toolName: event.toolName,
              args: event.args,
            })
            break

          case 'tool_execution_end':
            sseWrite(res, {
              type: 'tool_execution_end',
              toolCallId: event.toolCallId,
              toolName: event.toolName,
              isError: event.isError,
            })
            break

          case 'turn_end':
            // toolResult 消息持久化
            if (event.toolResults && event.toolResults.length > 0) {
              for (const tr of event.toolResults) {
                newMessages.push(tr)
              }
            }
            break

          case 'agent_end':
            break
        }
      })

      // 发送用户消息（将触发 Agent 处理）
      await agent.prompt(message)
      unsubscribe()

      // 如果 agent 未产生任何 assistant 回复消息，说明模型配置有误或 API 调用失败但未抛异常
      const hasAssistantReply = newMessages.some(m => m.role === 'assistant')
      if (!hasAssistantReply) {
        log4js.warn('[ai-chat] agent.prompt() completed but produced no assistant messages. Check model/API key config.')
        sseWrite(res, {
          type: 'error',
          error: 'AI_EMPTY_RESPONSE: AI 未返回任何内容，请联系管理员检查模型配置（模型名称、API Key、baseUrl）是否正确。',
        })
        res.end()
        return
      }

      // 持久化用户输入消息
      const userMsg = { role: 'user', content: [{ type: 'text', text: message }] }
      await AiChatMessageModel.create({
        sessionID: session.id,
        role: 'user',
        content: userMsg,
        tokenUsage: null,
        createTime: util.unixtime(),
      })

      // 持久化 agent 回复的消息（assistant + toolResult）
      for (const msg of newMessages) {
        const role = msg.role || 'assistant'
        const tokenUsage = (msg.usage && totalTokenUsage.input > 0)
          ? { input: msg.usage.inputTokens, output: msg.usage.outputTokens, cost: totalTokenUsage.cost }
          : null
        await AiChatMessageModel.create({
          sessionID: session.id,
          role,
          content: msg,
          tokenUsage,
          createTime: util.unixtime(),
        })
      }

      // 更新会话 updateTime
      await AiChatSessionModel.update(
        { updateTime: util.unixtime() },
        { where: { id: session.id } }
      )

      // 发送完成信号
      sseWrite(res, { type: 'done', tokenUsage: totalTokenUsage })
    } catch (err) {
      log4js.error('[ai-chat] chatPost error: %s', err.message, err.stack)
      sseWrite(res, { type: 'error', error: err.message || 'ERR_AGENT_FAILED' })
    } finally {
      res.end()
    }
  }

  /**
   * 获取当前用户的会话列表
   * GET /wolf/ai-chat/sessions
   */
  async sessions() {
    this.checkMethod('GET')
    const userInfo = this.ctx.userInfo
    const page = this.getIntArg('page', 1)
    const limit = this.getIntArg('limit', 20)
    const offset = (page - 1) * limit

    const sessions = await AiChatSessionModel.findAll({
      where: { userID: userInfo.id, status: 1 },
      order: [['update_time', 'DESC']],
      limit,
      offset,
    })
    const total = await AiChatSessionModel.count({
      where: { userID: userInfo.id, status: 1 },
    })
    this.success({ sessions: sessions.map(s => s.toJSON()), total })
  }

  /**
   * 创建新会话
   * POST /wolf/ai-chat/createSession
   * body: { title?, appID? }
   */
  async createSession() {
    this.checkMethod('POST')
    const userInfo = this.ctx.userInfo
    const body = this.ctx.request.body || {}
    const title = body.title || '新对话'
    const appID = body.appID || null

    const session = await AiChatSessionModel.create({
      userID: userInfo.id,
      title,
      appID,
      status: 1,
      createTime: util.unixtime(),
      updateTime: util.unixtime(),
    })

    // 异步触发老会话的记忆提取
    if (aiConfig.isAiAvailable()) {
      memoryExtractor.triggerMemoryExtraction(
        userInfo.id,
        AiChatSessionModel,
        AiChatMessageModel,
        AiUserMemoryModel,
        parseInt(session.id),
      ).catch(e => log4js.error('[ai-chat] memory extraction error: %s', e.message))
    }

    this.success({ session: session.toJSON() })
  }

  /**
   * 删除会话（软删除，设置 status=0）
   * DELETE /wolf/ai-chat/deleteSession
   * body: { id }
   */
  async deleteSession() {
    this.checkMethod('DELETE')
    const userInfo = this.ctx.userInfo
    const body = this.ctx.request.body || {}
    const id = parseInt(body.id)

    if (!id) {
      this.fail(400, 'ERR_SESSION_ID_REQUIRED')
      return
    }

    const [count] = await AiChatSessionModel.update(
      { status: 0 },
      { where: { id, userID: userInfo.id } }
    )
    if (count === 0) {
      this.fail(404, 'ERR_SESSION_NOT_FOUND')
      return
    }
    this.success({ count })
  }

  /**
   * 重命名会话
   * PUT /wolf/ai-chat/renameSession
   * body: { id, title }
   */
  async renameSession() {
    this.checkMethod('PUT')
    const userInfo = this.ctx.userInfo
    const body = this.ctx.request.body || {}
    const id = parseInt(body.id)
    const title = body.title

    if (!id || !title) {
      this.fail(400, 'ERR_ARGS_INVALID')
      return
    }

    const [count] = await AiChatSessionModel.update(
      { title, updateTime: util.unixtime() },
      { where: { id, userID: userInfo.id } }
    )
    if (count === 0) {
      this.fail(404, 'ERR_SESSION_NOT_FOUND')
      return
    }
    this.success({ count })
  }

  /**
   * 获取会话的历史消息
   * GET /wolf/ai-chat/messages
   * query: { sessionId, page?, limit? }
   */
  async messages() {
    this.checkMethod('GET')
    const userInfo = this.ctx.userInfo
    const sessionId = this.getRequiredIntArg('sessionId')

    // 确认会话属于当前用户
    const session = await AiChatSessionModel.findOne({
      where: { id: sessionId, userID: userInfo.id },
    })
    if (!session) {
      this.fail(404, 'ERR_SESSION_NOT_FOUND')
      return
    }

    const page = this.getIntArg('page', 1)
    const limit = this.getIntArg('limit', 50)
    const offset = (page - 1) * limit

    const msgs = await AiChatMessageModel.findAll({
      where: { sessionID: sessionId },
      order: [['id', 'ASC']],
      limit,
      offset,
    })
    const total = await AiChatMessageModel.count({ where: { sessionID: sessionId } })
    this.success({ messages: msgs.map(m => m.toJSON()), total })
  }

  /**
   * AI 根据已有对话生成会话标题并更新（不产生新会话、不写入聊天消息）
   * POST /wolf/ai-chat/autoRenameSession
   * body: { id } 或 { sessionId }
   */
  async autoRenameSession() {
    this.checkMethod('POST')
    if (!aiConfig.isAiAvailable()) {
      this.fail2(
        503,
        'AI_NOT_CONFIGURED',
        '请联系管理员配置 AI 服务（需设置 AI_API_KEY 或在 conf/config.js 的 ai.apiKey 中配置密钥）。',
      )
      return
    }

    const userInfo = this.ctx.userInfo
    const body = this.ctx.request.body || {}
    const sessionId = parseInt(body.id || body.sessionId, 10)
    if (!sessionId) {
      this.fail(400, 'ERR_SESSION_ID_REQUIRED')
      return
    }

    const session = await AiChatSessionModel.findOne({
      where: { id: sessionId, userID: userInfo.id, status: 1 },
    })
    if (!session) {
      this.fail(404, 'ERR_SESSION_NOT_FOUND')
      return
    }

    const dbMessages = await AiChatMessageModel.findAll({
      where: { sessionID: sessionId },
      order: [['id', 'ASC']],
      limit: 12,
    })

    const lines = []
    for (const row of dbMessages) {
      const role = row.role
      if (role !== 'user' && role !== 'assistant') continue
      const text = extractTextFromStoredMessage(row.content)
      if (!text) continue
      lines.push(`${role === 'user' ? 'User' : 'Assistant'}: ${text}`)
    }

    const transcript = lines.join('\n\n')
    if (!transcript.trim()) {
      this.fail(400, 'ERR_NO_MESSAGES_FOR_TITLE')
      return
    }

    const locale = parseClientLocale(this.ctx)

    try {
      const title = await generateTitleModule.generateSessionTitle(transcript, locale)
      if (!title) {
        this.fail(500, 'ERR_TITLE_GENERATION_EMPTY')
        return
      }
      await AiChatSessionModel.update(
        { title, updateTime: util.unixtime() },
        { where: { id: sessionId, userID: userInfo.id } },
      )
      this.success({ title })
    } catch (err) {
      log4js.error('[ai-chat] autoRenameSession error: %s', err.message, err.stack)
      this.fail(500, 'ERR_TITLE_GENERATION_FAILED')
    }
  }

  /**
   * 获取当前用户的记忆列表
   * GET /wolf/ai-chat/memories
   * query: { category?, page?, limit? }
   */
  async memories() {
    this.checkMethod('GET')
    const userInfo = this.ctx.userInfo
    const category = this.getArg('category') || null
    const page = this.getIntArg('page', 1)
    const limit = this.getIntArg('limit', 50)
    const offset = (page - 1) * limit

    const where = { userID: userInfo.id, status: 1 }
    if (category) where.category = category

    const rows = await AiUserMemoryModel.findAll({
      where,
      order: [['id', 'ASC']],
      limit,
      offset,
    })
    const total = await AiUserMemoryModel.count({ where })

    // 附加来源会话标题
    const sessionIds = [...new Set(rows.map(r => r.sessionID).filter(Boolean))]
    const sessionsMap = {}
    if (sessionIds.length > 0) {
      const sessions = await AiChatSessionModel.findAll({
        where: { id: sessionIds },
      })
      for (const s of sessions) {
        sessionsMap[parseInt(s.id)] = s.title
      }
    }

    const data = rows.map(r => ({
      ...r.toJSON(),
      sessionTitle: r.sessionID ? (sessionsMap[parseInt(r.sessionID)] || null) : null,
    }))

    this.success({ memories: data, total })
  }

  /**
   * 手动添加一条记忆
   * POST /wolf/ai-chat/memory
   * body: { category, content }
   */
  async memoryPost() {
    const userInfo = this.ctx.userInfo
    const body = this.ctx.request.body || {}
    const { category, content } = body

    if (!category || !memoryExtractor.MEMORY_CATEGORIES.includes(category)) {
      this.fail(400, 'ERR_INVALID_CATEGORY')
      return
    }
    if (!content || typeof content !== 'string' || !content.trim()) {
      this.fail(400, 'ERR_CONTENT_REQUIRED')
      return
    }

    const now = util.unixtime()
    const memory = await AiUserMemoryModel.create({
      userID: userInfo.id,
      sessionID: null,
      category,
      content: content.trim(),
      source: 'manual',
      status: 1,
      createTime: now,
      updateTime: now,
    })
    this.success({ memory: memory.toJSON() })
  }

  /**
   * 编辑一条记忆
   * PUT /wolf/ai-chat/memory
   * body: { id, category?, content? }
   */
  async memoryPut() {
    const userInfo = this.ctx.userInfo
    const body = this.ctx.request.body || {}
    const id = parseInt(body.id)

    if (!id) {
      this.fail(400, 'ERR_MEMORY_ID_REQUIRED')
      return
    }

    const memory = await AiUserMemoryModel.findOne({
      where: { id, userID: userInfo.id, status: 1 },
    })
    if (!memory) {
      this.fail(404, 'ERR_MEMORY_NOT_FOUND')
      return
    }

    const updates = { updateTime: util.unixtime() }
    if (body.category) {
      if (!memoryExtractor.MEMORY_CATEGORIES.includes(body.category)) {
        this.fail(400, 'ERR_INVALID_CATEGORY')
        return
      }
      updates.category = body.category
    }
    if (body.content !== undefined) {
      if (typeof body.content !== 'string' || !body.content.trim()) {
        this.fail(400, 'ERR_CONTENT_REQUIRED')
        return
      }
      updates.content = body.content.trim()
    }

    await memory.update(updates)
    this.success({ memory: memory.toJSON() })
  }

  /**
   * 删除一条记忆（软删除，status=0）
   * DELETE /wolf/ai-chat/memory
   * body: { id }
   */
  async memoryDelete() {
    const userInfo = this.ctx.userInfo
    const body = this.ctx.request.body || {}
    const id = parseInt(body.id)

    if (!id) {
      this.fail(400, 'ERR_MEMORY_ID_REQUIRED')
      return
    }

    const [count] = await AiUserMemoryModel.update(
      { status: 0, updateTime: util.unixtime() },
      { where: { id, userID: userInfo.id } },
    )
    if (count === 0) {
      this.fail(404, 'ERR_MEMORY_NOT_FOUND')
      return
    }
    this.success({ count })
  }
}

AiChat.parseClientLocale = parseClientLocale
AiChat.extractTextFromStoredMessage = extractTextFromStoredMessage
module.exports = AiChat
