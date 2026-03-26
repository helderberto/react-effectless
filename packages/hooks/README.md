# react-effectless

[![CI](https://github.com/helderberto/react-effectless/actions/workflows/ci.yml/badge.svg)](https://github.com/helderberto/react-effectless/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/dm/react-effectless)](https://www.npmjs.com/package/react-effectless)
[![Coverage](https://img.shields.io/codecov/c/github/helderberto/react-effectless)](https://codecov.io/gh/helderberto/react-effectless)

Hooks for the cases where `useEffect` is genuinely the right tool — without the common footguns.

## Install

```sh
npm install react-effectless
```

Requires React 16.8+.

## Quick start

```tsx
import {
  useOnMount,
  useEventSubscription,
  useDebounce,
  useInterval,
  useTimeout,
} from 'react-effectless'
```

## Hooks

<details>
<summary><code>useOnMount(cb)</code>: run once on mount</summary>

```tsx
import { useOnMount } from 'react-effectless'

function Modal({ onOpen }) {
  useOnMount(() => {
    onOpen()
    return () => console.log('unmounted')
  })
}
```

Replaces `useEffect(fn, [])`. Makes intent explicit and handles StrictMode-safe cleanup.

</details>

<details>
<summary><code>useEventSubscription({ target, event, handler })</code>: DOM event listener</summary>

```tsx
import { useEventSubscription } from 'react-effectless'

function KeyLogger() {
  const [key, setKey] = useState('')

  useEventSubscription({
    target: window,
    event: 'keydown',
    handler: (e) => setKey(e.key),
  })

  return <p>Last key: {key}</p>
}
```

Without this hook, an inline handler reference changes every render; the listener is removed and re-added on every render. `useEventSubscription` stabilizes the handler ref internally.

</details>

<details>
<summary><code>useDebounce({ value, delay })</code>: debounce a rapidly changing value</summary>

```tsx
import { useDebounce } from 'react-effectless'

function Search({ query }) {
  const debouncedQuery = useDebounce({ value: query, delay: 300 })
  // pass debouncedQuery to your data-fetching hook
}
```

Rolling your own with `useEffect` + `setTimeout` misses `clearTimeout` on rapid changes, causing stale results to flash in.

</details>

<details>
<summary><code>useInterval({ callback, delay })</code>: repeating interval</summary>

```tsx
import { useInterval } from 'react-effectless'

function Clock() {
  const [time, setTime] = useState(new Date())

  useInterval({
    callback: () => setTime(new Date()),
    delay: 1000,
  })

  return <p>{time.toLocaleTimeString()}</p>
}
```

The classic footgun from [Dan Abramov's post](https://overreacted.io/making-setinterval-declarative-with-react-hooks/): a raw `useEffect` + `setInterval` captures the initial value of `callback` in a stale closure. `useInterval` always calls the latest version.

</details>

<details>
<summary><code>useTimeout({ callback, delay })</code>: one-shot delayed action</summary>

```tsx
import { useTimeout } from 'react-effectless'

function Toast({ onDismiss }) {
  useTimeout({ callback: onDismiss, delay: 3000 })

  return <div className="toast">Saved!</div>
}
```

Same stale-closure bug as `useInterval`, plus `clearTimeout` is easy to forget. Set `delay` to `null` to cancel.

</details>

## Hook signatures

```ts
useOnMount(cb: () => void | (() => void)): void
useEventSubscription({ target, event, handler, options? }): void
useDebounce<T>({ value: T; delay: number }): T
useInterval({ callback: () => void; delay: number | null }): void
useTimeout({ callback: () => void; delay: number | null }): void
```

## When not to use these hooks

For data fetching, use [TanStack Query](https://tanstack.com/query) or [RTK Query](https://redux-toolkit.js.org/rtk-query/overview) — they handle caching, race conditions, and loading state correctly.

For external store subscriptions, use `useSyncExternalStore` (built into React 18+).

For derived or computed values, use an inline `const` or `useMemo` — no hook needed.

## ESLint plugin

Pair this library with [`eslint-plugin-react-effectless`](https://www.npmjs.com/package/eslint-plugin-react-effectless) to catch `useEffect` anti-patterns at lint time.

## Agent instructions

AI coding agents reach for `useEffect` by default. Run the bootstrapper once to inject a `useEffect` policy into every agent instruction file in your project:

```sh
npx react-effectless init
```

It writes or appends to:

| File                                                    | Agent                                         |
| ------------------------------------------------------- | --------------------------------------------- |
| `CLAUDE.md`                                             | Claude Code                                   |
| `AGENTS.md`                                             | OpenAI Codex                                  |
| `.cursor/rules/react-effectless.md`                     | Cursor                                        |
| `.github/copilot-instructions.md`                       | GitHub Copilot                                |
| `.github/instructions/react-effectless.instructions.md` | GitHub Copilot (scoped to `**/*.ts,**/*.tsx`) |

For files that already exist the policy is **appended** — your existing instructions are preserved. Re-running is safe: it detects the `<!-- react-effectless -->` marker and skips any file that already contains it.

### Manual setup

```sh
# Claude Code
cat node_modules/react-effectless/agent-skills/CLAUDE.md >> CLAUDE.md

# Cursor
cp node_modules/react-effectless/agent-skills/cursor-rules.md .cursor/rules/react-effectless.md
```

The raw templates live in [`agent-skills/`](https://github.com/helderberto/react-effectless/tree/main/agent-skills) if you want to inspect or customize them.

## License

[MIT](https://github.com/helderberto/react-effectless/blob/main/LICENSE) © Helder Burato Berto
