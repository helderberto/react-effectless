## [1.0.6](https://github.com/helderberto/react-effectless/compare/v1.0.5...v1.0.6) (2026-03-26)

## [1.0.5](https://github.com/helderberto/react-effectless/compare/v1.0.4...v1.0.5) (2026-03-26)

## [1.0.4](https://github.com/helderberto/react-effectless/compare/v1.0.3...v1.0.4) (2026-03-26)

## [1.0.3](https://github.com/helderberto/react-effectless/compare/v1.0.2...v1.0.3) (2026-03-26)

## [1.0.2](https://github.com/helderberto/react-effectless/compare/v1.0.1...v1.0.2) (2026-03-26)

### Bug Fixes

- move eslint ignores to top-level config object for global effect ([85af56e](https://github.com/helderberto/react-effectless/commit/85af56e74a57bdcc7a43d8d538c48c5bfd10e612))

## [1.0.1](https://github.com/helderberto/react-effectless/compare/v1.0.0...v1.0.1) (2026-03-26)

# 1.0.0 (2026-03-26)

### Bug Fixes

- add @/ path alias to eslint-plugin vite config ([2427ad9](https://github.com/helderberto/react-effectless/commit/2427ad9ca5e6758ab16439612be1d719421822ac))
- disable Husky during semantic-release git commit step ([7d7ac1c](https://github.com/helderberto/react-effectless/commit/7d7ac1c4f294aa030f38e369a6889df049c216e1))
- typecheck — cast makeTarget to satisfy EventTarget interface ([e6e421a](https://github.com/helderberto/react-effectless/commit/e6e421adef5828a561b00afdc9e9b471970ece2f))
- typecheck — cast via unknown for Record access; guard undefined argument ([91bd475](https://github.com/helderberto/react-effectless/commit/91bd475f1ad66000057fcc6dffd8664f315b86a1))
- typecheck — guard undefined array index access in no-effect-chain ([cd4b9c4](https://github.com/helderberto/react-effectless/commit/cd4b9c4eee1de3e8d74549947db2c9925fef44b1))
- typecheck — proper stub signatures, Rule.Node for complex selectors, \_ args convention ([8133cc6](https://github.com/helderberto/react-effectless/commit/8133cc633194ddc86b4f4205e9f1dc1c0a58416c))
- typecheck — use Node types for estree parameter signatures ([ebde05d](https://github.com/helderberto/react-effectless/commit/ebde05d98b3284468db5997c36ad5f74f85a2cb5))

### Features

- add agent-skills templates and bin/init.ts CLI ([6f69e22](https://github.com/helderberto/react-effectless/commit/6f69e22ca1f1bf44754bebdbd99691aff7e459a1))
- add shared hook types; implement useEventSubscription ([8888739](https://github.com/helderberto/react-effectless/commit/88887392a5059056cdbe695e49a96a9c69ecc660))
- implement AST utilities — ast, scope, dependency (green) ([9063063](https://github.com/helderberto/react-effectless/commit/90630637a9993bbe646a191b640558f7fc62d428))
- implement no-derived-state rule; add README collapsible sections; early-return style ([affd551](https://github.com/helderberto/react-effectless/commit/affd551047cbb2b34b96acf35524f157bca435ff))
- implement no-effect-app-init rule ([b2fbdf8](https://github.com/helderberto/react-effectless/commit/b2fbdf832cbe83052ed56d9166cbfe3cb4d7bd64))
- implement no-effect-chain rule — cross-effect dep graph analysis ([464107b](https://github.com/helderberto/react-effectless/commit/464107ba8c48c6091f652e8374d79a45cd5bf96b))
- implement no-effect-event-handler and no-effect-pass-data-parent rules ([1854216](https://github.com/helderberto/react-effectless/commit/18542163af429c617ebfc6b4169a1a9e2e90345e))
- implement no-effect-memo rule ([039d0fc](https://github.com/helderberto/react-effectless/commit/039d0fcb7ec58f574fc8987a1c373a77a4572db3))
- implement no-effect-notify-parent and no-effect-post-action rules ([45975cf](https://github.com/helderberto/react-effectless/commit/45975cf0d2500dfd480eb2a3435a8afa46b37e46))
- implement no-effect-reset-state and no-effect-adjust-state rules ([a6f6007](https://github.com/helderberto/react-effectless/commit/a6f6007e924e2c04b00e57adc353543ae8560836))
- implement useDebounce; add test setup with cleanup and mock reset ([8ee268f](https://github.com/helderberto/react-effectless/commit/8ee268faa440d77cf7416f261ef014a36e1036c0))
- implement useInterval and useTimeout; centralise fake timers in setup ([47b698d](https://github.com/helderberto/react-effectless/commit/47b698df3e76ba1b48c288cbc9d33c018ad8b560))
- implement useOnMount hook ([0d69b1c](https://github.com/helderberto/react-effectless/commit/0d69b1c9fd54970296df1d4442797f638bc6424d))
- plugin entry — flat/recommended and legacy configs for all 10 rules ([5432b8e](https://github.com/helderberto/react-effectless/commit/5432b8eb731650cb41f5abbcd0a7194a7bb3c07d))
