---
sidebar_position: 6
---

# Database

Schema source of truth: `database/schema.sql` in the repository.

## Core tables

| Table | Purpose |
| --- | --- |
| `stories` | Story metadata and brand settings |
| `storyboards` | Generated layouts and content per persona |
| `bandit_state` | Bandit parameters (alpha/beta) per variant |
| `events` | Interaction stream for analytics and learning |

## Relationships

- A **story** has one or more **storyboards** (typically keyed by persona).
- **Bandit state** rows associate variants with observed rewards for the strategist.
- **Events** capture views, clicks, scrolls, and related metadata for metrics and downstream agents.

## Maintenance scripts

`update_schema.js` aligns database columns (for example persona enums) with application expectations. It relies on a Supabase `exec_sql` RPC as documented in the main README.

Run with the same env as the app (`SUPABASE_URL`, service or appropriate credentials as required by your setup).
