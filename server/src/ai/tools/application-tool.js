const InternalCaller = require('../internal-caller')
const ApplicationController = require('../../controllers/application')
const { loadType, extractContext, toToolResult } = require('./tool-helper')

async function createTools() {
  const Type = await loadType()

  const listApplicationsTool = {
    name: 'list_applications',
    label: '查询应用列表',
    description: '查询系统中的应用列表，支持分页和关键词搜索',
    parameters: Type.Object({
      key: Type.Optional(Type.String({ description: '搜索关键词（应用ID或名称）' })),
      page: Type.Optional(Type.Integer({ description: '页码，默认1', default: 1 })),
      limit: Type.Optional(Type.Integer({ description: '每页条数，默认10', default: 10 })),
    }),
    execute: async (toolCallId, params, signal) => {
      const { userInfo, clientIp, cleanParams } = extractContext(params)
      const result = await InternalCaller.call(ApplicationController, 'list', {
        method: 'GET',
        path: '/wolf/application/list',
        args: cleanParams,
        userInfo,
        clientIp,
      })
      return toToolResult(result)
    },
  }

  const getApplicationTool = {
    name: 'get_application',
    label: '获取应用详情',
    description: '根据应用ID获取应用的详细信息',
    parameters: Type.Object({
      id: Type.String({ description: '应用ID' }),
    }),
    execute: async (toolCallId, params, signal) => {
      const { userInfo, clientIp, cleanParams } = extractContext(params)
      const result = await InternalCaller.call(ApplicationController, 'get', {
        method: 'GET',
        path: '/wolf/application/get',
        args: cleanParams,
        userInfo,
        clientIp,
      })
      return toToolResult(result)
    },
  }

  const createApplicationTool = {
    name: 'create_application',
    label: '创建应用',
    description: '创建新应用（仅超级管理员可用）',
    parameters: Type.Object({
      id: Type.String({ description: '应用ID（唯一标识）' }),
      name: Type.String({ description: '应用名称' }),
      description: Type.Optional(Type.String({ description: '应用描述' })),
      secret: Type.Optional(Type.String({ description: 'OAuth2 密钥' })),
    }),
    execute: async (toolCallId, params, signal) => {
      const { userInfo, clientIp, cleanParams } = extractContext(params)
      const result = await InternalCaller.call(ApplicationController, 'post', {
        method: 'POST',
        path: '/wolf/application',
        args: cleanParams,
        userInfo,
        clientIp,
      })
      return toToolResult(result)
    },
  }

  const updateApplicationTool = {
    name: 'update_application',
    label: '更新应用',
    description: '更新应用信息（仅超级管理员可用）',
    parameters: Type.Object({
      id: Type.String({ description: '应用ID' }),
      name: Type.Optional(Type.String({ description: '新名称' })),
      description: Type.Optional(Type.String({ description: '新描述' })),
    }),
    execute: async (toolCallId, params, signal) => {
      const { userInfo, clientIp, cleanParams } = extractContext(params)
      const result = await InternalCaller.call(ApplicationController, 'put', {
        method: 'PUT',
        path: '/wolf/application',
        args: cleanParams,
        userInfo,
        clientIp,
      })
      return toToolResult(result)
    },
  }

  const deleteApplicationTool = {
    name: 'delete_application',
    label: '删除应用',
    description: '删除指定应用（仅超级管理员可用，高危操作，请谨慎）',
    parameters: Type.Object({
      id: Type.String({ description: '应用ID' }),
    }),
    execute: async (toolCallId, params, signal) => {
      const { userInfo, clientIp, cleanParams } = extractContext(params)
      const result = await InternalCaller.call(ApplicationController, 'delete', {
        method: 'DELETE',
        path: '/wolf/application',
        args: cleanParams,
        userInfo,
        clientIp,
      })
      return toToolResult(result)
    },
  }

  const getRbacDiagramTool = {
    name: 'get_rbac_diagram',
    label: '获取RBAC关系图',
    description: '获取应用的用户-角色-权限关系图数据（节点和连线）',
    parameters: Type.Object({
      id: Type.String({ description: '应用ID' }),
    }),
    execute: async (toolCallId, params, signal) => {
      const { userInfo, clientIp, cleanParams } = extractContext(params)
      const result = await InternalCaller.call(ApplicationController, 'diagram', {
        method: 'GET',
        path: '/wolf/application/diagram',
        args: cleanParams,
        userInfo,
        clientIp,
      })
      return toToolResult(result)
    },
  }

  return [
    listApplicationsTool,
    getApplicationTool,
    createApplicationTool,
    updateApplicationTool,
    deleteApplicationTool,
    getRbacDiagramTool,
  ]
}

module.exports = createTools
