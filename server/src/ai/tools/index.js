/**
 * RBAC 工具集汇总入口
 *
 * getAllTools(userInfo, clientIp) 负责：
 * 1. 实例化所有工具
 * 2. 根据用户角色过滤工具（admin 用户不注册需要 super 权限的工具）
 * 3. 将 userInfo/clientIp 注入到每个工具的 execute 包装层（对 LLM 透明）
 */

const createApplicationTools = require('./application-tool')
const createUserTools = require('./user-tool')
const createRoleTools = require('./role-tool')
const createPermissionTools = require('./permission-tool')
const createResourceTools = require('./resource-tool')
const createCategoryTools = require('./category-tool')
const createUserRoleTools = require('./user-role-tool')
const createAccessLogTools = require('./access-log-tool')
const { injectUserContext } = require('./tool-helper')
const constant = require('../../util/constant')
const log4js = require('../../util/log4js')

// super 用户才能执行的工具名称（admin 用户过滤掉）
const SUPER_ONLY_TOOLS = new Set([
  'create_application',
  'update_application',
  'delete_application',
  'create_user',
  'update_user',
  'delete_user',
  'reset_user_password',
])

/**
 * 获取适合当前用户权限的工具集
 *
 * @param {object} userInfo  - 当前登录用户（来自 token-check）
 * @param {string} clientIp  - 客户端 IP
 * @returns {Promise<object[]>} 工具定义数组
 */
async function getAllTools(userInfo, clientIp) {
  const isAdmin = userInfo && userInfo.manager === constant.Manager.admin
  const isSuper = userInfo && userInfo.manager === constant.Manager.super

  log4js.info('[tools/index] loading tools for user %s (manager=%s)', userInfo && userInfo.username, userInfo && userInfo.manager)

  // 并行创建所有工具
  const [
    applicationTools,
    userTools,
    roleTools,
    permissionTools,
    resourceTools,
    categoryTools,
    userRoleTools,
    accessLogTools,
  ] = await Promise.all([
    createApplicationTools(),
    createUserTools(),
    createRoleTools(),
    createPermissionTools(),
    createResourceTools(),
    createCategoryTools(),
    createUserRoleTools(),
    createAccessLogTools(),
  ])

  let allTools = [
    ...applicationTools,
    ...userTools,
    ...roleTools,
    ...permissionTools,
    ...resourceTools,
    ...categoryTools,
    ...userRoleTools,
    ...accessLogTools,
  ]

  // admin 用户过滤掉 super-only 工具，避免 LLM 无效调用
  if (isAdmin && !isSuper) {
    allTools = allTools.filter(tool => !SUPER_ONLY_TOOLS.has(tool.name))
    log4js.info('[tools/index] filtered to %d tools for admin user', allTools.length)
  }

  // 注入用户上下文（userInfo/clientIp 对 LLM 透明）
  return injectUserContext(allTools, userInfo, clientIp)
}

module.exports = { getAllTools, SUPER_ONLY_TOOLS }
