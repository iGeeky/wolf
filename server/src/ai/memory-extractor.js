/**
 * Memory Extractor — 从历史会话中提取用户记忆
 *
 * 工作流程：
 * 1. 查找用户所有需要提取的会话（memory_extracted_at < update_time）
 * 2. 读取会话消息和该用户已有记忆
 * 3. 调用 LLM 提取/合并/去重记忆
 * 4. 写入新记忆、废弃旧记忆、更新 session.memory_extracted_at
 */

const { getWolfPiModel } = require('./agent-factory')
const log4js = require('../util/log4js')
const util = require('../util/util')

const MEMORY_CATEGORIES = ['preference', 'knowledge', 'decision', 'pattern']

const EXTRACTION_SYSTEM_PROMPT = `You are a memory extraction assistant. Your task is to analyze a conversation between a user and a Wolf RBAC AI assistant, then extract information that would be valuable for future interactions.

Do NOT continue the conversation. Do NOT respond to any questions. ONLY output the structured JSON result as specified.`

/**
 * 将数据库消息序列化为可读文本（用于 LLM 摘要提取）
 * @param {Array} dbMessages - ai_chat_message 行（content 字段为 AgentMessage 格式）
 * @returns {string}
 */
function serializeConversation(dbMessages) {
  const lines = []
  for (const msg of dbMessages) {
    const agentMsg = msg.content
    if (!agentMsg || !agentMsg.role) continue

    if (agentMsg.role === 'user') {
      const text = extractText(agentMsg.content)
      if (text) lines.push(`[User]: ${text}`)
    } else if (agentMsg.role === 'assistant') {
      const parts = Array.isArray(agentMsg.content) ? agentMsg.content : []
      const textParts = parts
        .filter(p => p.type === 'text')
        .map(p => p.text)
        .join('')
      if (textParts) lines.push(`[Assistant]: ${textParts}`)
    }
    // toolResult 跳过（对记忆提取帮助不大）
  }
  return lines.join('\n\n')
}

function extractText(content) {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .filter(p => p.type === 'text')
      .map(p => p.text)
      .join('')
  }
  return ''
}

/**
 * 将已有记忆格式化为 prompt 文本
 * @param {Array} memories - ai_user_memory 行
 * @returns {string}
 */
function formatExistingMemories(memories) {
  if (!memories || memories.length === 0) return '(no existing memories)'
  return memories.map(m => `[id=${m.id}, category=${m.category}]: ${m.content}`).join('\n')
}

/**
 * 构建提取 prompt 的用户消息内容
 */
function buildExtractionPrompt(conversation, existingMemoriesText) {
  return `## Existing Memories
${existingMemoriesText}

## Conversation
<conversation>
${conversation}
</conversation>

## Extraction Task
Analyze the conversation above and extract information valuable for future interactions.

### Categories to extract:
- **preference**: User habits and preferences (e.g., "prefers tables for query results", "always uses Chinese")
- **knowledge**: Important facts about the system (e.g., "appID for OA system is 'oa-app'", "role 'admin' has permissions X, Y")
- **decision**: Important decisions made (e.g., "decided to remove user A from role R")
- **pattern**: Common operation patterns (e.g., "frequently queries permission configuration for app X")

### Deduplication rules:
- If new info duplicates an existing memory, skip it
- If new info is an updated version of existing memory (e.g., changed config), mark old as deprecated and add new
- If multiple similar items can be merged into a more complete one, merge them

### Output (strict JSON only, no markdown, no explanation):
{
  "add": [
    {"category": "preference|knowledge|decision|pattern", "content": "..."}
  ],
  "deprecate": [123, 456]
}

Where:
- "add": new memory entries to create
- "deprecate": ids of existing memories to mark as deprecated (replaced or outdated)

If nothing useful to extract, return: {"add": [], "deprecate": []}`
}

/**
 * 调用 LLM 提取记忆，返回 { add: [], deprecate: [] }
 */
async function callLlmForExtraction(conversation, existingMemories) {
  if (!conversation || conversation.trim().length === 0) {
    return { add: [], deprecate: [] }
  }

  const existingMemoriesText = formatExistingMemories(existingMemories)
  const userPromptText = buildExtractionPrompt(conversation, existingMemoriesText)

  const { model, wolfAiConf, provider } = await getWolfPiModel()
  const { completeSimple } = await import('@mariozechner/pi-ai')
  const aiConfig = require('./ai-config')
  const { buildDisableThinkingOnPayload } = require('./generate-title')
  const apiKey = aiConfig.getApiKeyForProvider(provider)

  const context = {
    systemPrompt: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: userPromptText,
        timestamp: Date.now(),
      },
    ],
  }

  // 记忆抽取同为一次性后台任务，关闭 thinking 以避免慢响应（如小米 MiMo 默认开启思考）。
  const onPayload = buildDisableThinkingOnPayload(model, wolfAiConf)
  const result = await completeSimple(model, context, {
    maxTokens: 1024,
    apiKey,
    onPayload,
  })

  // 提取文本内容
  const textContent = Array.isArray(result.content)
    ? result.content.filter(p => p.type === 'text').map(p => p.text).join('')
    : ''

  if (!textContent) {
    log4js.warn('[MemoryExtractor] LLM returned empty content')
    return { add: [], deprecate: [] }
  }

  // 解析 JSON
  try {
    // 去除 <think>...</think> 思考块（带思考过程的模型会输出此内容）
    let cleaned = textContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
    // 去除可能的 markdown 代码块包裹
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const parsed = JSON.parse(cleaned)
    return {
      add: Array.isArray(parsed.add) ? parsed.add : [],
      deprecate: Array.isArray(parsed.deprecate) ? parsed.deprecate : [],
    }
  } catch (e) {
    log4js.warn('[MemoryExtractor] failed to parse LLM JSON response: %s', textContent.slice(0, 200))
    return { add: [], deprecate: [] }
  }
}

