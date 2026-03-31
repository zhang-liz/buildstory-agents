---
sidebar_position: 7
---

# Project structure

Abbreviated layout of the Next.js application (repository root):

```
src/
├── app/
│   ├── (site)/s/[storyId]/    # Story landing routes
│   ├── api/                   # Route handlers
│   ├── layout.tsx
│   └── page.tsx               # Marketing / brief UI
├── components/
│   └── sections/              # Hero, bullets, steps, etc.
├── lib/
│   ├── storyboard.ts          # Types + Zod
│   ├── personas.ts
│   ├── tracking.ts
│   ├── utils.ts
│   └── server/
│       ├── agents/
│       ├── assembleStoryboard.ts
│       ├── bandit.ts
│       ├── config.ts
│       ├── database.ts
│       ├── metrics.ts
│       ├── openai.ts
│       └── rateLimit.ts
database/
└── schema.sql
```

## Conventions

- **App Router** — Prefer colocated `page.tsx`, `layout.tsx`, and `route.ts` under `src/app/`.
- **Tests** — Colocate under `src/lib/__tests__/` or next to modules using Vitest.
- **Documentation** — This Docusaurus site lives in `developer-docs/` and is versioned with the app.
