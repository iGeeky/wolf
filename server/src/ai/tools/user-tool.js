const InternalCaller = require('../internal-caller')
const UserController = require('../../controllers/user')
const { loadType, extractContext, toToolResult } = require('./tool-helper')

async function createTools() {
  const Type = await loadType()

  const listUsersTool = {
    name: 'list_users',
    label: '查询用户列表',
    description: '查询系统用户列表，支持分页和关键词搜索。admin用户只能看到其管理的应用下的用户。',
    parameters: Type.Object({
      key: Type.Optional(Type.String({ description: '搜索关键词（用户名、昵称或手机号）' })),
      username: Type.Optional(Type.String({ description: '精确匹配用户名' })),
      page: Type.Optional(Type.Integer({ description: '页码，默认1', default: 1 })),
      limit: Type.Optional(Type.Integer({ description: '每页条数，默认10', default: 10 })),
    }),
    execute: async (toolCallId, params, signal) => {
      const { userInfo, clientIp, cleanParams } = extractContext(params)
      const result = await InternalCaller.call(UserController, 'list', {
        method: 'GET',
        path: '/wolf/user/list',
        args: cleanParams,
        userInfo,
        clientIp,
      })
      return toToolResult(result)
    },
  }

  const createUserTool = {
    name: 'create_user',
    label: '创建用户',
    description: '创建新用户（仅超级管理员可用）。密码如不指定将自动生成随机密码并在结果中返回。',
    parameters: Type.Object({
      username: Type.String({ description: '用户名（登录名）' }),
      nickname: Type.String({ description: '用户昵称（显示名）' }),
      email: Type.Optional(Type.String({ description: '邮箱地址' })),
      tel: Type.Optional(Type.String({ description: '手机号' })),
      appIDs: Type.Optional(Type.Array(Type.String(), { description: '关联的应用ID列表' })),
      manager: Type.Optional(Type.String({ description: '管理员类型：super（超级管理员）或 admin（普通管理员），普通用户不填' })),
      password: Type.Optional(Type.String({ description: '初始密码，不填则自动生成' })),
    }),
    execute: async (toolCallId, params, signal) => {
      const { userInfo, clientIp, cleanParams } = extractContext(params)
      const result = await InternalCaller.call(UserController, 'post', {
        method: 'POST',
        path: '/wolf/user',
        args: cleanParams,
        userInfo,
        clientIp,
      })
      return toToolResult(result)
    },
  }

  const updateUserTool = {
    name: 'update_user',
    label: '更新用户',
    description: '更新用户信息（仅超级管理员可用）',
    parameters: Type.Object({
      id: Type.Integer({ description: '用户ID' }),
      nickname: Type.Optional(Type.String({ description: '昵称' })),
      email: Type.Optional(Type.String({ description: '邮箱' })),
      tel: Type.Optional(Type.String({ description: '手机号' })),
      appIDs: Type.Optional(Type.Array(Type.String(), { description: '关联的应用ID列表' })),
      manager: Type.Optional(Type.String({ description: '管理员类型：super 或 admin' })),
      status: Type.Optional(Type.Integer({ description: '状态：0=正常，-1=禁用' })),
    }),
    execute: async (toolCallId, params, signal) => {
      const { userInfo, clientIp, cleanParams } = extractContext(params)
      const result = await InternalCaller.call(UserController, 'put', {
        method: 'PUT',
        path: '/wolf/user',
        args: cleanParams,
        userInfo,
        clientIp,
      })
      return toToolResult(result)
    },
  }

  const deleteUserTool = {
    name: 'delete_user',
    label: '删除用户',
    description: '删除用户（仅超级管理员可用，高危操作）',
    parameters: Type.Object({
      id: Type.Optional(Type.Integer({ description: '用户ID' })),
      username: Type.Optional(Type.String({ description: '用户名（与id二选一）' })),
    }),
    execute: async (toolCallId, params, signal) => {
      const { userInfo, clientIp, cleanParams } = extractContext(params)
      const result = await InternalCaller.call(UserController, 'delete', {
        method: 'DELETE',
        path: '/wolf/user',
        args: cleanParams,
        userInfo,
        clientIp,
      })
      return toToolResult(result)
    },
  }

  const resetUserPasswordTool = {
    name: 'reset_user_password',
    label: '重置用户密码',
    description: '为指定用户重置密码，返回新的随机密码（仅超级管理员可用）',
    parameters: Type.Object({
      id: Type.Integer({ description: '用户ID' }),
    }),
    execute: async (toolCallId, params, signal) => {
      const { userInfo, clientIp, cleanParams } = extractContext(params)
      const result = await InternalCaller.call(UserController, 'resetPwd', {
        method: 'PUT',
        path: '/wolf/user/resetPwd',
        args: cleanParams,
        userInfo,
        clientIp,
      })
      return toToolResult(result)
    },
  }

  return [
    listUsersTool,
    createUserTool,
    updateUserTool,
    deleteUserTool,
    resetUserPasswordTool,
  ]
}

module.exports = createTools
