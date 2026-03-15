const InternalCaller = require('../internal-caller')
const AccessLogController = require('../../controllers/access-log')
const { loadType, extractContext, toToolResult } = require('./tool-helper')

async function createTools() {
  const Type = await loadType()

  const queryAccessLogsTool = {
    name: 'query_access_logs',
    label: '查询访问日志',
    description: '查询系统访问日志，可按应用、用户名、动作、资源名称、状态等过滤。appID="ai-agent"可查看AI操作记录。',
    parameters: Type.Object({
      appID: Type.String({ description: '应用ID，必填。传"ai-agent"可只查AI操作，传具体应用ID查询该应用的日志' }),
      username: Type.Optional(Type.String({ description: '用户名过滤' })),
      action: Type.Optional(Type.String({ description: 'HTTP方法过滤：GET/POST/PUT/DELETE' })),
      resName: Type.Optional(Type.String({ description: '资源名称（路径）过滤' })),
      ip: Type.Optional(Type.String({ description: 'IP地址过滤' })),
      status: Type.Optional(Type.Integer({ description: 'HTTP状态码过滤（如200/403/500）' })),
      startDate: Type.Optional(Type.String({ description: '开始日期（格式：YYYY-MM-DD）' })),
      endDate: Type.Optional(Type.String({ description: '结束日期（格式：YYYY-MM-DD）' })),
      page: Type.Optional(Type.Integer({ description: '页码，默认1', default: 1 })),
      limit: Type.Optional(Type.Integer({ description: '每页条数，默认20', default: 20 })),
    }),
    execute: async (toolCallId, params, signal) => {
      const { userInfo, clientIp, cleanParams } = extractContext(params)
      const result = await InternalCaller.call(AccessLogController, 'list', {
        method: 'GET',
        path: '/wolf/access-log/list',
        args: cleanParams,
        userInfo,
        clientIp,
      })
      return toToolResult(result)
    },
  }

  return [queryAccessLogsTool]
}

module.exports = createTools
