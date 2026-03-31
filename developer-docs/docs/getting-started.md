---
sidebar_position: 2
---

# Getting started

## Prerequisites

- [Bun](https://bun.sh) (primary package manager for the app)
- A [Supabase](https://supabase.com) project
- An [OpenAI](https://platform.openai.com) API key

Node.js 20+ is supported for tooling that expects Node.

## Clone and install

```bash
git clone https://github.com/yc-hackathon/buildstory-agents.git
cd buildstory-agents
bun install
```

## Database

1. Create a Supabase project.
2. Run `database/schema.sql` in the Supabase SQL editor.
3. For persona column migrations, see `update_schema.js` and the repository README section on `exec_sql`.

## Environment

Copy the template and fill in secrets:

```bash
cp .env.example .env.local
```

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | Yes | LLM calls for generation and rewrite |
| `SUPABASE_URL` | Yes | Database client |
| `SUPABASE_ANON_KEY` | Yes | Database client |
| `OPENAI_MODEL` | No | Chat model (default `gpt-4o`) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | No | Cross-instance rate limits for `/api/rewrite` and `/api/track` |

## Run the app

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000). Use `/api/debug` for a health-style snapshot when diagnosing env or connectivity.

## Run this documentation site

From the repository root:

```bash
bun run docs:dev
```

Or from `developer-docs/`:

```bash
bun install
bun start
```

The dev server defaults to port **3000**; if the Next app is already using it, Docusaurus will prompt for another port (for example **3001**).
