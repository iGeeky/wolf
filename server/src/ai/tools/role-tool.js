const InternalCaller = require('../internal-caller')
const RoleController = require('../../controllers/role')
const { loadType, extractContext, toToolResult } = require('./tool-helper')

async function createTools() {
  const Type = await loadType()

  const listRolesTool = {
    name: 'list_roles',
    label: '查询角色列表',
    description: '查询指定应用下的角色列表，支持分页和关键词搜索',
    parameters: Type.Object({
      appID: Type.String({ description: '应用ID' }),
      key: Type.Optional(Type.String({ description: '搜索关键词（角色ID或名称）' })),
      page: Type.Optional(Type.Integer({ description: '页码，默认1', default: 1 })),
      limit: Type.Optional(Type.Integer({ description: '每页条数，默认20', default: 20 })),
    }),
    execute: async (toolCallId, params, signal) => {
      const { userInfo, clientIp, cleanParams } = extractContext(params)
      const result = await InternalCaller.call(RoleController, 'list', {
        method: 'GET',
        path: '/wolf/role/list',
        args: cleanParams,
        userInfo,
        clientIp,
      })
      return toToolResult(result)
    },
  }

  const createRoleTool = {
    name: 'create_role',
    label: '创建角色',
    description: '在指定应用下创建新角色，可同时关联权限ID列表',
    parameters: Type.Object({
      id: Type.String({ description: '角色ID（应用内唯一）' }),
      appID: Type.String({ description: '应用ID' }),
      name: Type.String({ description: '角色名称（应用内唯一）' }),
      description: Type.Optional(Type.String({ description: '角色描述' })),
      permIDs: Type.Optional(Type.Array(Type.String(), { description: '关联的权限ID列表' })),
    }),
    execute: async (toolCallId, params, signal) => {
      const { userInfo, clientIp, cleanParams } = extractContext(params)
      const result = await InternalCaller.call(RoleController, 'post', {
        method: 'POST',
        path: '/wolf/role',
        args: cleanParams,
        userInfo,
        clientIp,
      })
      return toToolResult(result)
    },
  }

  const updateRoleTool = {
    name: 'update_role',
    label: '更新角色',
    description: '更新角色信息，包括名称、描述和权限列表',
    parameters: Type.Object({
      id: Type.String({ description: '角色ID' }),
      appID: Type.String({ description: '应用ID' }),
      name: Type.Optional(Type.String({ description: '新角色名称' })),
      description: Type.Optional(Type.String({ description: '新描述' })),
      permIDs: Type.Optional(Type.Array(Type.String(), { description: '新的权限ID列表（将覆盖原有列表）' })),
    }),
    execute: async (toolCallId, params, signal) => {
      const { userInfo, clientIp, cleanParams } = extractContext(params)
      const result = await InternalCaller.call(RoleController, 'put', {
        method: 'PUT',
        path: '/wolf/role',
        args: cleanParams,
        userInfo,
        clientIp,
      })
      return toToolResult(result)
    },
  }

  const deleteRoleTool = {
    name: 'delete_role',
    label: '删除角色',
    description: '删除角色（高危：若角色已被分配给用户则无法删除）',
    parameters: Type.Object({
      id: Type.String({ description: '角色ID' }),
      appID: Type.String({ description: '应用ID' }),
    }),
    execute: async (toolCallId, params, signal) => {
      const { userInfo, clientIp, cleanParams } = extractContext(params)
      const result = await InternalCaller.call(RoleController, 'delete', {
        method: 'DELETE',
        path: '/wolf/role',
        args: cleanParams,
        userInfo,
        clientIp,
      })
      return toToolResult(result)
    },
  }

  return [listRolesTool, createRoleTool, updateRoleTool, deleteRoleTool]
}

module.exports = createTools
