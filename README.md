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
  useEventSubscription(window, 'keydown', () => console.log(count))
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

// Fix: useFetch handles AbortController and race conditions automatically
function UserList({ search }) {
  const { data: users } = useFetch(`/api/users?q=${search}`)
}
```

The pattern is widespread enough that teams have started banning `useEffect` outright — see [this thread from Factory](https://x.com/alvinsng/status/2033969062834045089).

<details>
<summary>Hook replacements for every legitimate useEffect use case</summary>

| Instead of…                                  | Use                                                   |
| -------------------------------------------- | ----------------------------------------------------- |
| `useEffect(fn, [])` for mount-only logic     | `useOnMount(fn)`                                      |
| `useEffect` + `fetch`                        | `useFetch(url)`                                       |
| `useEffect` + `addEventListener`             | `useEventSubscription(target, event, handler)`        |
| `useEffect` + external store subscription    | `useExternalSync(subscribe, getSnapshot)`             |
| `useEffect` for page-view analytics          | `useAnalytics(event, props)`                          |
| `useEffect` + third-party DOM library        | `useExternalWidget(factory, props)`                   |
| `useEffect` + `setState` for a derived value | `useDerivedState(derive, deps)` or inline calculation |

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

The goal is to stop reaching for it _instead of_ simpler patterns — derived state, event handlers, `useMemo` — where it introduces unnecessary complexity and bugs. When you do need an effect, the hooks in this library wrap the boilerplate correctly so the footguns (race conditions, missing cleanup, StrictMode double-invocation) are handled for you.

`react-effectless` makes the right patterns the path of least resistance.

## Packages

| Package                          | Description                                                                  |
| -------------------------------- | ---------------------------------------------------------------------------- |
| `eslint-plugin-react-effectless` | 10 lint rules that detect `useEffect` anti-patterns and suggest alternatives |
| `react-effectless`               | Hooks that cover every legitimate `useEffect` use case                       |

The monorepo also ships `npx react-effectless init`, a CLI that writes agent instruction files (CLAUDE.md, Cursor rules, Copilot instructions) into consumer projects so AI agents stop generating the same anti-patterns.

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
