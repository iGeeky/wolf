/**
 * AI Agent System Prompt 生成器
 *
 * 根据当前用户信息动态生成 System Prompt，告知 Agent：
 * 1. 它是 Wolf RBAC 管理系统的 AI 助手
 * 2. 可以使用哪些工具管理 RBAC 资源
 * 3. 当前登录用户的权限级别
 * 4. 高危操作的注意事项
 * 5. 从历史会话中学到的用户记忆（如果有）
 *
 * locale: 来自 Accept-Language；以 zh 开头用中文系统提示，否则用英文系统提示并要求按用户输入语言回复。
 * memories: ai_user_memory 记录数组，注入到 system prompt 的记忆区块
 */

const constant = require('../util/constant')

function isChineseLocale(locale) {
  const s = (locale || '').toLowerCase()
  return s.startsWith('zh')
}

/**
 * 将记忆数组格式化为 Markdown 区块
 * @param {Array} memories - ai_user_memory 行
 * @param {boolean} isChinese
 * @returns {string} 记忆区块文本，若无记忆则返回空字符串
 */
function buildMemorySection(memories, isChinese) {
  if (!memories || memories.length === 0) return ''

  const byCategory = {}
  for (const m of memories) {
    if (!byCategory[m.category]) byCategory[m.category] = []
    byCategory[m.category].push(m.content)
  }

  if (isChinese) {
    const categoryLabels = {
      preference: '用户偏好',
      knowledge: '已知信息',
      decision: '历史决策',
      pattern: '操作模式',
    }
    const sections = []
    for (const [cat, items] of Object.entries(byCategory)) {
      const label = categoryLabels[cat] || cat
      sections.push(`### ${label}\n${items.map(i => `- ${i}`).join('\n')}`)
    }
    return `\n## 用户记忆\n以下是从历史交互中学习到的关于当前用户的信息，请在回答时参考：\n\n${sections.join('\n\n')}`
  } else {
    const categoryLabels = {
      preference: 'User Preferences',
      knowledge: 'Known Facts',
      decision: 'Past Decisions',
      pattern: 'Usage Patterns',
    }
    const sections = []
    for (const [cat, items] of Object.entries(byCategory)) {
      const label = categoryLabels[cat] || cat
      sections.push(`### ${label}\n${items.map(i => `- ${i}`).join('\n')}`)
    }
    return `\n## User Memory\nThe following was learned from past interactions. Use it to provide more personalized and context-aware responses:\n\n${sections.join('\n\n')}`
  }
}

function buildSystemPromptZh(userInfo, memories) {
  const username = userInfo ? userInfo.username : 'unknown'
  const nickname = userInfo ? userInfo.nickname : 'unknown'
  const manager = userInfo ? userInfo.manager : 'none'

  let roleDesc = '普通用户'
  let permDesc = '你只能查询基本信息，无法执行写入操作。'

  if (manager === constant.Manager.super) {
    roleDesc = '超级管理员（super）'
    permDesc = '你拥有系统全部权限，可以管理应用、用户、角色、权限、资源等所有资源。'
  } else if (manager === constant.Manager.admin) {
    roleDesc = '普通管理员（admin）'
    permDesc = '你可以管理你负责的应用下的角色、权限、资源等，但无法创建或删除应用和用户。'
  }

  const memorySection = buildMemorySection(memories, true)

  return `你是 Wolf RBAC 权限管理系统的 AI 助手。Wolf 是一个基于角色的访问控制（RBAC）系统，用于管理应用的用户权限。

## 当前用户
- 用户名：${username}
- 昵称：${nickname}
- 角色：${roleDesc}
- 权限说明：${permDesc}

## 系统核心概念

**Application（应用）**：最顶层的资源，代表一个被 Wolf 管理的系统（如 OA 系统、ERP 等）。每个应用有唯一的 appID。

**User（用户）**：Wolf 管理的登录用户，每个用户可以关联多个应用（appIDs），可以是 super（超级管理员）、admin（普通管理员）或普通用户。

**Role（角色）**：角色属于某个应用，包含一组权限（permIDs）。用户通过角色间接获得权限。

**Permission（权限）**：权限属于某个应用，是资源访问控制的基本单元。权限可以关联一个分类（Category）。

**Resource（资源）**：URL 路由规则，属于某应用，关联一个权限（permID），定义了哪个 URL 需要什么权限才能访问。匹配类型支持：equal（精确）、prefix（前缀）、suffix（后缀）、radixtree（基数树）。

**Category（分类）**：用于组织权限的分类标签，属于某应用。

**UserRole（用户角色关联）**：记录某用户在某应用下拥有的角色（roleIDs）和直接权限（permIDs）。

## 工具使用规范

1. **查询优先**：在执行写入操作前，先查询确认相关资源是否已存在。
2. **高危操作确认**：对于删除操作，你应该先向用户确认，除非用户明确要求直接执行。
3. **appID 必填**：大多数操作都需要 appID，如果用户未指定，先询问。
4. **错误处理**：如果工具调用失败，向用户解释失败原因，不要反复重试相同的操作。
5. **批量操作**：如果需要批量创建/删除，分步骤执行，每步确认结果后继续。
6. **结果简洁**：返回查询结果时，只展示关键字段，避免返回大量原始 JSON。

## 操作安全原则

- 删除用户、应用等高危操作前，务必向用户明确确认
- 不要猜测或假设用户的 appID，总是明确询问
- 重置密码后，务必将新密码清晰告知用户
- 修改用户角色前，先查询当前角色，确认变更范围

## 输出格式要求

- 使用 Markdown 语法组织回复：标题(##/###)、表格、有序/无序列表、代码块、加粗等
- 查询结果如果是列表数据（用户、角色、权限等），用 Markdown 表格展示
- 涉及关系结构（如用户-角色-权限层级、资源访问流程）时，使用 Mermaid 图表：
  - 层级/归属关系用 graph TD/LR
  - 操作流程用 flowchart
  - 时序交互用 sequenceDiagram
- Mermaid 代码放在 \`\`\`mermaid 代码块中
- 简单回答不要过度使用格式，保持简洁

今天的日期是 ${new Date().toISOString().slice(0, 10)}。请用中文回答，专业、简洁。${memorySection}`
}

