---
sidebar_position: 8
---

# Extending the system

## New agent

1. Add a module under `src/lib/server/agents/`.
2. Accept explicit context (story id, persona, section key, prior content).
3. Invoke OpenAI through shared helpers in `src/lib/server/openai.ts` where appropriate.
4. Wire the agent into `assembleStoryboard`, strategist flow, or the relevant API route.
5. Add tests or metrics coverage for critical paths.

## New section type

1. Extend the Zod schema and TypeScript types in `src/lib/storyboard.ts`.
2. Create a React component under `src/components/sections/`.
3. Register the section in the storyboard renderer (`StoryboardRenderer.tsx` and related mapping).
4. Teach **Section** and **Brand** prompts about the new structure (agent prompts in server code).
5. Run `bun run lint` and `bun run test`.

## New API surface

1. Add a `route.ts` under `src/app/api/<name>/`.
2. Validate input with Zod; return consistent error shapes.
3. Apply rate limiting for public mutating routes (`src/lib/server/rateLimit.ts`).
4. Document the contract on this site under [API reference](./api).

## Configuration

Centralize new env vars in `src/lib/server/config.ts` and document them in `.env.example` and [Getting started](./getting-started.md).
