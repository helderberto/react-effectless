<div align="center">
  <h1>📦 react-effectless</h1>

<!-- prettier-ignore-start -->
[![build][build-badge]][build]
[![MIT License][license-badge]][license]
<!-- prettier-ignore-end -->

</div>

An npm monorepo providing tools to eliminate unnecessary `useEffect` usage in React codebases: an ESLint plugin, a hooks library, and an AI agent skill bootstrapper.

## Motivation

`useEffect` is the most misused hook in React. The [official React docs](https://react.dev/learn/you-might-not-need-an-effect) document 10 anti-patterns where it is unnecessary, yet developers (and AI coding agents) reach for it by default.

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

The pattern is widespread enough that teams have started banning `useEffect` outright. See [this thread from Factory](https://x.com/alvinsng/status/2033969062834045089).

`useEffect` is the right tool for genuine side effects: syncing with external systems, setting up subscriptions, integrating third-party DOM libraries. The goal is to stop reaching for it _instead of_ simpler patterns (derived state, event handlers, `useMemo`) where it introduces unnecessary complexity and bugs.

`react-effectless` makes the right patterns the path of least resistance.

## Packages

| Package                                                      | Description                                                                  | Docs                                         |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------- | -------------------------------------------- |
| [`react-effectless`](./packages/hooks)                       | Hooks for the cases where `useEffect` is genuinely the right tool            | [README](./packages/hooks/README.md)         |
| [`eslint-plugin-react-effectless`](./packages/eslint-plugin) | 10 lint rules that detect `useEffect` anti-patterns and suggest alternatives | [README](./packages/eslint-plugin/README.md) |

## Development

```sh
npm install
```

| Command                 | Description                                                                |
| ----------------------- | -------------------------------------------------------------------------- |
| `npm run check`         | Full quality gate: format, lint, typecheck, test (run before opening a PR) |
| `npm test`              | Run the full test suite across all packages                                |
| `npm run test:watch`    | Watch mode                                                                 |
| `npm run test:coverage` | Run tests with coverage report                                             |
| `npm run build`         | Build all packages (ESLint plugin only; hooks publish source)              |
| `npm run typecheck`     | Run `tsc --noEmit` across all packages                                     |
| `npm run lint`          | Check all packages with ESLint                                             |
| `npm run lint:fix`      | Auto-fix ESLint issues across all packages                                 |
| `npm run format`        | Format all files with Prettier                                             |
| `npm run format:check`  | Check formatting without writing (used in CI)                              |

## License

[MIT](./LICENSE) © [helderberto](https://helderberto.com)

## References

- [You Might Not Need an Effect — React Docs](https://react.dev/learn/you-might-not-need-an-effect)
- [Factory's useEffect ban](https://x.com/alvinsng/status/2033969062834045089)

<!-- prettier-ignore-start -->
[build-badge]: https://github.com/helderberto/react-effectless/actions/workflows/release.yml/badge.svg?style=flat-square
[build]: https://github.com/helderberto/react-effectless/actions/workflows/release.yml
[license-badge]: https://img.shields.io/npm/l/react-effectless.svg?style=flat-square
[license]: https://github.com/helderberto/react-effectless/blob/main/LICENSE
<!-- prettier-ignore-end -->
