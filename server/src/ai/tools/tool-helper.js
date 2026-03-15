/**
 * 工具辅助模块
 *
 * 统一封装 pi-mono 的动态导入，以及工具 execute 的用户上下文注入。
 *
 * 由于 pi-mono 是 ESM 包而 wolf-server 是 CJS，必须通过动态 import() 加载。
 */

let _Type = null
let _piLoaded = false

/**
 * 懒加载 pi-ai 的 Type（TypeBox）
 * @returns {Promise<{Type: import('@sinclair/typebox').TSchema}>}
 */
async function loadType() {
  if (!_piLoaded) {
    const piAi = await import('@mariozechner/pi-ai')
    _Type = piAi.Type
    _piLoaded = true
  }
  return _Type
}

/**
 * 将工具定义数组中的每个工具 execute 包装一层，
 * 自动注入 userInfo 和 clientIp，对 LLM 的 parameters schema 透明。
 *
 * @param {object[]} toolDefs    - 原始工具定义数组
 * @param {object}   userInfo    - 当前登录用户
 * @param {string}   clientIp    - 客户端 IP
 * @returns {object[]} 包装后的工具定义
 */
function injectUserContext(toolDefs, userInfo, clientIp) {
  return toolDefs.map(tool => ({
    ...tool,
    execute: (toolCallId, params, signal, onUpdate) => {
      // 将用户上下文注入 params（不影响 LLM 的参数 schema）
      const enrichedParams = { ...params, _userInfo: userInfo, _clientIp: clientIp }
      return tool.execute(toolCallId, enrichedParams, signal, onUpdate)
    },
  }))
}

/**
 * 从工具调用参数中提取并清理系统注入的上下文字段
 * @param {object} params
 * @returns {{ userInfo, clientIp, cleanParams }}
 */
function extractContext(params) {
  const { _userInfo: userInfo, _clientIp: clientIp, ...cleanParams } = params
  return { userInfo, clientIp: clientIp || '127.0.0.1', cleanParams }
}

/**
 * 将 InternalCaller 的结果转换为 AgentTool 的返回格式
 * 如果 result.ok 为 false，则 throw Error（告知 LLM 失败原因）
 */
function toToolResult(result) {
  if (!result || !result.ok) {
    const reason = (result && (result.reason || result.errmsg)) || 'ERR_SERVER_ERROR'
    throw new Error(reason)
  }
  return {
    content: [{ type: 'text', text: JSON.stringify(result.data) }],
    details: result.data || {},
  }
}

module.exports = { loadType, injectUserContext, extractContext, toToolResult }
