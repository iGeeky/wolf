/**
 * AgentFactory — 创建 pi-mono Agent 实例
 *
 * 负责：
 * - 动态 import pi-mono（ESM 包）
 * - 根据 ai-config.js 选择 LLM 模型和 API Key
 * - 注入 System Prompt、工具集、历史消息
 * - 配置 transformContext（上下文截断）
 */

const aiConfig = require('./ai-config')
const { buildSystemPrompt } = require('./system-prompt')
const { getAllTools } = require('./tools/index')
const log4js = require('../util/log4js')

let _Agent = null
let _getModel = null
let _piLoaded = false

async function loadPiMono() {
  if (!_piLoaded) {
    const [agentCore, piAi] = await Promise.all([
      import('@mariozechner/pi-agent-core'),
      import('@mariozechner/pi-ai'),
    ])
    // @mariozechner/pi-ai 的 index.js 会自动注册所有内置 providers
    _Agent = agentCore.Agent
    _getModel = piAi.getModel
    _piLoaded = true
    log4js.info('[AgentFactory] pi-mono loaded successfully')
  }
  return { Agent: _Agent, getModel: _getModel }
}

/**
 * 上下文截断策略：保留最近 N 条消息，但确保不截断 toolCall/toolResult 配对
 * @param {Array} messages - AgentMessage[]
 * @param {number} maxMessages - 最多保留的消息数
 * @returns {Array}
 */
function pruneMessages(messages, maxMessages) {
  if (messages.length <= maxMessages) return messages

  let trimmed = messages.slice(-maxMessages)

  // 如果第一条是 toolResult，往前找到对应的 assistant 消息
  while (trimmed.length > 0) {
    const first = trimmed[0]
    if (first.role === 'toolResult') {
      const idx = messages.indexOf(first)
      if (idx > 0) {
        trimmed = [messages[idx - 1], ...trimmed]
      } else {
        break
      }
    } else {
      break
    }
  }

  return trimmed
}

/**
 * Resolve pi-ai model object for the configured Wolf AI provider (shared by Agent and one-shot completion).
 * @returns {Promise<{ model: object, wolfAiConf: object, provider: string, modelId: string }>}
 */
async function getWolfPiModel() {
  const { getModel } = await loadPiMono()

  const provider = aiConfig.getProvider()
  const modelId = aiConfig.getModelId()
  const wolfAiConf = aiConfig.getWolfAiConfig()

  if (!aiConfig.isAiAvailable()) {
    throw new Error(
      `AI 功能未配置。请在 conf/config.js 的 ai.apiKey 中配置密钥，或设置环境变量 AI_API_KEY / 当前 provider「${provider}」对应的标准 *_API_KEY。`,
    )
  }

  let model = getModel(provider, modelId)

  if (!model) {
    log4js.info('[AgentFactory] model "%s" not in pi-ai registry for provider "%s", building fallback model object', modelId, provider)
    model = {
      id: modelId,
      name: modelId,
      api: wolfAiConf.api || 'openai-completions',
      provider,
      baseUrl: '',
      reasoning: false,
      input: ['text'],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 128000,
      maxTokens: 8192,
    }
  }

  const baseUrl = aiConfig.getBaseUrl(provider)
  if (baseUrl) {
    model = { ...model, baseUrl }
    log4js.info('[AgentFactory] using custom baseUrl: %s', baseUrl)
  }

  return { model, wolfAiConf, provider, modelId }
}

/**
 * 创建新的 Agent 实例
 *
 * @param {object} opts
 * @param {object}   opts.userInfo       - 当前登录用户
 * @param {string}   opts.clientIp       - 客户端 IP
 * @param {Array}    [opts.messages]     - 历史消息（从数据库还原，AgentMessage[]格式）
 * @param {string}   [opts.locale]       - Accept-Language，用于选择语言
 * @param {Array}    [opts.memories]     - 用户记忆（ai_user_memory 记录），注入 system prompt
 * @returns {Promise<Agent>}
 */
async function createAgent({ userInfo, clientIp, messages = [], locale, memories = [] }) {
  const { Agent } = await loadPiMono()
  const { model, wolfAiConf, provider, modelId } = await getWolfPiModel()

  log4js.info('[AgentFactory] creating agent: provider=%s, model=%s, user=%s, memories=%d', provider, modelId, userInfo && userInfo.username, memories.length)

  const tools = await getAllTools(userInfo, clientIp)
  const systemPrompt = buildSystemPrompt(userInfo, locale, memories)

  const agent = new Agent({
    initialState: {
      systemPrompt,
      model,
      thinkingLevel: wolfAiConf.thinkingLevel || 'low',
      tools,
      messages: messages,
    },
    getApiKey: async (p) => {
      return aiConfig.getApiKeyForProvider(p)
    },
    transformContext: async (msgs, signal) => {
      const maxMessages = wolfAiConf.maxHistoryMessages || 100
      return pruneMessages(msgs, maxMessages)
    },
  })

  return agent
}

module.exports = { createAgent, loadPiMono, getWolfPiModel }
