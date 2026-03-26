# react-effectless — Specification

## Overview

`react-effectless` is an npm monorepo providing two packages + an AI agent skill bootstrapper to eliminate unnecessary `useEffect` usage in React codebases.

**Problem:** `useEffect` is the most misused React hook. The [official React docs](https://react.dev/learn/you-might-not-need-an-effect) document 10 anti-patterns where `useEffect` is unnecessary, yet developers (and AI coding agents) reach for it by default.

**Solution:** Three deliverables working together:

1. `eslint-plugin-react-effectless` — lint rules that detect anti-patterns and suggest alternatives
2. `react-effectless` — hooks that cover every legitimate `useEffect` use case
3. `npx react-effectless init` — CLI that bootstraps AI agent instructions into consumer projects

**References:**

- [You Might Not Need an Effect — React Docs](https://react.dev/learn/you-might-not-need-an-effect)
- [Factory's useEffect ban](https://x.com/alvinsng/status/2033969062834045089)

---

## Repository

`~/workspace/labs/react-effectless`

---

## Architecture

```
react-effectless/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
├── packages/
│   ├── eslint-plugin/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── utils/
│   │   │   │   ├── ast.ts
│   │   │   │   ├── scope.ts
│   │   │   │   └── dependency.ts
│   │   │   └── rules/
│   │   │       ├── no-derived-state.ts
│   │   │       ├── no-effect-memo.ts
│   │   │       ├── no-effect-event-handler.ts
│   │   │       ├── no-effect-reset-state.ts
│   │   │       ├── no-effect-adjust-state.ts
│   │   │       ├── no-effect-post-action.ts
│   │   │       ├── no-effect-chain.ts
│   │   │       ├── no-effect-notify-parent.ts
│   │   │       ├── no-effect-pass-data-parent.ts
│   │   │       └── no-effect-app-init.ts
│   │   └── tests/
│   │       └── rules/
│   └── hooks/
│       ├── src/
│       │   ├── index.ts
│       │   ├── use-on-mount.ts
│       │   ├── use-fetch.ts
│       │   ├── use-external-sync.ts
│       │   ├── use-event-subscription.ts
│       │   ├── use-analytics.ts
│       │   ├── use-external-widget.ts
│       │   └── use-derived-state.ts
│       └── tests/
├── agent-skills/
│   ├── claude.md
│   ├── copilot-instructions.md
│   ├── cursor-rules.md
│   └── agents.md
├── bin/
│   └── init.ts
├── package.json
├── vitest.workspace.ts
└── tsconfig.base.json
```

**Conventions:** All files use `kebab-case`.

---

## Design Principles

### Deep Modules

Each module exposes a **simple interface** that hides significant complexity (Ousterhout, _A Philosophy of Software Design_).

| Surface       | One-liner API                                   | Hidden complexity                                     |
| ------------- | ----------------------------------------------- | ----------------------------------------------------- |
| ESLint plugin | `[reactEffectless.configs['flat/recommended']]` | 10 rules, AST analysis, scope resolution, dep graph   |
| Hooks         | `const { data } = useFetch('/api/users')`       | AbortController, race conditions, StrictMode          |
| Agent skills  | `npx react-effectless init`                     | 4 agent formats, non-destructive append, path-scoping |

**Hook API constraint:** 1–3 parameters max. Config via a single options object with smart defaults.

### No Build Step (consumer-side)

Consumer projects handle their own build (Vite, Next.js, etc.). The hooks package publishes TypeScript source directly. The ESLint plugin is the **only exception** — it requires a JS build (`tsup`) since ESLint loads it at config time.

---

## Package 1: `eslint-plugin-react-effectless`

### Configuration

```ts
// eslint.config.js — flat config (ESLint 9+)
import reactEffectless from 'eslint-plugin-react-effectless'
export default [reactEffectless.configs['flat/recommended']]

// .eslintrc — legacy config (ESLint 8)
{ "extends": ["plugin:react-effectless/recommended"] }
```

All rules default to `"warn"` in the recommended config.

### Rules

All rules: `type: "suggestion"`, **no autofixes**, suggestions only (human-readable messages).

| Rule                         | Detects                                                                 | Suggested alternative                             |
| ---------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------- |
| `no-derived-state`           | `useEffect` setting state from props/state calculation                  | Inline calculation: `const x = a + b`             |
| `no-effect-memo`             | `useEffect` + `setState` with `.filter()` / `.map()` / `.reduce()` etc. | `useMemo(() => compute(), [deps])`                |
| `no-effect-event-handler`    | `useEffect` that fires in response to state set inside an event handler | Move logic into the event handler                 |
| `no-effect-reset-state`      | `useEffect` resetting all state when a prop changes                     | `key` prop on the component in the parent         |
| `no-effect-adjust-state`     | `useEffect` partially updating state when a prop changes                | Derive value during render                        |
| `no-effect-post-action`      | `useEffect` sending a network request triggered by a state flag         | Move API call into the event handler              |
| `no-effect-chain`            | Multiple `useEffect`s where one's `setState` is another's dep           | Consolidate logic in a single event handler       |
| `no-effect-notify-parent`    | `useEffect` calling a parent callback after `setState`                  | Call callback alongside `setState` in the handler |
| `no-effect-pass-data-parent` | Child `useEffect` passes fetched data up via a parent setter            | Lift data fetching to the parent                  |
| `no-effect-app-init`         | `useEffect(fn, [])` for one-time app-level initialization               | Module-level code or `didInit` guard              |

### Detection heuristic

If a `useEffect` body **only** calls `setState` with a pure computation of its deps → anti-pattern.
If it touches the DOM, calls external APIs, or sets up subscriptions → legitimate, do not report.

### Shared AST utilities (`src/utils/`)

- `ast.ts` — `isUseEffectCall()`, `getCalleeHookName()`, `isComponentFunction()`
- `scope.ts` — resolve renamed imports (`import { useEffect as ue } from 'react'`)
- `dependency.ts` — parse dep arrays, identify state setters, trace dep origins

### Build

Vite library mode → CJS + ESM + `.d.ts` (via `vite-plugin-dts`). Target: Node 18+. `peerDependencies: { eslint: ">=8.0.0" }`.

Config lives in `packages/eslint-plugin/vite.config.ts`.

---

## Package 2: `react-effectless`

### Hooks

| Hook                   | Signature                                                             | Replaces                                  | Notes                                           |
| ---------------------- | --------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------- |
| `useOnMount`           | `(cb: () => void \| (() => void)) => void`                            | `useEffect(fn, [])`                       | StrictMode-safe                                 |
| `useFetch<T>`          | `(url: string \| null, opts?) => { data, error, isLoading, refetch }` | `useEffect` + fetch                       | AbortController, race condition prevention      |
| `useExternalSync<T>`   | `(subscribe, getSnapshot, getServerSnapshot?) => T`                   | `useEffect` + external store              | Wraps `useSyncExternalStore` (React 18+)        |
| `useEventSubscription` | `(target, event, handler, opts?) => void`                             | `useEffect` + addEventListener            | Stable handler ref, auto-cleanup                |
| `useAnalytics`         | `(event, props?, opts?) => { track }`                                 | `useEffect` for page-view events          | Fires once in StrictMode                        |
| `useExternalWidget<T>` | `(factory, props) => RefCallback<T>`                                  | `useEffect` + third-party DOM lib         | Manages init/update/destroy lifecycle           |
| `useDerivedState<T>`   | `(derive: () => T, deps) => T`                                        | `useEffect` + setState for derived values | Intentional `useMemo` — signals "derived state" |

### React version targeting

- All hooks: `peerDependencies: { react: ">=16.8.0" }`
- `useExternalSync` requires React 18+ (`useSyncExternalStore`). Documented clearly; throws a descriptive error on earlier versions.

### No build step

Publishes TypeScript source. `package.json` `exports` field points to `.ts` files. Consumer's bundler handles compilation.

---

## Agent Skills

### Problem

AI agents (Claude Code, Cursor, Copilot) write `useEffect` "just in case." Without guidance, they reproduce the same anti-patterns this library prevents.

### Delivery

```bash
npx react-effectless init
```

Non-destructively appends `react-effectless` sections to agent instruction files in the consumer project:

| File created/updated                                    | Agent                                       |
| ------------------------------------------------------- | ------------------------------------------- |
| `CLAUDE.md`                                             | Claude Code                                 |
| `.cursor/rules/react-effectless.md`                     | Cursor                                      |
| `.github/copilot-instructions.md`                       | VS Code Copilot                             |
| `.github/instructions/react-effectless.instructions.md` | Copilot (path-scoped to `**/*.ts,**/*.tsx`) |
| `AGENTS.md`                                             | Universal (Cursor, Copilot, others)         |

### Content per agent file

1. "Never use `useEffect` directly" + the replacement hook for each case
2. Anti-pattern → correct pattern for each of the 10 rules
3. ESLint rule names for self-checking

```markdown
## useEffect Policy

NEVER use useEffect directly. Use these hooks from react-effectless:

- Mount-only side effect → useOnMount()
- Data fetching → useFetch()
- DOM event listener → useEventSubscription()
- External store sync → useExternalSync()
- Analytics tracking → useAnalytics()
- Third-party widget → useExternalWidget()
- Derived/computed value → inline calculation or useDerivedState()

If none of these fit, the logic belongs in an event handler, not an effect.
```

### Templates source

Agent skill templates live in `agent-skills/` in the repo. The `bin/init.ts` CLI reads them and writes/appends to the consumer project.

---

## Testing

### Strategy

Strict TDD (red-green-refactor) for every feature. Write failing tests first.

### ESLint plugin

`RuleTester` (ESLint built-in) run via Vitest. Per rule: **≥5 valid cases + ≥5 invalid cases**.

Edge cases required per rule:

- Renamed import: `import { useEffect as ue } from 'react'`
- Nested component inside component
- Custom hook that internally calls `useEffect` (must not be flagged)

```ts
import { RuleTester } from 'eslint'
import rule from '../../src/rules/no-derived-state'

const tester = new RuleTester({
  languageOptions: {
    parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
  },
})

tester.run('no-derived-state', rule, {
  valid: [
    /* legitimate useEffect usages */
  ],
  invalid: [
    /* anti-patterns with expected messageId */
  ],
})
```

### Hooks

`@testing-library/react` (v13.1+ — `renderHook` is now part of this package; `@testing-library/react-hooks` is deprecated) + Vitest + jsdom.

```ts
import { renderHook, act, waitFor } from '@testing-library/react'

const { result } = renderHook(() => useFetch('/api/data'))
expect(result.current.isLoading).toBe(true)
await waitFor(() => expect(result.current.data).toEqual({ id: 1 }))
```

**Coverage target: 100%.** Every hook, every branch, every edge case.

---

## Developer Tooling

### ESLint

Root `eslint.config.ts` lints the entire monorepo source. Uses the flat config format (ESLint 9+).

Plugins:

- `@eslint/js` — core JS rules
- `typescript-eslint` — TypeScript-aware rules
- `eslint-plugin-react` — React rules (for the hooks package)
- `eslint-plugin-react-effectless` — dogfood our own plugin on the example app

```
npm run lint        # check all packages
npm run lint:fix    # fix auto-fixable across all packages
```

### Prettier

Root `.prettierrc` applies formatting across all packages. Single source of truth — no per-package overrides.

```
npm run format        # write all packages
npm run format:check  # check all packages (used in CI)
```

ESLint and Prettier are kept separate (no `eslint-plugin-prettier`). Prettier owns formatting; ESLint owns code quality. Run independently.

### Root `package.json` Scripts

All commands run across the full monorepo via `npm run -ws` (npm workspaces).

| Script          | Command                                                                     | Description                                 |
| --------------- | --------------------------------------------------------------------------- | ------------------------------------------- |
| `lint`          | `eslint .`                                                                  | Check all packages                          |
| `lint:fix`      | `eslint . --fix`                                                            | Fix auto-fixable issues across all packages |
| `format`        | `prettier --write .`                                                        | Format all packages                         |
| `format:check`  | `prettier --check .`                                                        | Check formatting (CI)                       |
| `typecheck`     | `npm run -ws typecheck`                                                     | Run `tsc --noEmit` in each package          |
| `test`          | `vitest run`                                                                | Run full test suite across all packages     |
| `test:watch`    | `vitest`                                                                    | Watch mode                                  |
| `test:coverage` | `vitest run --coverage`                                                     | Run tests with coverage report              |
| `build`         | `npm run -ws build`                                                         | Build all packages (ESLint plugin only)     |
| `check`         | `npm run format:check && npm run lint && npm run typecheck && npm run test` | Full quality gate — same as CI              |

`check` is the single command to run before opening a PR.

### Git Hooks (Husky + lint-staged)

**commit-msg** — enforces conventional commits format via `commitlint`:

```sh
# .husky/commit-msg
npx --no -- commitlint --edit $1
```

```js
// commitlint.config.js
export default { extends: ['@commitlint/config-conventional'] }
```

Valid commit types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`.

**pre-commit** — runs lint-staged on staged files only:

```js
// lint-staged.config.js
export default {
  '*.{ts,tsx}': ['prettier --write', 'eslint --fix'],
  '*.{json,md}': ['prettier --write'],
}
```

**pre-push** — runs the full quality gate before any push reaches the remote:

```sh
# .husky/pre-push
npm run typecheck
npm test
```

Setup added to root `package.json` `prepare` script so hooks install automatically on `npm install`:

```json
"prepare": "husky"
```

---

## CI/CD

### PR workflow (`.github/workflows/ci.yml`)

Triggers on `pull_request` to `main`.

```yaml
jobs:
  quality:
    steps:
      - run: npm ci
      - run: npm run format:check
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test -- --coverage

  install-test:
    needs: quality
    permissions:
      contents: read
      pull-requests: write
    steps:
      - run: npm ci
      - run: npm run build
      - uses: helderberto/github-package-install-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          package-name: react-effectless
```

Posts a PR comment with:

```bash
npm install github:owner/react-effectless#<commit-sha>
```

### Release workflow (`.github/workflows/release.yml`)

Triggers on push to `main`. Uses `release-please` to read conventional commits, auto-generate changelogs, and open a versioned Release PR. Merging the Release PR publishes to npm.

```yaml
jobs:
  release-please:
    runs-on: ubuntu-latest
    steps:
      - uses: googleapis/release-please-action@v4
        id: release
        with:
          release-type: node
          token: ${{ secrets.GITHUB_TOKEN }}

  publish:
    runs-on: ubuntu-latest
    needs: release-please
    if: ${{ needs.release-please.outputs.release_created }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: https://registry.npmjs.org
      - run: npm ci
      - run: npm run build
      - run: npm publish --workspaces
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Flow:**

1. Commits to `main` following conventional commits format
2. `release-please` opens a "Release PR" with bumped versions + generated `CHANGELOG.md`
3. Merging the Release PR triggers `publish` job → packages published to npm

### Versioning rules (from conventional commits)

| Commit type                    | Version bump    |
| ------------------------------ | --------------- |
| `fix:`                         | patch (`0.0.x`) |
| `feat:`                        | minor (`0.x.0`) |
| `feat!:` or `BREAKING CHANGE:` | major (`x.0.0`) |

| Event             | Jobs                                           |
| ----------------- | ---------------------------------------------- |
| PR opened/updated | lint → typecheck → test → post install comment |
| Push to `main`    | release-please opens/updates Release PR        |
| Release PR merged | build → publish to npm                         |

---

## Implementation Sequence

### Phase 1 — Scaffolding

1. Root `package.json` with npm workspaces (`packages/*`)
2. `tsconfig.base.json`
3. `vitest.workspace.ts`
4. Package scaffolds: `packages/eslint-plugin/package.json`, `packages/hooks/package.json`
5. CI workflow stubs

### Phase 2 — ESLint Plugin (TDD, simplest rules first)

1. AST utilities (`ast.ts`, `scope.ts`, `dependency.ts`) — tests written first
2. `no-derived-state` — reference implementation establishing rule pattern
3. `no-effect-memo`
4. `no-effect-app-init`
5. `no-effect-reset-state`, `no-effect-adjust-state`
6. `no-effect-notify-parent`, `no-effect-post-action`
7. `no-effect-chain` (hardest — requires dep graph across effects)
8. `no-effect-event-handler`, `no-effect-pass-data-parent` (most heuristic)
9. Plugin entry with flat + legacy configs

### Phase 3 — Hooks Library (TDD)

1. `use-on-mount`, `use-derived-state`
2. `use-fetch`
3. `use-event-subscription`, `use-external-sync`
4. `use-analytics`, `use-external-widget`

### Phase 4 — Agent Skills

1. Author core content (shared knowledge, anti-patterns, decision tree)
2. Adapt to each agent format (CLAUDE.md, Cursor, Copilot, AGENTS.md)
3. Build `bin/init.ts` CLI (non-destructive append logic)

### Phase 5 — Docs + Polish

1. Root README: motivation, quick-start, comparison table
2. Per-rule docs: bad/good examples, when not to use
3. Per-hook docs: signature, parameters, usage
4. Example React app showing before/after
