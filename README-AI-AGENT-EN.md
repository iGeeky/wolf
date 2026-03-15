[中文](README-AI-AGENT-CN.md) | [Back to main README](README.md)

# Wolf AI Assistant

> Manage Wolf RBAC objects — applications, users, roles, permissions, resources — through natural-language conversation, right inside the Wolf Console. No more clicking through forms one by one.

[![GitHub stars](https://img.shields.io/github/stars/iGeeky/wolf?style=social)](https://github.com/iGeeky/wolf/stargazers)
[![License](https://img.shields.io/github/license/iGeeky/wolf)](./LICENSE)

## What is this

`Wolf AI Assistant` (a.k.a. Wolf AI Agent) is a new capability introduced in Wolf `0.8.x`. It adds an AI chat surface to the Console that lets you drive the existing RBAC APIs by simply asking:

- *"Show me every role under the `oa-app` application and the permissions each role has."*
- *"In the `pi-mono` application, create a `viewer` role and grant it every permission whose ID starts with `read_`."*
- *"Did any access by user `admin` to `oa-app` fail in the last 7 days?"*
- *"Reset the password for user `lily` and tell me the new one."*

The assistant does **not** bypass Wolf's existing authorization logic to poke the database directly. It uses **tool calling** to invoke Wolf's own Controllers, reusing every existing piece of plumbing: argument validation, access checks, cache invalidation, audit logging, and so on. Therefore:

- What it *can* do = what the currently logged-in user can do in the Console.
- What it *did* = recorded in the `access_log` table with `appID = 'ai-agent'`, fully auditable.

## Highlights

### 1. Conversational RBAC management

Covers every core Wolf entity:

| Entity | Tools | Tool names |
|--------|------|------------|
| Application | 6 | `list_applications` / `get_application` / `create_application` / `update_application` / `delete_application` / `get_rbac_diagram` |
| User | 5 | `list_users` / `create_user` / `update_user` / `delete_user` / `reset_user_password` |
| Role | 4 | `list_roles` / `create_role` / `update_role` / `delete_role` |
| Permission | 4 | `list_permissions` / `create_permission` / `update_permission` / `delete_permission` |
| Resource | 4 | `list_resources` / `create_resource` / `update_resource` / `delete_resource` |
| Category | 4 | `list_categories` / `create_category` / `update_category` / `delete_category` |
| UserRole | 3 | `get_user_roles` / `set_user_roles` / `delete_user_roles` |
| AccessLog | 1 | `query_access_logs` |

> The tool set is filtered automatically per user role. `admin` users will never see or be able to invoke `super`-only tools such as `create_application`, `delete_user`, or `reset_user_password`.

### 2. Multi-session support

- Session list in the sidebar: create / switch / rename / delete / AI auto-title
- History replay: messages and tool calls are persisted; reload preserves the whole conversation
- Per-user isolation: each user only sees their own sessions

### 3. Streaming + visualized tool calls

- The server streams Agent events over SSE; the AI reply renders token by token
- Each tool call is rendered as a standalone card inside the chat stream: arguments, status (running/done/error), and result are all visible
- Markdown + Mermaid rendering supported (ask the AI to *draw* the role-permission graph and it will)

| ![Markdown table in AI reply](./docs/imgs/screenshot/console/ai-chat/ai-chat-markdown-table.png) |
|:--:|
| *Query results rendered as Markdown tables* |

| ![RBAC relationship diagram](./docs/imgs/screenshot/console/ai-chat/ai-chat-mermaid1.png) |
|:--:|
| *User–role–permission relationship diagram (Mermaid)* |

| ![RBAC auth flowchart](./docs/imgs/screenshot/console/ai-chat/ai-chat-mermaid2.png) |
|:--:|
| *RBAC authorization flow rendered as a Mermaid flowchart* |

### 4. User memory

> Every time you create a new session, the assistant asynchronously extracts the key takeaways from the previous session into "memories" and injects them into the System Prompt of the next session.

- 4 categories: **preference**, **knowledge**, **decision**, **pattern**
- Automatic extraction + manual editing: view, edit, delete, and add memories from the UI
- Strictly scoped per user

### 5. Audit trail

Every write performed by the AI is recorded in `access_log` with `appID = 'ai-agent'`, making it trivial to separate AI activity from human Console activity after the fact.

### 6. Multi-provider support

Powered by [`@mariozechner/pi-ai`](https://www.npmjs.com/package/@mariozechner/pi-ai) + [`@mariozechner/pi-agent-core`](https://www.npmjs.com/package/@mariozechner/pi-agent-core). Out-of-the-box providers:

- **OpenAI** (and any OpenAI-compatible gateway: dashscope, self-hosted vLLM/ollama, etc.)
- **Anthropic** (Claude family)
- **Google Gemini**
- **Mistral**
- **Groq**
- **xAI**
- **OpenRouter**

Model name, API key, and base URL are all configurable via environment variables or `server/conf/config.js`.

## Screenshot

| ![AI Assistant main UI](./docs/imgs/screenshot/console/ai-chat/ai-chat-overview.png) |
|:--:|
| *AI Assistant: session list, chat area, and Mermaid diagram rendering* |

## Quick start (3 steps)

### 1) Upgrade the database

The assistant relies on 3 new tables: `ai_chat_session`, `ai_chat_message`, `ai_user_memory`.

```bash
# PostgreSQL — run the "upgrade to 0.8.x" section in the upgrade script,
# or use db-psql.sql for a fresh install.
psql -U wolfroot -d wolf -f server/script/db-psql-upgrade.sql

# Or MySQL
mysql -uwolfroot -p wolf < server/script/db-mysql-upgrade.sql
```

### 2) Configure an AI model

The easiest path is environment variables. DeepSeek example:

```bash
export AI_PROVIDER=openai
export AI_MODEL=deepseek-v4-flash
export AI_BASE_URL=https://api.deepseek.com/v1
export AI_API_KEY=sk-...

cd server && pnpm install && pnpm run start
```

OpenAI-compatible gateways, Anthropic, Gemini, Mistral, and friends are also supported. See the "Configuration" section in [docs/ai-agent.md](./docs/ai-agent.md).

### 3) Open the Console

```bash
cd console && pnpm install && pnpm run dev
```

Visit `http://localhost:12188/`, log in, then click **AI Assistant** in the left-hand menu.

> If no API key is configured, sending a message yields a friendly error asking the administrator to check the model configuration. The rest of the Console is unaffected.

| ![AI not configured](./docs/imgs/screenshot/console/ai-chat/ai-chat-not-configured.png) |
|:--:|
| *Prompt when AI model / API key is not configured* |

## Security model

| Aspect | Behaviour |
|--------|-----------|
| **Authentication** | Reuses the Console's existing `x-rbac-token`; anonymous access is rejected |
| **Authorization** | Tool calls go through each Controller's own `access()` check — the AI is not a back-door |
| **Scope** | Tool set is filtered by `super` / `admin` role; the LLM never "sees" tools it cannot use |
| **Isolation** | Sessions, messages, and memories are partitioned by `userID` |
| **Audit** | Every write hits `access_log` with `appID='ai-agent'` |
| **Destructive ops** | The System Prompt instructs the AI to ask for confirmation before deletes |

## Configuration at a glance

The `ai` section in `server/conf/config.js` (every field can also be injected via environment variables):

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

Defaults, allowed values, and best practice notes live in [docs/ai-agent.md](./docs/ai-agent.md).

## Architecture

```
┌────────────────────┐   SSE   ┌────────────────────────────────────────┐
│  Console (Vue 3)   │ <─────> │  Server (Koa + pi-mono)                │
│  /ai/chat          │         │                                        │
│  - SessionList     │         │  controllers/ai-chat.js                │
│  - ChatWindow      │         │      │                                 │
│  - MemoryPanel     │         │      ▼                                 │
└────────────────────┘         │  ai/agent-factory.js                   │
                               │      │                                 │
                               │      ▼                                 │
                               │  ai/tools/* (8 domain tool packs)      │
                               │      │                                 │
                               │      ▼                                 │
                               │  ai/internal-caller.js                 │
                               │      │                                 │
                               │      ▼                                 │
                               │  controllers/* (reused as-is)          │
                               │      │                                 │
                               │      ▼                                 │
                               │  PostgreSQL / MySQL + access_log       │
                               └────────────────────────────────────────┘
```

**Key design choices**:

- Tool calls go through `InternalCaller`, which builds a mock Koa `ctx` so that **every existing Controller is reused verbatim** (including `access()`, `log()`, parameter validation, etc.).
- The tool layer is decoupled from the LLM and maps one-to-one to Wolf RBAC APIs.
- The frontend handles SSE with native `fetch + ReadableStream`; an AsyncGenerator turns the event stream into a `for await` loop.

## Documentation

- 📖 **[Full usage guide](./docs/ai-agent.md)** — configuration, walkthroughs, tool reference, memory system, FAQ
- 🌍 **[中文版](./README-AI-AGENT-CN.md)**

## Compatibility

- Server: Node.js >= 18 (dynamic `import()` is used to load the ESM-only `pi-mono`)
- Frontend: ships with Wolf Console v0.8.x (Vue 3 + Vite)
- Database: PostgreSQL >= 10 / MySQL >= 5.7 (JSON column type required)
- **Without an AI key, no other Wolf feature is affected.** The menu remains visible; sending a message in the AI chat shows a friendly configuration error.

## License

[MIT](./LICENSE)
