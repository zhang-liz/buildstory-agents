---
sidebar_position: 4
---

# Agents

Agents live in `src/lib/server/agents/`. They coordinate with `assembleStoryboard`, API routes, and the strategist.

## Responsibilities

| Agent | Responsibility |
| --- | --- |
| **Persona** | Classifies visitors from signals (UTM, referrer, device, etc.) |
| **Section** | Proposes content for a section type (hero, bullets, steps, …) |
| **Brand guardian** | Validates tone and brand constraints |
| **Strategist** | Chooses variants using the bandit (Thompson sampling) |
| **Data storyteller** | Turns events into social-proof style content where applicable |

Naming in code may differ slightly (for example `persona.ts`, `section.ts`, `brand.ts`, `strategist.ts`, `data.ts`).

## Model configuration

All OpenAI usage should respect `OPENAI_MODEL` and `OPENAI_API_KEY` from `src/lib/server/config.ts` (or equivalent env loading). Default model is `gpt-4o` unless overridden.

## Adding behavior

When you add or change an agent:

1. Keep IO and side effects inside server modules.
2. Prefer `withMetrics` from `src/lib/server/metrics.ts` for observability.
3. Thread story/persona context explicitly; avoid hidden globals.
4. Update or add tests under `src/lib/__tests__/` when behavior is deterministic enough to assert.

See [Extending](./extending.md) for file-level steps.
