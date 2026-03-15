const InternalCaller = require('../internal-caller')
const UserRoleController = require('../../controllers/user-role')
const { loadType, extractContext, toToolResult } = require('./tool-helper')

async function createTools() {
  const Type = await loadType()

  const getUserRolesTool = {
    name: 'get_user_roles',
    label: '获取用户角色和权限',
    description: '获取指定用户在某应用下的角色列表和直接权限列表',
    parameters: Type.Object({
      userID: Type.Integer({ description: '用户ID' }),
      appID: Type.String({ description: '应用ID' }),
    }),
    execute: async (toolCallId, params, signal) => {
      const { userInfo, clientIp, cleanParams } = extractContext(params)
      const result = await InternalCaller.call(UserRoleController, 'get', {
        method: 'GET',
        path: '/wolf/user-role',
        args: cleanParams,
        userInfo,
        clientIp,
      })
      return toToolResult(result)
    },
  }

  const setUserRolesTool = {
    name: 'set_user_roles',
    label: '设置用户角色和权限',
    description: '设置用户在某应用下的角色和权限（会覆盖原有设置）',
    parameters: Type.Object({
      userID: Type.Integer({ description: '用户ID' }),
      appID: Type.String({ description: '应用ID' }),
      roleIDs: Type.Optional(Type.Array(Type.String(), { description: '角色ID列表（替换原有角色，传空数组则清除全部角色）' })),
      permIDs: Type.Optional(Type.Array(Type.String(), { description: '直接权限ID列表（替换原有权限，传空数组则清除全部直接权限）' })),
    }),
    execute: async (toolCallId, params, signal) => {
      const { userInfo, clientIp, cleanParams } = extractContext(params)
      const result = await InternalCaller.call(UserRoleController, 'set', {
        method: 'POST',
        path: '/wolf/user-role/set',
        args: cleanParams,
        userInfo,
        clientIp,
      })
      return toToolResult(result)
    },
  }

  const deleteUserRolesTool = {
    name: 'delete_user_roles',
    label: '删除用户的应用关联',
    description: '删除用户在某应用下的全部角色和权限关联',
    parameters: Type.Object({
      userID: Type.Integer({ description: '用户ID' }),
      appID: Type.String({ description: '应用ID' }),
    }),
    execute: async (toolCallId, params, signal) => {
      const { userInfo, clientIp, cleanParams } = extractContext(params)
      const result = await InternalCaller.call(UserRoleController, 'delete', {
        method: 'DELETE',
        path: '/wolf/user-role',
        args: cleanParams,
        userInfo,
        clientIp,
      })
      return toToolResult(result)
    },
  }

  return [getUserRolesTool, setUserRolesTool, deleteUserRolesTool]
}

module.exports = createTools
