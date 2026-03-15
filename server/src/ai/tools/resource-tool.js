const InternalCaller = require('../internal-caller')
const ResourceController = require('../../controllers/resource')
const { loadType, extractContext, toToolResult } = require('./tool-helper')

async function createTools() {
  const Type = await loadType()

  const listResourcesTool = {
    name: 'list_resources',
    label: '查询资源列表',
    description: '查询指定应用下的URL资源（API路由），支持分页和关键词搜索',
    parameters: Type.Object({
      appID: Type.String({ description: '应用ID' }),
      key: Type.Optional(Type.String({ description: '搜索关键词（资源名称或权限ID）' })),
      page: Type.Optional(Type.Integer({ description: '页码，默认1', default: 1 })),
      limit: Type.Optional(Type.Integer({ description: '每页条数，默认20', default: 20 })),
    }),
    execute: async (toolCallId, params, signal) => {
      const { userInfo, clientIp, cleanParams } = extractContext(params)
      const result = await InternalCaller.call(ResourceController, 'list', {
        method: 'GET',
        path: '/wolf/resource/list',
        args: cleanParams,
        userInfo,
        clientIp,
      })
      return toToolResult(result)
    },
  }

  const createResourceTool = {
    name: 'create_resource',
    label: '创建资源',
    description: '在指定应用下创建新URL资源，关联权限，定义路由规则',
    parameters: Type.Object({
      appID: Type.String({ description: '应用ID' }),
      matchType: Type.String({ description: '匹配类型：equal（精确）/prefix（前缀）/suffix（后缀）/radixtree' }),
      name: Type.String({ description: '资源路径（URL pattern）' }),
      action: Type.String({ description: 'HTTP方法：GET/POST/PUT/DELETE/ALL' }),
      permID: Type.String({ description: '关联的权限ID（访问该资源需要的权限）' }),
      priority: Type.Optional(Type.Integer({ description: '优先级，默认自动计算' })),
    }),
    execute: async (toolCallId, params, signal) => {
      const { userInfo, clientIp, cleanParams } = extractContext(params)
      const result = await InternalCaller.call(ResourceController, 'post', {
        method: 'POST',
        path: '/wolf/resource',
        args: cleanParams,
        userInfo,
        clientIp,
      })
      return toToolResult(result)
    },
  }

  const updateResourceTool = {
    name: 'update_resource',
    label: '更新资源',
    description: '更新URL资源信息',
    parameters: Type.Object({
      id: Type.Integer({ description: '资源ID' }),
      appID: Type.String({ description: '应用ID' }),
      matchType: Type.Optional(Type.String({ description: '匹配类型' })),
      name: Type.Optional(Type.String({ description: '资源路径' })),
      action: Type.Optional(Type.String({ description: 'HTTP方法' })),
      permID: Type.Optional(Type.String({ description: '关联权限ID' })),
    }),
    execute: async (toolCallId, params, signal) => {
      const { userInfo, clientIp, cleanParams } = extractContext(params)
      const result = await InternalCaller.call(ResourceController, 'put', {
        method: 'PUT',
        path: '/wolf/resource',
        args: cleanParams,
        userInfo,
        clientIp,
      })
      return toToolResult(result)
    },
  }

  const deleteResourceTool = {
    name: 'delete_resource',
    label: '删除资源',
    description: '删除URL资源',
    parameters: Type.Object({
      id: Type.Integer({ description: '资源ID' }),
      appID: Type.String({ description: '应用ID' }),
    }),
    execute: async (toolCallId, params, signal) => {
      const { userInfo, clientIp, cleanParams } = extractContext(params)
      const result = await InternalCaller.call(ResourceController, 'delete', {
        method: 'DELETE',
        path: '/wolf/resource',
        args: cleanParams,
        userInfo,
        clientIp,
      })
      return toToolResult(result)
    },
  }

  return [listResourcesTool, createResourceTool, updateResourceTool, deleteResourceTool]
}

module.exports = createTools
