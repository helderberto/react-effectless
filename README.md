# react-effectless

An npm monorepo providing an ESLint plugin, a hooks library, and an AI agent skill bootstrapper to eliminate unnecessary `useEffect` usage in React codebases.

## Motivation

`useEffect` is the most misused hook in React. The [official React docs](https://react.dev/learn/you-might-not-need-an-effect) document 10 anti-patterns where it is unnecessary — yet developers (and AI coding agents) reach for it by default.

The consequences are real bugs in production:

```tsx
// Bug: infinite loop — every render sets state, which triggers a render
function Profile({ userId }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    setUser(transformUser(userId)) // derived state — no effect needed
  }, [userId])
}

// Fix: derive during render
function Profile({ userId }) {
  const user = transformUser(userId)
}
```

```tsx
// Bug: stale closure — handler captures the initial value of `count`
function Counter() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    window.addEventListener('keydown', () => {
      console.log(count) // always 0
    })
  }, []) // missing dep, and shouldn't be an effect at all
}

// Fix: move the handler to where it belongs — the event binding
function Counter() {
  const [count, setCount] = useState(0)
  useEventSubscription({ target: window, event: 'keydown', handler: () => console.log(count) })
}
```

```tsx
// Bug: race condition — slow response from an earlier request overwrites a faster one
function UserList({ search }) {
  const [users, setUsers] = useState([])

  useEffect(() => {
    fetch(`/api/users?q=${search}`)
      .then((r) => r.json())
      .then(setUsers) // may arrive out of order
  }, [search])
}

// Fix: use a data-fetching library that handles this correctly
function UserList({ search }) {
  const { data: users } = useQuery({
    queryKey: ['users', search],
    queryFn: () => fetchUsers(search),
  })
}
```

The pattern is widespread enough that teams have started banning `useEffect` outright — see [this thread from Factory](https://x.com/alvinsng/status/2033969062834045089).

<details>
<summary>Hook replacements for every legitimate useEffect use case</summary>

| Instead of…                                  | Use                                                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `useEffect(fn, [])` for mount-only logic     | `useOnMount(fn)`                                                                                             |
| `useEffect` + `fetch`                        | [TanStack Query](https://tanstack.com/query) or [RTK Query](https://redux-toolkit.js.org/rtk-query/overview) |
| `useEffect` + `addEventListener`             | `useEventSubscription({ target, event, handler })`                                                           |
| `useEffect` + `setTimeout` for debouncing    | `useDebounce({ value, delay })`                                                                              |
| `useEffect` + `setInterval`                  | `useInterval({ callback, delay })`                                                                           |
| `useEffect` + `setTimeout` (one-shot)        | `useTimeout({ callback, delay })`                                                                            |
| `useEffect` + external store subscription    | `useSyncExternalStore` (built into React 18+)                                                                |
| `useEffect` + `setState` for a derived value | inline `const x = compute(a, b)` or `useMemo`                                                                |

</details>

<details>
<summary>ESLint rules and the warnings they produce</summary>

| Rule                         | Warning                                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| `no-derived-state`           | `useEffect` is only setting state from a calculation of its deps — derive during render   |
| `no-effect-memo`             | `useEffect` + `.filter()`/`.map()`/`.reduce()` — use `useMemo`                            |
| `no-effect-event-handler`    | `useEffect` firing in response to a state flag set in an event handler — move to handler  |
| `no-effect-reset-state`      | `useEffect` resetting all state on prop change — use a `key` prop instead                 |
| `no-effect-adjust-state`     | `useEffect` partially adjusting state on prop change — derive the value during render     |
| `no-effect-post-action`      | `useEffect` sending a request triggered by a flag — move the call into the event handler  |
| `no-effect-chain`            | `useEffect` chain where one effect's `setState` triggers another — consolidate in handler |
| `no-effect-notify-parent`    | `useEffect` calling a parent callback after `setState` — call both in the same handler    |
| `no-effect-pass-data-parent` | Child `useEffect` passing fetched data to parent via setter — lift fetching to the parent |
| `no-effect-app-init`         | `useEffect(fn, [])` for app-level init — use module-level code or a `didInit` guard       |

All rules are `"warn"` in the recommended config. No autofixes — suggestions only.

</details>

### The goal is not to remove `useEffect`

`useEffect` is the right tool for genuine side effects: syncing with external systems, setting up subscriptions, integrating third-party DOM libraries. That use case is real and valid.

The goal is to stop reaching for it _instead of_ simpler patterns — derived state, event handlers, `useMemo` — where it introduces unnecessary complexity and bugs. When you do need an effect, the hooks in this library (`useOnMount`, `useEventSubscription`, `useDebounce`, `useInterval`, `useTimeout`) wrap the genuinely legitimate cases so the common footguns (stale closures, missing cleanup, listeners re-added every render) are handled for you.

`react-effectless` makes the right patterns the path of least resistance.

## Packages

| Package                          | Description                                                                      |
| -------------------------------- | -------------------------------------------------------------------------------- |
| `eslint-plugin-react-effectless` | 10 lint rules that detect `useEffect` anti-patterns and suggest alternatives     |
| `react-effectless`               | A small set of hooks for the cases where `useEffect` is genuinely the right tool |

The monorepo also ships `npx react-effectless init`, a CLI that writes agent instruction files (CLAUDE.md, Cursor rules, Copilot instructions) into consumer projects so AI agents stop generating the same anti-patterns.

The goal is not to replace every `useEffect` with a custom hook — for data fetching, reach for [TanStack Query](https://tanstack.com/query) or [RTK Query](https://redux-toolkit.js.org/rtk-query/overview). The hooks in `react-effectless` only cover the patterns where rolling your own with `useEffect` reliably introduces bugs.

## Hooks

<details>
<summary><code>useOnMount(cb)</code> — run once on mount</summary>

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
<summary><code>useEventSubscription({ target, event, handler })</code> — DOM event listener</summary>

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

Without this hook, an inline handler reference changes every render — the listener is removed and re-added on every render. `useEventSubscription` stabilizes the handler ref internally.

</details>

<details>
<summary><code>useDebounce({ value, delay })</code> — debounce a rapidly changing value</summary>

```tsx
import { useDebounce } from 'react-effectless'

function Search({ query }) {
  const debouncedQuery = useDebounce({ value: query, delay: 300 })

  useEffect(() => {
    // only fires 300ms after the user stops typing
    fetchResults(debouncedQuery)
  }, [debouncedQuery])
}
```

Rolling your own with `useEffect` + `setTimeout` misses `clearTimeout` on rapid changes, causing stale results to flash in.

</details>

<details>
<summary><code>useInterval({ callback, delay })</code> — repeating interval</summary>

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
<summary><code>useTimeout({ callback, delay })</code> — one-shot delayed action</summary>

```tsx
import { useTimeout } from 'react-effectless'

function Toast({ onDismiss }) {
  useTimeout({ callback: onDismiss, delay: 3000 })

  return <div className="toast">Saved!</div>
}
```

Same stale-closure bug [documented by Abramov](https://overreacted.io/making-setinterval-declarative-with-react-hooks/) as `useInterval`, plus `clearTimeout` is easy to forget. Set `delay` to `null` to cancel.

</details>

## Development

```sh
npm install      # install all workspace dependencies
```

### Scripts

| Command                 | Description                                                                 |
| ----------------------- | --------------------------------------------------------------------------- |
| `npm run check`         | Full quality gate — format, lint, typecheck, test (run before opening a PR) |
| `npm test`              | Run the full test suite across all packages                                 |
| `npm run test:watch`    | Watch mode                                                                  |
| `npm run test:coverage` | Run tests with coverage report                                              |
| `npm run build`         | Build all packages (ESLint plugin only — hooks publish source)              |
| `npm run typecheck`     | Run `tsc --noEmit` across all packages                                      |
| `npm run lint`          | Check all packages with ESLint                                              |
| `npm run lint:fix`      | Auto-fix ESLint issues across all packages                                  |
| `npm run format`        | Format all files with Prettier                                              |
| `npm run format:check`  | Check formatting without writing (used in CI)                               |

## License

[MIT](./LICENSE) © Helder Burato Berto

## References

- [You Might Not Need an Effect — React Docs](https://react.dev/learn/you-might-not-need-an-effect)
- [Factory's useEffect ban](https://x.com/alvinsng/status/2033969062834045089)
