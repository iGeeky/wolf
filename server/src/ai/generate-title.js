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

  // 标题生成是简单文本任务，强制关闭模型 thinking 以提升响应速度。
  // pi-ai 仅在 model.reasoning=true 时才会发送 thinking 控制参数；
  // 但部分自定义 OpenAI-兼容服务端默认开启 thinking，必须通过 onPayload
  // 主动覆写 payload，注入兼容多种格式的关闭字段。
  const assistantMsg = await completeSimple(model, context, {
    apiKey,
    reasoning: 'minimal',
    onPayload: (payload) => {
      if (!payload || typeof payload !== 'object') return undefined
      // 同时覆盖几种常见的关闭 thinking 写法，最大化兼容
      payload.enable_thinking = false
      payload.thinking = false
      if (payload.chat_template_kwargs && typeof payload.chat_template_kwargs === 'object') {
        payload.chat_template_kwargs.enable_thinking = false
      } else {
        payload.chat_template_kwargs = { enable_thinking: false }
      }
      delete payload.reasoning_effort
      return payload
    },
  })

  let title = assistantPlainText(assistantMsg)
  title = stripXmlLikeTaggedBlocks(title)
  title = title.replace(/^["'「『]|["'」』]$/g, '').replace(/\s+/g, ' ').trim()
  if (title.length > 80) title = title.slice(0, 80)
  return title
}

module.exports = { generateSessionTitle }
