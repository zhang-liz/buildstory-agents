---
sidebar_position: 3
---

# Architecture

## High-level flow

1. **Create story** — `POST /api/story` runs agents to build a storyboard (sections, variants) stored in Supabase.
2. **Render** — `/s/[storyId]` loads the storyboard, classifies or accepts persona overrides, and picks variants (bandit / strategist).
3. **Track** — The client posts events to `POST /api/track`; conversions update bandit state.
4. **Rewrite** — `POST /api/rewrite` can refresh or optimize a section, guarded by rate limits and brand checks.

## Major components

| Area | Role |
| --- | --- |
| `src/app/(site)/s/[storyId]/` | Server-rendered landing experience and section rendering |
| `src/app/api/*` | Story creation, rewrite, tracking, debug |
| `src/lib/server/agents/*` | Persona, section generation, brand, strategist, data helpers |
| `src/lib/server/bandit.ts` | Thompson sampling and state read/write |
| `src/lib/server/database.ts` | Supabase access patterns |
| `src/lib/storyboard.ts` | Zod schemas and shared types for storyboard JSON |
| `src/lib/tracking.ts` | Client-side event batching and API calls |

## Server vs client boundary

Code under `src/lib/server/` must **not** be imported from client components. Use `server-only` and keep LLM and DB logic on the server.

## Caching and revalidation

Landing routes use ISR-style revalidation (see `next.config.js` and page-level `revalidate` where configured). Treat content as eventually consistent with the database after writes.
