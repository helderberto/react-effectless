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

All rules are `"warn"` in the recommended config. No autofixes — suggestions only.

---

**`no-derived-state`** — `useEffect` setting state from a pure calculation of its deps

```tsx
// ⚠ react-effectless/no-derived-state
// Derive this value during render instead of syncing it with useEffect.
// Use an inline calculation or useMemo.
useEffect(() => {
  setFullName(firstName + ' ' + lastName)
}, [firstName, lastName])

// ✓ fix
const fullName = firstName + ' ' + lastName
```

---

**`no-effect-memo`** — `useEffect` + `setState` with `.filter()` / `.map()` / `.reduce()` etc.

```tsx
// ⚠ react-effectless/no-effect-memo
// Avoid using useEffect to compute derived array values.
// Use useMemo(() => compute(), [deps]) instead.
useEffect(() => {
  setActive(items.filter((x) => x.active))
}, [items])

// ✓ fix
const active = useMemo(() => items.filter((x) => x.active), [items])
```

---

**`no-effect-event-handler`** — `useEffect` fires only because state was set inside an event handler

```tsx
// ⚠ react-effectless/no-effect-event-handler
// This effect fires because of a state flag set in an event handler.
// Move the logic into the handler directly.
const [submitted, setSubmitted] = useState(false)
useEffect(() => {
  if (submitted) sendAnalytics()
}, [submitted])

// ✓ fix
function handleSubmit() {
  setSubmitted(true)
  sendAnalytics()
}
```

---

**`no-effect-reset-state`** — `useEffect` resets all local state when a prop changes

```tsx
// ⚠ react-effectless/no-effect-reset-state
// useEffect is resetting all state because a prop changed.
// Pass a key prop to the component in the parent instead.
useEffect(() => {
  setPage(0)
  setFilters([])
  setSelection(null)
}, [userId])

// ✓ fix — in the parent
<Profile key={userId} userId={userId} />
```

---

**`no-effect-adjust-state`** — `useEffect` partially adjusts state when a prop changes

```tsx
// ⚠ react-effectless/no-effect-adjust-state
// useEffect is adjusting state based on a prop change.
// Derive the value during render instead.
useEffect(() => {
  if (items.length === 0) setSelection(null)
}, [items])

// ✓ fix
const selection = items.length === 0 ? null : selection
```

---

**`no-effect-post-action`** — `useEffect` sends a request triggered by a state flag

```tsx
// ⚠ react-effectless/no-effect-post-action
// useEffect is reacting to a flag set in an event handler.
// Move the API call into the event handler directly.
const [saved, setSaved] = useState(false)
useEffect(() => {
  if (saved) api.save(data)
}, [saved])

// ✓ fix
function handleSave() {
  setSaved(true)
  api.save(data)
}
```

---

**`no-effect-chain`** — multiple effects where one's `setState` is another's dep

```tsx
// ⚠ react-effectless/no-effect-chain
// useEffect chain detected: one effect's setState triggers another effect.
// Consolidate the logic into a single event handler.
useEffect(() => {
  setProcessed(transform(raw))
}, [raw])
useEffect(() => {
  setOutput(format(processed))
}, [processed])

// ✓ fix
function handleChange(raw) {
  const processed = transform(raw)
  setProcessed(processed)
  setOutput(format(processed))
}
```

---

**`no-effect-notify-parent`** — `useEffect` calls a parent callback after `setState`

```tsx
// ⚠ react-effectless/no-effect-notify-parent
// useEffect is calling a parent callback after setting state.
// Call the callback alongside setState in the event handler.
useEffect(() => {
  onChange(value)
}, [value])

// ✓ fix
function handleChange(next) {
  setValue(next)
  onChange(next)
}
```

---

**`no-effect-pass-data-parent`** — child `useEffect` passes fetched data up via a parent setter

```tsx
// ⚠ react-effectless/no-effect-pass-data-parent
// A child component is fetching data and passing it to the parent via a setter prop.
// Lift the data fetching to the parent instead.
function Child({ onData }) {
  useEffect(() => {
    fetch('/api/data')
      .then((r) => r.json())
      .then(onData)
  }, [onData])
}

// ✓ fix — fetch in the parent, pass data down as a prop
```

