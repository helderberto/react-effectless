<div align="center">
  <h1>📦 eslint-plugin-react-effectless</h1>

  <p>
    <strong>10 ESLint rules that detect `useEffect` anti-patterns and suggest the correct alternative for each case.</strong>
  </p>

<!-- prettier-ignore-start -->
[![build][build-badge]][build]
[![Downloads][downloads-badge]][npmtrends]
[![MIT License][license-badge]][license]
<!-- prettier-ignore-end -->

</div>

## Install

```sh
npm install -D eslint-plugin-react-effectless
```

Requires ESLint 8+.

## Configure

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

All rules are `"warn"` in the recommended config. No autofixes; suggestions only.

### Individual rules

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

## Rules

| Rule                         | Short warning                                                                    |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `no-derived-state`           | Derive during render instead of syncing with useEffect                           |
| `no-effect-memo`             | Use `useMemo` instead of useEffect + setState with array methods                 |
| `no-effect-event-handler`    | Move logic into the event handler: the effect fires only because of a state flag |
| `no-effect-reset-state`      | Use a `key` prop in the parent instead of resetting state in an effect           |
| `no-effect-adjust-state`     | Derive the value during render instead of adjusting state in an effect           |
| `no-effect-post-action`      | Move the API call into the event handler: the effect is reacting to a flag       |
| `no-effect-chain`            | Consolidate the effect chain into a single event handler                         |
| `no-effect-notify-parent`    | Call the parent callback alongside setState in the handler                       |
| `no-effect-pass-data-parent` | Lift data fetching to the parent                                                 |
| `no-effect-app-init`         | Use module-level code or a `didInit` guard for one-time initialization           |

---

<details>
<summary><code>no-derived-state</code>: useEffect setting state from a pure calculation of its deps</summary>

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

</details>

<details>
<summary><code>no-effect-memo</code>: useEffect + setState with .filter() / .map() / .reduce() etc.</summary>

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

</details>

<details>
<summary><code>no-effect-event-handler</code>: useEffect fires only because state was set inside an event handler</summary>

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

</details>

<details>
<summary><code>no-effect-reset-state</code>: useEffect resets all local state when a prop changes</summary>

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

</details>

<details>
<summary><code>no-effect-adjust-state</code>: useEffect partially adjusts state when a prop changes</summary>

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

</details>

<details>
<summary><code>no-effect-post-action</code>: useEffect sends a request triggered by a state flag</summary>

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

</details>

<details>
<summary><code>no-effect-chain</code>: multiple effects where one's setState is another's dep</summary>

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

</details>

<details>
<summary><code>no-effect-notify-parent</code>: useEffect calls a parent callback after setState</summary>

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

</details>

<details>
<summary><code>no-effect-pass-data-parent</code>: child useEffect passes fetched data up via a parent setter</summary>

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

</details>

<details>
<summary><code>no-effect-app-init</code>: useEffect(fn, []) for one-time app-level initialization</summary>

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

</details>

## Hooks library

Pair this plugin with [`react-effectless`](https://www.npmjs.com/package/react-effectless) to get hooks that replace the legitimate `useEffect` use cases (`useOnMount`, `useEventSubscription`, `useDebounce`, `useInterval`, `useTimeout`).

## License

[MIT](./LICENSE) © [helderberto](https://helderberto.com)

<!-- prettier-ignore-start -->
[build-badge]: https://github.com/helderberto/react-effectless/actions/workflows/release.yml/badge.svg?style=flat-square
[build]: https://github.com/helderberto/react-effectless/actions/workflows/release.yml
[downloads-badge]: https://img.shields.io/npm/dm/eslint-plugin-react-effectless.svg?style=flat-square
[npmtrends]: http://www.npmtrends.com/eslint-plugin-react-effectless
[license-badge]: https://img.shields.io/npm/l/eslint-plugin-react-effectless.svg?style=flat-square
[license]: https://github.com/helderberto/react-effectless/blob/main/packages/eslint-plugin/LICENSE
<!-- prettier-ignore-end -->
