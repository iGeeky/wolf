const InternalCaller = require('../internal-caller')
const PermissionController = require('../../controllers/permission')
const { loadType, extractContext, toToolResult } = require('./tool-helper')

async function createTools() {
  const Type = await loadType()

  const listPermissionsTool = {
    name: 'list_permissions',
    label: '查询权限列表',
    description: '查询指定应用下的权限列表，支持分页和关键词搜索',
    parameters: Type.Object({
      appID: Type.String({ description: '应用ID' }),
      key: Type.Optional(Type.String({ description: '搜索关键词（权限ID或名称）' })),
      categoryID: Type.Optional(Type.Integer({ description: '按分类ID过滤' })),
      page: Type.Optional(Type.Integer({ description: '页码，默认1', default: 1 })),
      limit: Type.Optional(Type.Integer({ description: '每页条数，默认20', default: 20 })),
    }),
    execute: async (toolCallId, params, signal) => {
      const { userInfo, clientIp, cleanParams } = extractContext(params)
      const result = await InternalCaller.call(PermissionController, 'list', {
        method: 'GET',
        path: '/wolf/permission/list',
        args: cleanParams,
        userInfo,
        clientIp,
      })
      return toToolResult(result)
    },
  }

  const createPermissionTool = {
    name: 'create_permission',
    label: '创建权限',
    description: '在指定应用下创建新权限',
    parameters: Type.Object({
      id: Type.String({ description: '权限ID（应用内唯一）' }),
      appID: Type.String({ description: '应用ID' }),
      name: Type.String({ description: '权限名称（应用内唯一）' }),
      description: Type.Optional(Type.String({ description: '权限描述' })),
      categoryID: Type.Optional(Type.Integer({ description: '所属分类ID' })),
    }),
    execute: async (toolCallId, params, signal) => {
      const { userInfo, clientIp, cleanParams } = extractContext(params)
      const result = await InternalCaller.call(PermissionController, 'post', {
        method: 'POST',
        path: '/wolf/permission',
        args: cleanParams,
        userInfo,
        clientIp,
      })
      return toToolResult(result)
    },
  }

  const updatePermissionTool = {
    name: 'update_permission',
    label: '更新权限',
    description: '更新权限信息',
    parameters: Type.Object({
      id: Type.String({ description: '权限ID' }),
      appID: Type.String({ description: '应用ID' }),
      name: Type.Optional(Type.String({ description: '新名称' })),
      description: Type.Optional(Type.String({ description: '新描述' })),
      categoryID: Type.Optional(Type.Integer({ description: '新分类ID' })),
    }),
    execute: async (toolCallId, params, signal) => {
      const { userInfo, clientIp, cleanParams } = extractContext(params)
      const result = await InternalCaller.call(PermissionController, 'put', {
        method: 'PUT',
        path: '/wolf/permission',
        args: cleanParams,
        userInfo,
        clientIp,
      })
      return toToolResult(result)
    },
  }

  const deletePermissionTool = {
    name: 'delete_permission',
    label: '删除权限',
    description: '删除权限（高危：删除前请确认该权限未被角色或资源使用）',
    parameters: Type.Object({
      id: Type.String({ description: '权限ID' }),
      appID: Type.String({ description: '应用ID' }),
    }),
    execute: async (toolCallId, params, signal) => {
      const { userInfo, clientIp, cleanParams } = extractContext(params)
      const result = await InternalCaller.call(PermissionController, 'delete', {
        method: 'DELETE',
        path: '/wolf/permission',
        args: cleanParams,
        userInfo,
        clientIp,
      })
      return toToolResult(result)
    },
  }

  return [listPermissionsTool, createPermissionTool, updatePermissionTool, deletePermissionTool]
}

module.exports = createTools
