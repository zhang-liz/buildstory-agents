# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Runtime and setup

- Primary runtime/package manager is Bun (`packageManager: bun@1.3.8`).
- Main app runs as a Next.js App Router project from repository root.
- Required environment variables for full behavior:
  - `OPENAI_API_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
- Optional:
  - `OPENAI_MODEL` (defaults to `gpt-4o`)
  - `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (distributed rate limits; otherwise in-memory fallback)
- `src/lib/server/database.ts` throws at module load if Supabase env vars are missing; ensure env is populated before running flows that import server database modules.

## Common commands (run from repo root)

- Install dependencies:
  - `bun install`
- Start app in development:
  - `bun dev`
- Build production app:
  - `bun run build`
- Start built app:
  - `bun run start`
- Lint/typecheck:
  - `bun run lint`
  - (this runs `tsc --noEmit` + ESLint)
- Format:
  - `bun run format`
- Tests:
  - `bun run test` (Vitest run)
  - `bun run test:watch` (Vitest watch mode)
  - Single test file: `bunx vitest run src/lib/__tests__/bandit.test.ts`
  - Single test by name: `bunx vitest run -t "should update bandit state with success"`

## Developer docs site (Docusaurus)

- Docs source is under `developer-docs/`.
- From repo root:
  - `bun run docs:dev`
  - `bun run docs:build`
  - `bun run docs:serve`

## Database and helper scripts

- Base schema is in `database/schema.sql` (tables: `stories`, `storyboards`, `bandit_state`, `events`).
- Schema maintenance helper:
  - `node update_schema.js`
- README/CONTRIBUTING expect a Supabase `exec_sql(text)` RPC for `update_schema.js`.

## Architecture map (big picture)

### 1) Request flow

- `src/app/page.tsx` (client) submits story creation to `POST /api/story`.
- `src/app/api/story/route.ts`:
  - validates payload with Zod
  - classifies persona (`agents/persona.ts`)
  - generates storyboard (OpenAI via `lib/server/openai.ts`, with template fallback)
  - validates/corrects hero section for brand alignment (`agents/brand.ts`)
  - persists story + storyboard in Supabase (`lib/server/database.ts`)
- Generated page is served at `src/app/(site)/s/[storyId]/page.tsx`.

### 2) Story rendering and variant selection

- Story page server component:
  - loads story + detects persona from headers/query override
  - fetches latest storyboard for that persona (with fallback persona order)
  - calls `assembleStoryboard(...)`
- `src/lib/server/assembleStoryboard.ts`:
  - loads historical storyboard versions for the same story/persona
  - deduplicates section variants by variant hash
  - runs strategist per section in parallel
- `src/lib/server/agents/strategist.ts`:
  - chooses variants via Thompson sampling
  - persists/updates `bandit_state`
  - logs variant-selection and conversion events

### 3) Tracking and optimization loop

- Client tracking utilities in `src/lib/tracking.ts` send events to `/api/track` (including `sendBeacon` paths).
- `src/app/api/track/route.ts`:
  - validates event(s)
  - classifies persona for each request
  - stores events
  - records conversions into bandit updates for `ctaClick`/`conversion`
- `src/app/api/rewrite/route.ts`:
  - rewrites/optimizes a single section via `agents/section.ts`
  - runs brand validation
  - deploys new variant (strategist) and stores a new storyboard revision

### 4) Agent responsibilities

- `agents/persona.ts`: heuristic persona classification from UTM/referrer/device/time/session signals.
- `agents/section.ts`: section generation/optimization using OpenAI, with section templates as fallback.
- `agents/brand.ts`: tone/voice/content safety validation + optional LLM correction.
- `agents/strategist.ts`: multi-armed bandit orchestration and performance metrics per section variant.
- `agents/data.ts`: derives proof/funnel insights from tracked events.
### 5) Agent implementation constraints

- Agent modules live under `src/lib/server/agents/`.
- Keep I/O and side effects in server modules (`src/lib/server/**`), not client code.
- Route OpenAI usage through shared server config/helpers (`src/lib/server/config.ts`, `src/lib/server/openai.ts`) so `OPENAI_MODEL` and `OPENAI_API_KEY` behavior stays centralized.
- Prefer `withMetrics` from `src/lib/server/metrics.ts` for instrumenting agent operations.
- Pass story/persona context explicitly across calls; avoid hidden global state.
- When behavior is deterministic enough to assert, add/update tests under `src/lib/__tests__/`.

### 6) Shared contracts and boundaries

- `src/lib/storyboard.ts` defines canonical Zod schemas/types for storyboard and section shapes; API and agents depend on this contract.
- Keep server-only logic under `src/lib/server/` (modules explicitly import `server-only`).
- Client components should consume API endpoints and shared client-safe modules (`src/lib/*`) rather than importing server modules directly.

## CI expectations

- CI (`.github/workflows/ci.yml`) runs:
  - `bun install --frozen-lockfile`
  - `bun run lint`
  - `bun run test`
  - `bun run build`
- PR template also expects lint + test pass and docs updates when behavior/env/setup changes.
