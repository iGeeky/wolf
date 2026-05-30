/**
 * One-shot LLM call to suggest a chat session title (no Agent, no tools, no SSE).
 */

const aiConfig = require('./ai-config')
const { getWolfPiModel } = require('./agent-factory')

/**
 * @param {string} locale - e.g. zh-CN, en
 * @returns {{ system: string, user: string }}
 */
function buildTitlePrompts(locale, conversationText) {
  const zh = /^zh/i.test(locale || '')
  if (zh) {
    return {
      system:
        '你是标题生成助手。只输出一行会话标题，不要引号、不要解释、不要标点结尾。最多12个汉字或等效长度。',
      user: `根据以下对话摘要，生成简短会话标题（仅标题本身）：\n\n${conversationText}`,
    }
  }
  return {
    system:
      'You generate short chat session titles. Output a single line: the title only. No quotes, no explanation, max 8 words.',
    user: `Based on this conversation excerpt, produce a short session title (title text only):\n\n${conversationText}`,
  }
}

/**
 * 去掉模型返回里 <tag>...</tag> 包裹的内容（含 think / reasoning 等），可多次迭代处理嵌套。
 * 再移除残留的尖括号标签片段。
 * @param {string} text
 * @returns {string}
 */
function stripXmlLikeTaggedBlocks(text) {
  if (!text) return ''
  let s = text
  let prev
  do {
    prev = s
    // 成对标签：开闭 tag 名一致（think、reasoning、analysis 等）
    s = s.replace(
      /<([A-Za-z][A-Za-z0-9_.:-]*)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi,
      '',
    )
  } while (s !== prev)
  s = s.replace(/<[A-Za-z][A-Za-z0-9_.:-]*(?:\s[^>]*)?\/>/gi, '')
  s = s.replace(/<[^>]+>/g, '')
  return s
}

function assistantPlainText(msg) {
  if (!msg || !Array.isArray(msg.content)) return ''
  const parts = []
  for (const block of msg.content) {
    if (!block) continue
    if (block.type === 'thinking') continue
    if (block.type === 'text' && block.text) parts.push(block.text)
  }
  return parts.join('').trim()
}

/**
 * 标题生成是简单文本任务，必须关闭模型 thinking 以避免慢响应（部分模型默认开启思考）。
 * pi-ai 的 openai-completions 仅支持 enable_thinking / chat_template_kwargs / reasoning_effort 几种关闭格式，
 * 且都要求 model.reasoning=true 才发送；对小米 MiMo 这类使用 `thinking.type` 协议、
 * 或默认开启思考但 model.reasoning=false 的端点无法覆盖。
 * 这里基于 baseUrl/thinkingFormat 主动注入对应的关闭字段，确保标题生成不触发思考。
 * @param {object} model - pi-ai model 对象（含 baseUrl/provider）
 * @param {object} wolfAiConf - wolf AI 配置（含 thinkingFormat）
 * @returns {((payload: object) => object|undefined)|undefined}
 */
function buildDisableThinkingOnPayload(model, wolfAiConf) {
  const baseUrl = (model && model.baseUrl ? String(model.baseUrl) : '').toLowerCase()
  const provider = (model && model.provider ? String(model.provider) : '').toLowerCase()
  const fmt = (wolfAiConf && wolfAiConf.thinkingFormat ? String(wolfAiConf.thinkingFormat) : '').toLowerCase()

  const isMimo =
    fmt === 'mimo' ||
    provider === 'mimo' ||
    baseUrl.includes('mimo') ||
    baseUrl.includes('xiaomi')

  // 仅在能识别出需要主动关闭的协议时才注入，避免给未知端点发送非法字段导致 400。
  if (!isMimo) return undefined

  return (payload) => {
    if (!payload || typeof payload !== 'object') return undefined
    // 小米 MiMo 官方/兼容端点关闭思考的标准字段
    payload.thinking = { type: 'disabled' }
    return payload
  }
}

/**
 * @param {string} conversationText
 * @param {string} [locale]
 * @returns {Promise<string>}
 */
async function generateSessionTitle(conversationText, locale) {
  const trimmed = (conversationText || '').trim()
  if (!trimmed) return ''

  const { completeSimple } = await import('@mariozechner/pi-ai')
  const { model, wolfAiConf, provider } = await getWolfPiModel()
  const apiKey = aiConfig.getApiKeyForProvider(provider)
  if (!apiKey) {
    throw new Error('No API key for title generation')
  }

  const { system, user } = buildTitlePrompts(locale, trimmed.slice(0, 8000))

  const context = {
    systemPrompt: system,
    messages: [
      {
        role: 'user',
        content: user,
        timestamp: Date.now(),
      },
    ],
  }

  // 标题生成是简单文本任务，不传 reasoning：
  // pi-ai 对内置 reasoning 模型会因 reasoningEffort 为 falsy 而关闭 thinking（enable_thinking=false 等）。
  // 但对 pi-ai 不识别的协议（如小米 MiMo 的 thinking.type），需通过 onPayload 主动注入关闭字段。
  const onPayload = buildDisableThinkingOnPayload(model, wolfAiConf)
  const assistantMsg = await completeSimple(model, context, { apiKey, onPayload })

  // completeSimple 在 API 出错时不抛异常，而是返回带 errorMessage 的对象
  if (assistantMsg && (assistantMsg.stopReason === 'error' || assistantMsg.errorMessage)) {
    throw new Error(assistantMsg.errorMessage || 'LLM returned error response for title generation')
  }

  let title = assistantPlainText(assistantMsg)
  title = stripXmlLikeTaggedBlocks(title)
  title = title.replace(/^["'「『]|["'」』]$/g, '').replace(/\s+/g, ' ').trim()
  if (title.length > 80) title = title.slice(0, 80)
  return title
}

module.exports = {
  generateSessionTitle,
  buildTitlePrompts,
  stripXmlLikeTaggedBlocks,
  assistantPlainText,
  buildDisableThinkingOnPayload,
}
