---
description: Enforce react-effectless hook usage — never write useEffect directly
globs: ['**/*.ts', '**/*.tsx']
alwaysApply: true
---

## react-effectless: useEffect Policy

NEVER use `useEffect` directly. Use the right tool for each case:

| Need                     | Use instead                                      |
| ------------------------ | ------------------------------------------------ |
| Mount-only side effect   | `useOnMount()` from `react-effectless`           |
| Data fetching            | TanStack Query or RTK Query                      |
| DOM event listener       | `useEventSubscription()` from `react-effectless` |
| Debounced value          | `useDebounce()` from `react-effectless`          |
| Repeating interval       | `useInterval()` from `react-effectless`          |
| One-shot timeout         | `useTimeout()` from `react-effectless`           |
| External store sync      | `useSyncExternalStore()` (built into React 18+)  |
| Derived / computed value | Inline `const x = compute(a, b)` or `useMemo`    |

If none of these fit, the logic belongs in an **event handler**, not an effect.

### Anti-patterns and corrections

| ESLint rule                                   | Anti-pattern                                                           | Correct pattern                                       |
| --------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------- |
| `react-effectless/no-derived-state`           | `useEffect` computes and sets state from props/state                   | Inline: `const x = a + b`                             |
| `react-effectless/no-effect-memo`             | `useEffect` + `setState` with `.filter()` / `.map()` / `.reduce()`     | `useMemo(() => compute(), [deps])`                    |
| `react-effectless/no-effect-event-handler`    | `useEffect` fires because a state flag was set inside an event handler | Move the logic into the event handler                 |
| `react-effectless/no-effect-reset-state`      | `useEffect` resets all state when a prop changes                       | Add `key` prop to the component in the parent         |
| `react-effectless/no-effect-adjust-state`     | `useEffect` partially adjusts state when a prop changes                | Derive the value during render                        |
| `react-effectless/no-effect-post-action`      | `useEffect` sends a network request triggered by a state flag          | Move the API call into the event handler              |
| `react-effectless/no-effect-chain`            | Multiple `useEffect`s where one's `setState` is another's dep          | Consolidate logic in a single event handler           |
| `react-effectless/no-effect-notify-parent`    | `useEffect` calls a parent callback after `setState`                   | Call the callback alongside `setState` in the handler |
| `react-effectless/no-effect-pass-data-parent` | Child `useEffect` passes fetched data up via a parent setter           | Lift data fetching to the parent                      |
| `react-effectless/no-effect-app-init`         | `useEffect(fn, [])` for one-time app-level initialization              | Module-level code or `didInit` guard                  |

### Hook signatures

```ts
useOnMount(cb: () => void | (() => void)): void
useEventSubscription({ target, event, handler, options? }): void
useDebounce<T>({ value, delay }: { value: T; delay: number }): T
useInterval({ callback, delay }: { callback: () => void; delay: number | null }): void
useTimeout({ callback, delay }: { callback: () => void; delay: number | null }): void
```
