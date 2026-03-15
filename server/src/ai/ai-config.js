/**
 * AI 配置加载器
 *
 * 全部来自 conf/config.js 的 ai 段（该段字段由环境变量如 AI_PROVIDER、AI_API_KEY 等注入）。
 * API Key 解析顺序：ai.apiKey（对应当前 provider）> 各 provider 约定环境变量（如 OPENAI_API_KEY）。
 */

const wolfConfig = require('../../conf/config')

// 环境变量与 provider 的映射（当 ai.apiKey 为空时的回退）
const ENV_API_KEY_MAP = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  google: 'GEMINI_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  groq: 'GROQ_API_KEY',
  xai: 'XAI_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
}

/**
 * 获取当前配置的 provider
 */
function getProvider() {
  return wolfConfig.ai.provider
}

/**
 * 获取当前配置的 model id
 */
function getModelId() {
  return wolfConfig.ai.model
}

/**
 * 获取当前 provider 的自定义 baseUrl（可选）
 * @param {string} [_provider] - 保留参数以便与调用方 getBaseUrl(provider) 一致
 * @returns {string} 空字符串表示使用 pi-ai 默认地址
 */
function getBaseUrl(_provider) {
  return (wolfConfig.ai.baseUrl && String(wolfConfig.ai.baseUrl).trim()) || ''
}

/**
 * 获取指定 provider 的 API Key
 * 优先级：conf ai.apiKey（仅当 provider 与配置的 provider 一致）> 环境变量（OPENAI_API_KEY 等）
 * @param {string} provider
 * @returns {string|undefined}
 */
function getApiKeyForProvider(provider) {
  const configuredProvider = wolfConfig.ai.provider
  const confKey = wolfConfig.ai.apiKey && String(wolfConfig.ai.apiKey).trim()
  if (confKey && provider === configuredProvider) {
    return confKey
  }
  const envKey = ENV_API_KEY_MAP[provider]
  if (envKey && process.env[envKey]) {
    return process.env[envKey]
  }
  return undefined
}

/**
 * 检查 AI 功能是否可用（有 API Key）
 */
function isAiAvailable() {
  const provider = getProvider()
  const apiKey = getApiKeyForProvider(provider)
  return !!apiKey
}

/**
 * wolf AI 行为配置
 */
function getWolfAiConfig() {
  return {
    api: wolfConfig.ai.api,
    maxTurns: wolfConfig.ai.maxTurns,
    maxHistoryMessages: wolfConfig.ai.maxHistoryMessages,
    thinkingLevel: wolfConfig.ai.thinkingLevel,
  }
}

module.exports = {
  getProvider,
  getModelId,
  getBaseUrl,
  getApiKeyForProvider,
  isAiAvailable,
  getWolfAiConfig,
}
