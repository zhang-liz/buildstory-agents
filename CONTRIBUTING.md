# Contributing to BuildStory.Agents

Thanks for helping improve this project. This document is the source of truth for local setup and pull requests.

## Prerequisites

- **[Bun](https://bun.sh)** — primary runtime and package manager (`package.json` pins `packageManager`).
- **Node.js 20+** — optional; some editors and tools expect it.
- **Supabase** project and **OpenAI** API access for full app behavior.

## Getting started

1. Clone the repository and install dependencies:

   ```bash
   bun install
   ```

2. Copy environment template and fill in secrets:

   ```bash
   cp .env.example .env.local
   ```

3. Apply the database schema from `database/schema.sql` in the Supabase SQL editor.

4. Run the dev server:

   ```bash
   bun dev
   ```

Open [http://localhost:3000](http://localhost:3000).

## Node-only workflows

If you do not use Bun for scripts, you can still run tooling that invokes `node` directly (for example `node update_schema.js`). The app itself is developed and tested with Bun.

## Before you open a pull request

1. **Lint** (TypeScript + ESLint):

   ```bash
   bun run lint
   ```

2. **Tests**:

   ```bash
   bun run test
   ```

3. **Format** (optional but appreciated):

   ```bash
   bun run format
   ```

CI runs install, lint, test, and build on pushes and pull requests.

## Database helper: `update_schema.js`

The script aligns the `events` table persona constraint with the app. It calls a Supabase RPC named `exec_sql`.

1. Define `exec_sql` in Supabase (see the SQL block in the README under “Database Helpers”).
2. Ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set — the script loads `.env` first, then **overrides with `.env.local`**, matching Next.js conventions.
3. Run:

   ```bash
   node update_schema.js
   ```

## Project layout (short)

- `src/app/` — App Router pages and API routes.
- `src/lib/` — Shared types and client-safe code.
- `src/lib/server/` — Server-only code (agents, database, bandit, config). Do not import from client components.
- `database/schema.sql` — PostgreSQL schema for Supabase.

## Code style

- Match existing patterns: TypeScript, Zod where schemas already exist, `server-only` for server modules.
- Prefer focused changes; avoid unrelated refactors in the same PR.
- Add or update tests when behavior changes.

## Security

Do not commit secrets. Report security issues as described in [SECURITY.md](SECURITY.md).

## Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). Participation requires respectful, professional interaction.
