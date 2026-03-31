# BuildStory.Agents developer documentation

This folder is a [Docusaurus](https://docusaurus.io/) site for **technical** documentation (architecture, APIs, extending the app). Product-oriented content remains in the repository root [README.md](../README.md).

## Commands

From the **repository root**:

```bash
bun run docs:dev    # dev server (use another port if Next.js uses 3000)
bun run docs:build
bun run docs:serve  # preview production build
```

From **this folder**:

```bash
bun install
bun start
bun run build
```

## Deployment

Update `url` and `baseUrl` in `docusaurus.config.ts` to match your host (for example GitHub Pages project sites use a non-root `baseUrl`).

For GitHub Pages, see [Docusaurus deployment](https://docusaurus.io/docs/deployment).