---

**`no-effect-app-init`** — `useEffect(fn, [])` for one-time app-level initialization

```tsx
// ⚠ react-effectless/no-effect-app-init
// useEffect with an empty dep array is used for app-level initialization.
// Use module-level code or a didInit guard instead.
useEffect(() => {
  analytics.init()
  featureFlags.load()
}, [])

// ✓ fix — module level, runs once when the module is imported
analytics.init()
featureFlags.load()
```

---

| Rule                         | Short warning                                                                     |
| ---------------------------- | --------------------------------------------------------------------------------- |
| `no-derived-state`           | Derive during render instead of syncing with useEffect                            |
| `no-effect-memo`             | Use `useMemo` instead of useEffect + setState with array methods                  |
| `no-effect-event-handler`    | Move logic into the event handler — the effect fires only because of a state flag |
| `no-effect-reset-state`      | Use a `key` prop in the parent instead of resetting state in an effect            |
| `no-effect-adjust-state`     | Derive the value during render instead of adjusting state in an effect            |
| `no-effect-post-action`      | Move the API call into the event handler — the effect is reacting to a flag       |
| `no-effect-chain`            | Consolidate the effect chain into a single event handler                          |
| `no-effect-notify-parent`    | Call the parent callback alongside setState in the handler                        |
| `no-effect-pass-data-parent` | Lift data fetching to the parent                                                  |
| `no-effect-app-init`         | Use module-level code or a `didInit` guard for one-time initialization            |

</details>

### The goal is not to remove `useEffect`

`useEffect` is the right tool for genuine side effects: syncing with external systems, setting up subscriptions, integrating third-party DOM libraries. That use case is real and valid.

The goal is to stop reaching for it _instead of_ simpler patterns — derived state, event handlers, `useMemo` — where it introduces unnecessary complexity and bugs. When you do need an effect, the hooks in this library (`useOnMount`, `useEventSubscription`, `useDebounce`, `useInterval`, `useTimeout`) wrap the genuinely legitimate cases so the common footguns (stale closures, missing cleanup, listeners re-added every render) are handled for you.

`react-effectless` makes the right patterns the path of least resistance.

## Quick start

**1. Install**

```sh
npm install react-effectless
npm install -D eslint-plugin-react-effectless
```

**2. Configure ESLint**

ESLint 9+ (flat config):

```ts
// eslint.config.ts
import reactEffectless from 'eslint-plugin-react-effectless'
export default [reactEffectless.configs['flat/recommended']]
```

ESLint 8 (legacy `.eslintrc`):

```json
{
  "plugins": ["react-effectless"],
  "extends": ["plugin:react-effectless/recommended"]
}
```

ESLint 8 (legacy `.eslintrc.js`):

```js
module.exports = {
  plugins: ['react-effectless'],
  extends: ['plugin:react-effectless/recommended'],
}
```

To enable individual rules without the recommended preset:

```ts
// eslint.config.ts (ESLint 9+)
import reactEffectless from 'eslint-plugin-react-effectless'
export default [
  {
    plugins: { 'react-effectless': reactEffectless },
    rules: {
      'react-effectless/no-derived-state': 'warn',
      'react-effectless/no-effect-memo': 'error',
    },
  },
]
```

```json
// .eslintrc (ESLint 8)
{
  "plugins": ["react-effectless"],
  "rules": {
    "react-effectless/no-derived-state": "warn",
    "react-effectless/no-effect-memo": "error"
  }
}
```

**3. Use the hooks**

```tsx
import {
  useOnMount,
  useEventSubscription,
  useDebounce,
  useInterval,
  useTimeout,
} from 'react-effectless'
```

**4. (Optional) Bootstrap agent instructions**

```sh
npx react-effectless init
```

Appends `react-effectless` usage rules to `CLAUDE.md`, `AGENTS.md`, `.cursor/rules/`, and `.github/copilot-instructions.md` so AI agents in your project stop generating `useEffect` anti-patterns.

---

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