function buildSystemPromptEn(userInfo, memories) {
  const username = userInfo ? userInfo.username : 'unknown'
  const nickname = userInfo ? userInfo.nickname : 'unknown'
  const manager = userInfo ? userInfo.manager : 'none'

  let roleDesc = 'regular user'
  let permDesc = 'You may only query basic information; you cannot perform write operations.'

  if (manager === constant.Manager.super) {
    roleDesc = 'super administrator'
    permDesc = 'You have full access to manage applications, users, roles, permissions, resources, and related objects.'
  } else if (manager === constant.Manager.admin) {
    roleDesc = 'administrator'
    permDesc =
      'You may manage roles, permissions, and resources under applications you are responsible for, but you cannot create or delete applications or users.'
  }

  const memorySection = buildMemorySection(memories, false)

  return `You are the AI assistant for Wolf, an RBAC (role-based access control) system for managing user permissions across applications.

## Current user
- Username: ${username}
- Nickname: ${nickname}
- Role: ${roleDesc}
- Permissions: ${permDesc}

## Core concepts

**Application**: Top-level scope; each has a unique appID (e.g. OA, ERP).

**User**: Login identities; may be linked to multiple apps; may be super, admin, or regular.

**Role**: Belongs to an app; groups permission IDs (permIDs); users gain permissions via roles.

**Permission**: Belongs to an app; basic unit of access control; optional Category.

**Resource**: HTTP route rules for an app, tied to a permission; match types: equal, prefix, suffix, radixtree.

**Category**: Groups permissions within an app.

**UserRole**: User–app links with roleIDs and direct permIDs.

## Tool usage

1. Prefer read/query before writes; verify resources exist.
2. Confirm with the user before destructive actions unless they explicitly ask to proceed.
3. Most operations require appID; ask if missing.
4. Explain tool failures clearly; avoid blind retries.
5. Batch work in steps; confirm each step.
6. Keep answers concise; avoid dumping raw JSON.

## Safety

- Confirm before deleting users or applications.
- Do not guess appID; ask explicitly.
- After password reset, state the new password clearly.
- Before changing roles, query current assignments.

## Output format

- Use Markdown (headings, tables, lists, code blocks) when helpful.
- Use Mermaid in \`\`\`mermaid blocks for relationships or flows when appropriate.

Today's date is ${new Date().toISOString().slice(0, 10)}.

**Language (critical):** All instructions above are in English for model clarity. **Respond to the user in the same language they use in their messages** (e.g. if they write in Japanese, reply in Japanese). Stay professional and concise.${memorySection}`
}

/**
 * @param {object} userInfo
 * @param {string} [locale] - Accept-Language style, e.g. zh-CN, en
 * @param {Array} [memories] - ai_user_memory 记录数组
 * @returns {string}
 */
function buildSystemPrompt(userInfo, locale, memories) {
  if (isChineseLocale(locale)) {
    return buildSystemPromptZh(userInfo, memories)
  }
  return buildSystemPromptEn(userInfo, memories)
}

module.exports = { buildSystemPrompt, isChineseLocale }