/**
 * 对单个会话进行记忆提取
 * @param {object} session - ai_chat_session 行
 * @param {number} userID
 * @param {object} AiChatMessageModel
 * @param {object} AiUserMemoryModel
 */
async function extractMemoryForSession(session, userID, AiChatMessageModel, AiUserMemoryModel) {
  const sessionID = parseInt(session.id)
  log4js.info('[MemoryExtractor] extracting memory for session %d, user %d', sessionID, userID)

  // 读取会话全部消息
  const dbMessages = await AiChatMessageModel.findAll({
    where: { sessionID },
    order: [['id', 'ASC']],
  })

  if (!dbMessages || dbMessages.length === 0) {
    log4js.info('[MemoryExtractor] session %d has no messages, skipping', sessionID)
    await session.update({ memoryExtractedAt: util.unixtime() })
    return
  }

  // 读取用户已有的活跃记忆
  const existingMemories = await AiUserMemoryModel.findAll({
    where: { userID, status: 1 },
    order: [['id', 'ASC']],
  })

  // 序列化对话
  const conversation = serializeConversation(dbMessages)

  // 调用 LLM 提取
  let extracted
  try {
    extracted = await callLlmForExtraction(conversation, existingMemories)
  } catch (e) {
    log4js.error('[MemoryExtractor] LLM call failed for session %d: %s', sessionID, e.message)
    // 即使 LLM 失败，也标记为已提取，避免下次重复尝试失败
    await session.update({ memoryExtractedAt: util.unixtime() })
    return
  }

  const now = util.unixtime()

  // 废弃旧记忆
  if (extracted.deprecate && extracted.deprecate.length > 0) {
    const validDeprecateIds = extracted.deprecate
      .map(id => parseInt(id))
      .filter(id => !isNaN(id))

    if (validDeprecateIds.length > 0) {
      await AiUserMemoryModel.update(
        { status: 0, updateTime: now },
        { where: { id: validDeprecateIds, userID } },
      )
      log4js.info('[MemoryExtractor] deprecated %d memories for user %d', validDeprecateIds.length, userID)
    }
  }

  // 写入新记忆
  if (extracted.add && extracted.add.length > 0) {
    const validNew = extracted.add.filter(m =>
      m && MEMORY_CATEGORIES.includes(m.category) && typeof m.content === 'string' && m.content.trim(),
    )

    for (const mem of validNew) {
      await AiUserMemoryModel.create({
        userID,
        sessionID,
        category: mem.category,
        content: mem.content.trim(),
        source: 'auto',
        status: 1,
        createTime: now,
        updateTime: now,
      })
    }
    log4js.info('[MemoryExtractor] added %d new memories for user %d', validNew.length, userID)
  }

  // 更新 session 提取时间
  await session.update({ memoryExtractedAt: now })
  log4js.info('[MemoryExtractor] session %d memory extraction complete', sessionID)
}

/**
 * 异步触发：提取指定用户所有待提取会话的记忆
 * 调用方不需要 await，让它在后台运行
 *
 * @param {number} userID
 * @param {object} AiChatSessionModel
 * @param {object} AiChatMessageModel
 * @param {object} AiUserMemoryModel
 * @param {number|null} [excludeSessionID] - 排除当前正在进行的会话（新建的那个）
 */
async function triggerMemoryExtraction(userID, AiChatSessionModel, AiChatMessageModel, AiUserMemoryModel, excludeSessionID = null) {
  try {
    const { Op } = require('sequelize')

    // 查找需要提取的老会话：活跃的、且 memory_extracted_at < update_time（有新消息）
    const whereClause = {
      userID,
      status: 1,
    }

    const sessionsToExtract = await AiChatSessionModel.findAll({
      where: {
        ...whereClause,
        ...(excludeSessionID ? { id: { [Op.ne]: excludeSessionID } } : {}),
      },
      order: [['id', 'DESC']],
      limit: 10,
    })

    // 过滤出真正需要提取的（memory_extracted_at < update_time）
    const pending = sessionsToExtract.filter(s => {
      const extractedAt = parseInt(s.memoryExtractedAt) || 0
      const updatedAt = parseInt(s.updateTime) || 0
      return extractedAt < updatedAt
    })

    if (pending.length === 0) {
      log4js.info('[MemoryExtractor] no sessions to extract for user %d', userID)
      return
    }

    log4js.info('[MemoryExtractor] found %d sessions to extract for user %d', pending.length, userID)

    for (const session of pending) {
      await extractMemoryForSession(session, userID, AiChatMessageModel, AiUserMemoryModel)
    }
  } catch (e) {
    log4js.error('[MemoryExtractor] extraction error for user %d: %s', userID, e.message)
  }
}

module.exports = { triggerMemoryExtraction, MEMORY_CATEGORIES, extractText, serializeConversation, formatExistingMemories, buildExtractionPrompt }
