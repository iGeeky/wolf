const InternalCaller = require('../internal-caller')
const CategoryController = require('../../controllers/category')
const { loadType, extractContext, toToolResult } = require('./tool-helper')

async function createTools() {
  const Type = await loadType()

  const listCategoriesTool = {
    name: 'list_categories',
    label: '查询权限分类列表',
    description: '查询指定应用下的权限分类（Category）列表，分类用于组织权限',
    parameters: Type.Object({
      appID: Type.String({ description: '应用ID' }),
      key: Type.Optional(Type.String({ description: '搜索关键词（分类名称）' })),
      page: Type.Optional(Type.Integer({ description: '页码，默认1', default: 1 })),
      limit: Type.Optional(Type.Integer({ description: '每页条数，默认20', default: 20 })),
    }),
    execute: async (toolCallId, params, signal) => {
      const { userInfo, clientIp, cleanParams } = extractContext(params)
      const result = await InternalCaller.call(CategoryController, 'list', {
        method: 'GET',
        path: '/wolf/category/list',
        args: cleanParams,
        userInfo,
        clientIp,
      })
      return toToolResult(result)
    },
  }

  const createCategoryTool = {
    name: 'create_category',
    label: '创建权限分类',
    description: '在指定应用下创建新的权限分类',
    parameters: Type.Object({
      appID: Type.String({ description: '应用ID' }),
      name: Type.String({ description: '分类名称（应用内唯一）' }),
    }),
    execute: async (toolCallId, params, signal) => {
      const { userInfo, clientIp, cleanParams } = extractContext(params)
      const result = await InternalCaller.call(CategoryController, 'post', {
        method: 'POST',
        path: '/wolf/category',
        args: cleanParams,
        userInfo,
        clientIp,
      })
      return toToolResult(result)
    },
  }

  const updateCategoryTool = {
    name: 'update_category',
    label: '更新权限分类',
    description: '更新权限分类信息',
    parameters: Type.Object({
      id: Type.Integer({ description: '分类ID' }),
      appID: Type.String({ description: '应用ID' }),
      name: Type.String({ description: '新分类名称' }),
    }),
    execute: async (toolCallId, params, signal) => {
      const { userInfo, clientIp, cleanParams } = extractContext(params)
      const result = await InternalCaller.call(CategoryController, 'put', {
        method: 'PUT',
        path: '/wolf/category',
        args: cleanParams,
        userInfo,
        clientIp,
      })
      return toToolResult(result)
    },
  }

  const deleteCategoryTool = {
    name: 'delete_category',
    label: '删除权限分类',
    description: '删除权限分类（删除前请确保分类下无权限）',
    parameters: Type.Object({
      id: Type.Integer({ description: '分类ID' }),
      appID: Type.String({ description: '应用ID' }),
    }),
    execute: async (toolCallId, params, signal) => {
      const { userInfo, clientIp, cleanParams } = extractContext(params)
      const result = await InternalCaller.call(CategoryController, 'delete', {
        method: 'DELETE',
        path: '/wolf/category',
        args: cleanParams,
        userInfo,
        clientIp,
      })
      return toToolResult(result)
    },
  }

  return [listCategoriesTool, createCategoryTool, updateCategoryTool, deleteCategoryTool]
}

module.exports = createTools
