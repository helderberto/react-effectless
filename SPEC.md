# react-effectless — Specification

## Overview

`react-effectless` is an npm monorepo providing two packages + an AI agent skill bootstrapper to eliminate unnecessary `useEffect` usage in React codebases.

**Problem:** `useEffect` is the most misused React hook. The [official React docs](https://react.dev/learn/you-might-not-need-an-effect) document 10 anti-patterns where `useEffect` is unnecessary, yet developers (and AI coding agents) reach for it by default.

**Solution:** Three deliverables working together:

1. `eslint-plugin-react-effectless` — lint rules that detect anti-patterns and suggest alternatives
2. `react-effectless` — hooks for `useOnMount`, `useEventSubscription`, `useDebounce`, `useInterval`, and `useTimeout`
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
│   │   └── __tests__/
│   │       ├── utils/
│   │       └── rules/
│   └── hooks/
│       ├── src/
│       │   ├── index.ts
│       │   ├── use-on-mount.ts
│       │   ├── use-event-subscription.ts
│       │   ├── use-debounce.ts
│       │   ├── use-interval.ts
│       │   └── use-timeout.ts
│       └── __tests__/
├── agent-skills/
│   ├── claude.md
│   ├── copilot-instructions.md
│   ├── cursor-rules.md
│   └── agents.md
├── bin/
│   └── init.ts
├── SPEC.md
├── package.json
├── vitest.workspace.ts
└── tsconfig.base.json
```

**Conventions:** All files use `kebab-case`.

---

## Design Principles

### Deep Modules

Each module exposes a **simple interface** that hides significant complexity (Ousterhout, _A Philosophy of Software Design_).

| Surface       | One-liner API                                      | Hidden complexity                                     |
| ------------- | -------------------------------------------------- | ----------------------------------------------------- |
| ESLint plugin | `[reactEffectless.configs['flat/recommended']]`    | 10 rules, AST analysis, scope resolution, dep graph   |
| Hooks         | `useEventSubscription({ target, event, handler })` | Stable handler ref, StrictMode-safe cleanup           |
| Agent skills  | `npx react-effectless init`                        | 4 agent formats, non-destructive append, path-scoping |

**Hook API constraint:** All hooks accept a single options object. No positional arguments beyond the first callback parameter.

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

Five hooks replacing the most common `useEffect` patterns. For data fetching, use [TanStack Query](https://tanstack.com/query) or [RTK Query](https://redux-toolkit.js.org/rtk-query/overview).

| Hook                   | Signature                                                                        | Replaces                       | Hidden footgun prevented                                      |
| ---------------------- | -------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------- |
| `useOnMount`           | `(cb: () => void \| (() => void)) => void`                                       | `useEffect(fn, [])`            | Makes intent explicit; StrictMode-safe cleanup                |
| `useEventSubscription` | `({ target, event, handler, options? }) => void`                                 | `useEffect` + addEventListener | Stable handler ref — prevents listener re-added every render  |
| `useDebounce<T>`       | `({ value, delay }: { value: T; delay: number }) => T`                           | `useEffect` + setTimeout       | Stale closure + missing clearTimeout on rapid change          |
| `useInterval`          | `({ callback, delay }: { callback: () => void; delay: number \| null }) => void` | `useEffect` + setInterval      | Stale closure in interval — callback always sees latest value |
| `useTimeout`           | `({ callback, delay }: { callback: () => void; delay: number \| null }) => void` | `useEffect` + setTimeout       | Stale closure in one-shot timeout + missing clearTimeout      |

### React version targeting

- All hooks: `peerDependencies: { react: ">=16.8.0" }`

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

NEVER use useEffect directly. Use the right tool for each case:

- Mount-only side effect → useOnMount() from react-effectless
- Data fetching → TanStack Query or RTK Query
- DOM event listener → useEventSubscription() from react-effectless
- Debounced value → useDebounce() from react-effectless
- Repeating interval → useInterval() from react-effectless
- One-shot timeout → useTimeout() from react-effectless
- External store sync → useSyncExternalStore() (built into React 18+)
- Derived/computed value → inline `const x = compute(a, b)` or useMemo

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

Required edge cases per rule:

- Renamed import: `import { useEffect as ue } from 'react'`
- Nested component inside component
- Custom hook that internally calls `useEffect` (must not be flagged)

Rule tests use the shared tester from `__tests__/rule-tester.ts` — no per-file boilerplate:

```ts
import rule from '@/rules/no-derived-state'
import { tester } from '../rule-tester'

describe('no-derived-state', () => {
  tester.run('no-derived-state', rule, {
    valid: [
      /* legitimate useEffect usages */
    ],
    invalid: [
      /* anti-patterns — use message (full string), not messageId */
      {
        code: `...`,
        errors: [{ message: 'Exact warning text here.' }],
      },
    ],
  })
})
```

**`message` not `messageId` in errors** — the full warning string makes expected output readable inline without cross-referencing the rule source. `RuleTester` does not allow both simultaneously; use `message` only.

**`tester.run()` inside `describe()`**, never inside `it()` — putting it inside `it()` silences inner assertions.

Utility function tests drive behavior via `context.report()` + `messageId` — stubs that return wrong values cause the test to fail, confirming the red phase:

```ts
const rule: Rule.RuleModule = {
  meta: { type: 'suggestion', schema: [], messages: { yes: 'yes' } },
  create: (context) => ({
    CallExpression(node) {
      if (isUseEffectCall(node)) context.report({ node, messageId: 'yes' })
    },
  }),
}
```

### Hooks

`@testing-library/react` (v13.1+ — `renderHook` is now part of this package; `@testing-library/react-hooks` is deprecated) + Vitest + jsdom.

```ts
import { renderHook, act } from '@testing-library/react'

const { result, unmount } = renderHook(() =>
  useEventSubscription({ target: window, event: 'keydown', handler: vi.fn() }),
)
act(() => window.dispatchEvent(new KeyboardEvent('keydown')))
unmount()
// handler no longer called after unmount
```

Required edge cases per hook:

- StrictMode double-invocation behavior
- Cleanup / unmount
- Dependency change triggering re-run

**Coverage target: 100%.** Every hook, every branch, every edge case.

### Mocking

Prefer `vi.spyOn` over `vi.mock`. Use `vi.mock` only when module-level hoisting is strictly required (i.e., the import itself must be intercepted before execution). For all other cases — replacing a method, observing calls, faking a return value — use `vi.spyOn`.

### Vitest globals

All packages set `globals: true` in `vitest.config.ts`. Do not import `describe`, `it`, `expect`, `vi` from `'vitest'` in test files. Each package's `tsconfig.json` includes `"types": ["vitest/globals"]`.

---

## TypeScript

No `any`. Use specific types where possible; fall back to `unknown` when the type cannot be determined. For ESLint rule authors, type rule objects as `Rule.RuleModule` to get full inference on `context` and node visitor parameters.

### Shared AST types (`packages/eslint-plugin/src/types/index.ts`)

All named AST intersection types live here. Import from `@/types`. Two groups:

**`Rule.Node` extensions** — for ESLint rule visitor context:

| Type                    | Intersection                                                |
| ----------------------- | ----------------------------------------------------------- |
| `NodeWithParent`        | `Rule.Node & { parent?: Rule.Node }`                        |
| `NodeWithArgs`          | `Rule.Node & { arguments: Rule.Node[] }`                    |
| `NodeWithBody`          | `Rule.Node & { body: Rule.Node }`                           |
| `NodeWithStatements`    | `Rule.Node & { body: Rule.Node[] }`                         |
| `NodeWithExpression`    | `Rule.Node & { expression: Rule.Node }`                     |
| `NodeWithCallee`        | `Rule.Node & { callee: Rule.Node; arguments: Rule.Node[] }` |
| `NodeWithName`          | `Rule.Node & { name: string }`                              |
| `NodeWithOperands`      | `Rule.Node & { left: Rule.Node; right: Rule.Node }`         |
| `NodeWithTemplateExprs` | `Rule.Node & { expressions: Rule.Node[] }`                  |

**`estree Node` narrowings** — for helper traversal functions:

| Type               | Intersection                                 |
| ------------------ | -------------------------------------------- |
| `CallNode`         | `Node & { callee: Node }`                    |
| `CallWithArgsNode` | `Node & { callee: Node; arguments: Node[] }` |
| `MemberNode`       | `Node & { object: Node; property: Node }`    |
| `IdentifierNode`   | `Node & { name: string }`                    |
| `ReturnNode`       | `Node & { argument: unknown }`               |
| `ExprStmtNode`     | `Node & { expression: Node }`                |
| `LiteralNode`      | `Node & { value: unknown }`                  |
| `ArrayExprNode`    | `Node & { elements: unknown[] }`             |
| `ObjectExprNode`   | `Node & { properties: unknown[] }`           |

When types become complex, add them here rather than inlining casts in rule files.

## Code style

- No inline `if` statements (no single-line `if (x) return y`)
- Prefer early returns over nested `if`/`else`
- Avoid `else` after a `return`

---

## Developer Tooling

### Path alias

Every package resolves `@/` → `./src/`. Configured in two places per package:

**`tsconfig.json`:**

```json
{
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] },
    "types": ["vitest/globals"]
  },
  "include": ["src", "__tests__"]
}
```

**`vitest.config.ts`:**

```ts
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
})
```

Use `@/` in all imports within a package:

```ts
import rule from '@/rules/no-derived-state'
import { isUseEffectCall } from '@/utils/ast'
```

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

**pre-push** — typechecks before any push reaches the remote. Tests run in CI to allow pushing red commits during TDD:

```sh
# .husky/pre-push
npm run typecheck
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

