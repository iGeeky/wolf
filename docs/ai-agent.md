[中文](ai-agent-cn.md)

# Wolf AI Assistant User Guide

This guide is for administrators and end users who want to enable and use the AI assistant inside Wolf. For a feature overview, start with [README-AI-AGENT-EN.md](../README-AI-AGENT-EN.md).

# Table of contents

- [1. What the AI assistant can do](#1-what-the-ai-assistant-can-do)
- [2. Prerequisites](#2-prerequisites)
  - [2.1 Database upgrade](#21-database-upgrade)
  - [2.2 Install dependencies](#22-install-dependencies)
- [3. Configure the AI model](#3-configure-the-ai-model)
  - [3.1 Configuration reference](#31-configuration-reference)
  - [3.2 Provider examples](#32-provider-examples)
  - [3.3 API key resolution order](#33-api-key-resolution-order)
  - [3.4 No migration needed when you switch models](#34-no-migration-needed-when-you-switch-models)
- [4. Using it in the Console](#4-using-it-in-the-console)
  - [4.1 Open the AI Assistant page](#41-open-the-ai-assistant-page)
  - [4.2 Session management](#42-session-management)
  - [4.3 User memory](#43-user-memory)
- [5. Tool catalog](#5-tool-catalog)
- [6. Auditing AI activity](#6-auditing-ai-activity)
- [7. Authorization model](#7-authorization-model)
- [8. SSE event protocol (integration reference)](#8-sse-event-protocol-integration-reference)
- [9. HTTP API summary](#9-http-api-summary)
- [10. FAQ](#10-faq)

---

## 1. What the AI assistant can do

The Wolf AI assistant is a **conversational RBAC console embedded in the Wolf Console**. You can drive Wolf with natural language:

- Query: *"How many roles does `oa-app` have? What permissions does each role hold?"*
- Create: *"Under `pi-mono`, create a `viewer` role and grant it every permission whose ID starts with `read_`."*
- Update: *"Remove the `delete_user` permission from the `admin` role."*
- Delete: *"Delete the `legacy-app` application."* (destructive — the AI will ask for confirmation)
- Audit: *"Were there any `403` accesses in the past week?"*
- Bigger tasks: *"I need three roles for the sales team — `sales-leader` / `sales-staff` / `sales-readonly`. Suggest permissions based on naming conventions, show me the plan first, and once I approve, create them."*

The assistant invokes Wolf's existing Controllers directly, so actions go through **exactly the same code path** as manual Console actions — including auth checks, argument validation, audit logging, and cache invalidation.

## 2. Prerequisites

### 2.1 Database upgrade

The assistant introduces 3 new tables:

| Table | Purpose |
|-------|---------|
| `ai_chat_session` | One session (one row in the sidebar) |
| `ai_chat_message` | One message (user / assistant / toolResult), stored as JSON |
| `ai_user_memory` | One user memory extracted from past sessions, injected into the next session's System Prompt |

**Fresh install**: use `server/script/db-psql.sql` (PostgreSQL) or `server/script/db-mysql.sql` (MySQL). They already include the new tables.

**Upgrading from 0.6.x / 0.7.x**: run the `upgrade to 0.8.x` section of the upgrade script:

```bash
# PostgreSQL
psql -U wolfroot -d wolf -f server/script/db-psql-upgrade.sql

# MySQL
mysql -uwolfroot -p wolf < server/script/db-mysql-upgrade.sql
```

> The upgrade script is idempotent for earlier sections; if you only want the 0.8.x changes, open the file and run just the `upgrade to 0.8.x` block.

### 2.2 Install dependencies

The server adds two core packages to `package.json`:

```
@mariozechner/pi-agent-core
@mariozechner/pi-ai
```

Both are ESM-only, while Wolf-Server itself is CommonJS — they are loaded via dynamic `import()`. **Requirement: Node.js >= 18.**

Then:

```bash
cd server
pnpm install   # or npm install
```

> If you build Docker images (`bin/build-all.sh`), dependencies are installed inside the image — no manual step needed.

## 3. Configure the AI model

### 3.1 Configuration reference

Everything lives under the `ai` section of `server/conf/config.js`, and every field can be overridden via environment variable:

```js
ai: {
  provider:           process.env.AI_PROVIDER       || 'openai',
  model:              process.env.AI_MODEL          || 'deepseek-v4-flash',
  api:                process.env.AI_API            || 'openai-completions',
  apiKey:             process.env.AI_API_KEY        || '',
  baseUrl:            process.env.AI_BASE_URL       || '',
  maxTurns:           parseInt(process.env.AI_MAX_TURNS)       || 20,
  maxHistoryMessages: parseInt(process.env.AI_MAX_HISTORY)     || 100,
  thinkingLevel:      process.env.AI_THINKING_LEVEL || 'low',
}
```

| Field | Env var | Default | Description |
|-------|---------|---------|-------------|
| `provider` | `AI_PROVIDER` | `openai` | `openai` / `anthropic` / `google` / `mistral` / `groq` / `xai` / `openrouter` |
| `model` | `AI_MODEL` | `deepseek-v4-flash` | Model ID, e.g. `deepseek-v4-flash`, `gpt-4o`, `claude-3-5-sonnet-20241022`, `gemini-1.5-pro`, `qwen3.5-plus` |
| `api` | `AI_API` | `openai-completions` | API protocol. If the model is in the `pi-ai` built-in registry it is auto-detected; otherwise this value is used as fallback. Common: `openai-completions` (all OpenAI-compatible gateways), `openai-responses` (OpenAI's new Responses API only), `anthropic-messages`, `google-generative-ai` |
| `apiKey` | `AI_API_KEY` | empty | API key. If empty, falls back to provider-specific env vars (see 3.3) |
| `baseUrl` | `AI_BASE_URL` | empty | Custom API URL, for proxies / self-hosted / regional gateways. Must include the version path, e.g. `https://api.deepseek.com/v1` |
| `maxTurns` | `AI_MAX_TURNS` | `20` | Max agent rounds per user turn (loop guard) |
| `maxHistoryMessages` | `AI_MAX_HISTORY` | `100` | Number of recent messages injected into context. Excess is pruned while keeping related assistant follow-ups intact |
| `thinkingLevel` | `AI_THINKING_LEVEL` | `low` | `low` / `medium` / `high`. Only meaningful for thinking-capable models |

> ⚠️ **Do not switch `api` to `openai-responses`** unless you are talking to OpenAI's official Responses endpoint. For dashscope, self-hosted vLLM, Ollama, or any other OpenAI-compatible gateway, keep it on `openai-completions`.

### 3.2 Provider examples

**DeepSeek (recommended default)**:

```bash
export AI_PROVIDER=openai
export AI_MODEL=deepseek-v4-flash
export AI_BASE_URL=https://api.deepseek.com/v1
export AI_API_KEY=sk-...
# AI_API defaults to openai-completions
```

**Anthropic Claude**:

```bash
export AI_PROVIDER=anthropic
export AI_MODEL=claude-3-5-sonnet-20241022
export AI_API_KEY=sk-ant-...
export AI_API=anthropic-messages
```

**Google Gemini**:

```bash
export AI_PROVIDER=google
export AI_MODEL=gemini-1.5-pro
export AI_API_KEY=...
export AI_API=google-generative-ai
```

**Alibaba DashScope (Qwen) — OpenAI-compatible mode**:

```bash
export AI_PROVIDER=openai
export AI_MODEL=qwen-plus               # or qwen3.5-plus, qwen-max, ...
export AI_API=openai-completions
export AI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
export AI_API_KEY=sk-...
```

**Self-hosted vLLM / Ollama / SGLang**:

```bash
export AI_PROVIDER=openai
export AI_MODEL=qwen3.6-35b            # whatever name your service exposes
export AI_API=openai-completions
export AI_BASE_URL=http://10.0.0.10:8000/v1
export AI_API_KEY=any-string             # most local stacks accept any string
```

**OpenRouter**:

```bash
export AI_PROVIDER=openrouter
export AI_MODEL=anthropic/claude-3.5-sonnet
export AI_API_KEY=sk-or-...
```

### 3.3 API key resolution order

`server/src/ai/ai-config.js` resolves the API key in this order:

1. `wolfConfig.ai.apiKey` (i.e. `AI_API_KEY`) — **only when the requested provider equals the currently configured provider**
2. The provider-specific standard environment variable:

| Provider | Env var |
|----------|---------|
| `openai` | `OPENAI_API_KEY` |
| `anthropic` | `ANTHROPIC_API_KEY` |
| `google` | `GEMINI_API_KEY` |
| `mistral` | `MISTRAL_API_KEY` |
| `groq` | `GROQ_API_KEY` |
| `xai` | `XAI_API_KEY` |
| `openrouter` | `OPENROUTER_API_KEY` |

> This dual scheme suits both deployments (one `AI_API_KEY` injected per container) and local dev (re-use whatever SDK env vars you already export).

### 3.4 No migration needed when you switch models

Swapping `provider` / `model` / `baseUrl` is hot-pluggable:

- Stored messages are provider-agnostic plain text and structured payloads. **Old sessions remain usable after you switch models.**
- Token usage stats (`ai_chat_message.token_usage`) are preserved as-is.
- User memories are plain text and unaffected by model swaps.

## 4. Using it in the Console

### 4.1 Open the AI Assistant page

1. Log into the Wolf Console (`http://localhost:12188/` or your deployment URL).
2. In the left-hand nav, click **AI Assistant** (中文: AI 助手; 日本語: AIアシスタント).
3. You land on `/ai/chat`.

| ![AI Assistant entry and welcome screen](./imgs/screenshot/console/ai-chat/ai-chat-welcome.png) |
|:--:|
| *Left nav **AI Assistant** entry; welcome hints and example prompts when no session is selected* |

> If no API key is configured, sending a message yields a friendly error asking the administrator to check the model configuration (`AI_API_KEY`, model name, `baseUrl`). Everything else in the Console continues to work.

| ![AI not configured](./imgs/screenshot/console/ai-chat/ai-chat-not-configured.png) |
|:--:|
| *Error prompt when the AI model / API key is not configured* |

### 4.2 Session management

The **Sessions** panel on the left:

- **New**: click "New", or just send a message in an empty state (a session is auto-created with a title taken from the first 20 characters of your message).
- **Switch**: click any session to load its history.
- **Rename**: via the action button; or let the AI summarize the conversation into a tighter title ("✨ Auto rename").
- **Delete**: soft delete (`status=0`), which also removes the session's messages from the visible list.

Each session is bound to the logged-in user.

| ![Session list](./imgs/screenshot/console/ai-chat/ai-chat-overview.png) |
|:--:|
| *Multiple sessions in the sidebar; the selected session shows chat history on the right* |

| ![Auto-generate session name](./imgs/screenshot/console/ai-chat/ai-chat-auto-rename.png) |
|:--:|
| *Hover the magic-wand icon to auto-generate a session title from the conversation* |

### 4.3 User memory

The "💾 Memory" entry at the bottom of the sidebar opens the memory panel. Memories are grouped into 4 categories:

| Category | Meaning | Example |
|----------|---------|---------|
| `preference` | User preferences | "Prefers tables for query results" / "Always uses Chinese" |
| `knowledge` | Known facts about the system | "OA system appID is `oa-app`" / "`admin` role has permissions X, Y, Z" |
| `decision` | Past decisions | "Decided to remove user A from role R" |
| `pattern` | Operation patterns | "Frequently queries permission config for `oa-app`" |

How it works:

1. **Automatic extraction**: Every time you create a new session, the server asynchronously analyzes the *previous* session, calls the LLM to extract 0..N new memory entries, and marks outdated ones as deprecated.
2. **Manual editing**: The panel lets you **add / edit / delete** memories directly.
3. **Injection**: The next time the Agent starts, all `status=1` memories are folded into the System Prompt, grouped by category.

> Memory is strictly per-user; nothing is shared across users.

| ![Memory panel with entries](./imgs/screenshot/console/ai-chat/ai-chat-memory-panel.png) |
|:--:|
| *Memory panel: entries grouped by category, with auto-extracted and manual sources* |

| ![Empty memory panel](./imgs/screenshot/console/ai-chat/ai-chat-memory-empty.png) |
|:--:|
| *Empty state: "No memories yet. Start chatting and the AI will learn automatically."* |

| ![Add a memory manually](./imgs/screenshot/console/ai-chat/ai-chat-memory-add.png) |
|:--:|
| *Manually add a memory: pick a category and enter content* |

## 5. Tool catalog

Below are all 31 tools. **Tools marked `[super]` are only exposed to `super` users** — `admin` users will not see them and the LLM cannot invoke them.

### Application (6)

| Tool | Purpose | Notes |
|------|---------|-------|
| `list_applications` | List apps | Supports `key` / `page` / `limit` |
| `get_application` | App detail | |
| `create_application` `[super]` | Create an app | Unique `id`, optional OAuth2 `secret` |
| `update_application` `[super]` | Update an app | Name / description |
| `delete_application` `[super]` | Delete an app | **Destructive** — wipes all RBAC data under the app |
| `get_rbac_diagram` | RBAC relationship graph data | Renders well with Mermaid |

| ![RBAC relationship diagram](./imgs/screenshot/console/ai-chat/ai-chat-mermaid1.png) |
|:--:|
| *Example: user–role–permission relationship diagram for an application* |

| ![RBAC auth flowchart](./imgs/screenshot/console/ai-chat/ai-chat-mermaid2.png) |
|:--:|
| *Example: RBAC authorization flow rendered as a Mermaid flowchart* |

| ![Markdown table reply](./imgs/screenshot/console/ai-chat/ai-chat-markdown-table.png) |
|:--:|
| *Example: query results rendered as a Markdown table* |

### User (5)

| Tool | Purpose | Notes |
|------|---------|-------|
| `list_users` | List users | `admin` users only see users under apps they manage |
| `create_user` `[super]` | Create a user | Password can be auto-generated |
| `update_user` `[super]` | Update a user | Includes the `manager` field to promote/demote |
| `delete_user` `[super]` | Delete a user | **Destructive** |
| `reset_user_password` `[super]` | Reset password | Returns the new random password |

### Role (4) / Permission (4) / Resource (4) / Category (4)

Each provides `list_xxx` / `create_xxx` / `update_xxx` / `delete_xxx`, with parameters mirroring the same forms in the Console. See `server/src/ai/tools/*.js` for exact schemas.

### UserRole (3)

| Tool | Purpose | Notes |
|------|---------|-------|
| `get_user_roles` | Roles + direct permissions a user has in an app | |
| `set_user_roles` | Set roles / permissions for a user in an app | **Overwrites**; passing an empty array clears |
| `delete_user_roles` | Remove the user's entire link to that app | |

### AccessLog (1)

| Tool | Purpose | Notes |
|------|---------|-------|
| `query_access_logs` | Query audit log | Pass `appID="ai-agent"` to see only AI-driven actions |

---

## 6. Auditing AI activity

When the AI calls a Controller via `InternalCaller`, an `access_log` entry is recorded. Key fields:

| Field | AI action | Manual action |
|-------|-----------|---------------|
| `appID` | `'ai-agent'` | Real app ID (e.g. `wolf-console`) |
| `userID` / `username` | The logged-in user | Same |
| `action` | HTTP method | Same |
| `resName` | Internal path (e.g. `/wolf/role`) | URL path |
| `body` | Tool arguments | Request body |

To see everything the AI has done: in the "Access Log" page choose **Application = `ai-agent`**, or simply ask the AI: *"List all `ai-agent` actions in the last day."*

| ![Query AI access logs in chat](./imgs/screenshot/console/ai-chat/ai-chat-audit-log-ai-agent.png) |
|:--:|
| *Ask the assistant to query `appID=ai-agent` access logs; tool calls and results appear inline* |

## 7. Authorization model

| Aspect | Behaviour |
|--------|-----------|
| Login required | ✅ Enforced by the `token-check` middleware |
| Who can use it | Any user who can log into the Console (`super` / `admin` / regular) |
| What tools are exposed | Determined by the logged-in user's `manager` field. `admin` users never see `super`-only tools; the LLM cannot try to call them |
| Can the AI escalate privileges | ❌ No. `super`-only tools are filtered out at `getAllTools()` time |
| Can the AI bypass Controller checks | ❌ No. Every call passes through `InternalCaller` → `Controller.access()` |
| Cross-user visibility | ❌ None. `ai_chat_session.userID` / `ai_user_memory.userID` enforce strict isolation |

## 8. SSE event protocol (integration reference)

`POST /wolf/ai-chat/chat` returns `Content-Type: text/event-stream`. Each event is `data: {json}\n\n`.

Event types:

| `type` | Emitted when | Key fields |
|--------|--------------|------------|
| `session_created` | A new session is auto-created | `sessionId` |
| `agent_start` | The Agent starts processing this user turn | — |
| `message_start` | A new `assistant` / `user` / `toolResult` message starts streaming | `message` |
| `message_update` | Streaming token increment | `message`, `event` |
| `message_end` | A single message finishes streaming | `message` |
| `done` | The full Agent turn finishes | `tokenUsage` (input / output / cost) |
| `error` | Anything fails | `error` (human-readable string) |

The reference frontend implementation lives in `console/src/api/ai-chat.ts` (function `chatStream`, an AsyncGenerator over native `fetch + ReadableStream`).

## 9. HTTP API summary

All AI endpoints live under `service = ai-chat` (controller `server/src/controllers/ai-chat.js`):

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/wolf/ai-chat/chat` | SSE streaming conversation (core endpoint) |
| `GET` | `/wolf/ai-chat/sessions` | Current user's sessions |
| `POST` | `/wolf/ai-chat/createSession` | Create a session (and trigger memory extraction) |
| `DELETE` | `/wolf/ai-chat/deleteSession` | Soft-delete a session |
| `PUT` | `/wolf/ai-chat/renameSession` | Rename a session |
| `GET` | `/wolf/ai-chat/messages` | Messages of a session |
| `POST` | `/wolf/ai-chat/autoRenameSession` | Let the AI summarize a session title |
| `GET` | `/wolf/ai-chat/memories` | Current user's memories |
| `POST` | `/wolf/ai-chat/memory` | Add a memory |
| `PUT` | `/wolf/ai-chat/memory` | Edit a memory |
| `DELETE` | `/wolf/ai-chat/memory` | Delete a memory |

All requests require the standard Console `x-rbac-token`. Response shape is the regular Wolf envelope: `{ ok, reason?, errmsg?, data? }`.

## 10. FAQ

**Q1. Opening the AI page returns 503 / `AI_NOT_CONFIGURED`?**

A: The server cannot find an API key, or the model call failed. Sending a message shows: *"AI returned no content. Please ask an administrator to check the model configuration (model name, API key, baseUrl)."* Check that:
- `AI_API_KEY` is set **and** matches the configured `AI_PROVIDER`; OR
- A provider-specific env var is set (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, …).
- Restart `server` after exporting the variable.

**Q2. The AI just spins and never replies?**

A: Common causes:
- `baseUrl` is wrong (unreachable gateway).
- `model` is not recognized by your provider (when using OpenAI-compatible gateways, `pi-ai` builds a fallback model object, but the gateway still has to accept the model name).
- Your API key is not authorized for that model on the gateway.
- Check the server logs (`log4js`); search for `[AgentFactory]` and `[ai-chat]`.

**Q3. The AI reply contains `<think>...</think>` text?**

A: Some models (DeepSeek-R1, Qwen-thinking, …) emit explicit reasoning blocks. The server's `sanitize-message.js` strips them before forwarding to the frontend. If you still see them, the model output format may have changed — please file an issue.

**Q4. How do I run the assistant in "read-only" mode?**

A: Tools are filtered by the user's `manager` field. For read-only behaviour, temporarily set the user's `manager` field to `null` (regular user) — they can still query but cannot invoke write tools.

**Q5. Results get truncated when they are too long?**

A: `maxHistoryMessages = 100` by default; older messages are pruned while keeping related context coherent. For very large single responses, ask the AI to narrow the query via `key` / `page` / `limit`.

**Q6. Can concurrent users leak data into each other's sessions?**

A: No. `ai_chat_session.userID` / `ai_user_memory.userID` enforce isolation. SSE streams are per-request; Agent instances are created per turn and discarded — there is no shared global state.

**Q7. Can I swap models without losing history?**

A: Yes. Messages and memories are plain text, provider-agnostic. Just change the env vars and restart.

**Q8. How do I tell AI actions apart from Console actions in the audit log?**

A: Look at the `appID` column. AI activity is always `ai-agent`. Manual Console activity uses the real target app ID (the Console itself is `wolf-console`, business apps use their own IDs).

---

[Back to TOC](#table-of-contents)
