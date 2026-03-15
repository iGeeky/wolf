/**
 * 从助手消息中移除 thinking 块，避免写入库或经 SSE 暴露给前端。
 * @param {object} msg - AgentMessage 风格 { role, content?: array }
 * @returns {object}
 */
function stripThinkingFromMessage(msg) {
  if (!msg || typeof msg !== 'object') return msg
  if (!Array.isArray(msg.content)) return { ...msg }
  return {
    ...msg,
    content: msg.content.filter((c) => c && c.type !== 'thinking'),
  }
}

/**
 * @param {string} evType
 * @returns {boolean}
 */
function isThinkingStreamEvent(evType) {
  return (
    typeof evType === 'string' &&
    (evType === 'thinking_start' ||
      evType === 'thinking_delta' ||
      evType === 'thinking_end')
  )
}

module.exports = {
  stripThinkingFromMessage,
  isThinkingStreamEvent,
}
