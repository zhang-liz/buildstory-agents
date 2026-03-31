---
sidebar_position: 9
---

# Metrics and testing

## Metrics

`src/lib/server/metrics.ts` exposes helpers such as `withMetrics` for timing and success/error reporting around agent operations.

Use metrics to:

- Compare latency across agents and operations
- Count failures by agent and error type
- Correlate bandit decisions with downstream conversions (with event data)

## Tests

```bash
bun run test
bun run test:watch
```

Vitest configuration: `vitest.config.ts`. Representative tests include `agentMetrics.test.ts`, `storyboard.test.ts`, and `bandit.test.ts`.

## Lint and format

```bash
bun run lint
bun run format
```

Type-checking runs as part of `lint` via `tsc --noEmit` and ESLint.

## Documentation site

```bash
cd developer-docs && bun run build
```

Use `bun start` for local authoring; CI can run `bun run build` to verify links and MDX.