### Phase 1 — Scaffolding ✓

1. Root `package.json` with npm workspaces (`packages/*`)
2. `tsconfig.base.json`
3. `vitest.workspace.ts`
4. Package scaffolds: `packages/eslint-plugin/package.json`, `packages/hooks/package.json`
5. CI workflow stubs

### Phase 2 — ESLint Plugin (TDD, simplest rules first)

1. ✓ AST utilities (`ast.ts`, `scope.ts`, `dependency.ts`) — tests written first
2. ✓ `no-derived-state` — reference implementation establishing rule pattern
3. ✓ `no-effect-memo` — setState with array transform methods → useMemo
4. ✓ `no-effect-app-init` — useEffect(fn, []) for init → module-level code
5. ✓ `no-effect-reset-state`, `no-effect-adjust-state`
6. ✓ `no-effect-notify-parent`, `no-effect-post-action`
7. ✓ `no-effect-chain` (component-accumulator, cross-effect dep graph)
8. ✓ `no-effect-event-handler`, `no-effect-pass-data-parent` (most heuristic)
9. ✓ Plugin entry with flat + legacy configs — 155 tests green

### Phase 3 — Hooks Library (TDD)

#### Conventions

- Hook files: `packages/hooks/src/use-<name>.ts` (kebab-case)
- Tests: `packages/hooks/__tests__/use-<name>.test.ts`
- Exports: re-export all hooks from `src/index.ts`
- Test environment: `jsdom` (configured in `vitest.config.ts`); `globals: true` — do not import from `'vitest'`
- Test utility: `renderHook` from `@testing-library/react` for all hook tests
- No build step — package exports TypeScript source directly via `"exports": { ".": "./src/index.ts" }`
- `peerDependencies: { react: ">=16.8.0" }`

#### Standard test cases per hook

- Callback runs on the expected trigger
- Callback does NOT run unexpectedly (no re-run on re-render if not expected)
- Cleanup runs on unmount if hook returns one
- Edge cases specific to the hook (optional `delay: null`, etc.)

1. ✓ `useOnMount` — `useEffect(cb, [])` with explicit intent; 4 tests
2. `useEventSubscription`
3. `useDebounce`
4. `useInterval`
5. `useTimeout`

### Phase 4 — Agent Skills

1. Author core content (shared knowledge, anti-patterns, decision tree)
2. Adapt to each agent format (CLAUDE.md, Cursor, Copilot, AGENTS.md)
3. Build `bin/init.ts` CLI (non-destructive append logic)

### Phase 5 — Docs + Polish

1. Root README: motivation, quick-start, comparison table
2. Per-rule docs: bad/good examples, when not to use
3. Per-hook docs: signature, parameters, usage
4. Example React app showing before/after
