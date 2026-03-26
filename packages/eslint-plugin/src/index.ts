import type { Rule } from 'eslint'
import noDerivedState from './rules/no-derived-state'
import noEffectMemo from './rules/no-effect-memo'
import noEffectEventHandler from './rules/no-effect-event-handler'
import noEffectResetState from './rules/no-effect-reset-state'
import noEffectAdjustState from './rules/no-effect-adjust-state'
import noEffectPostAction from './rules/no-effect-post-action'
import noEffectChain from './rules/no-effect-chain'
import noEffectNotifyParent from './rules/no-effect-notify-parent'
import noEffectPassDataParent from './rules/no-effect-pass-data-parent'
import noEffectAppInit from './rules/no-effect-app-init'

const rules: Record<string, Rule.RuleModule> = {
  'no-derived-state': noDerivedState,
  'no-effect-memo': noEffectMemo,
  'no-effect-event-handler': noEffectEventHandler,
  'no-effect-reset-state': noEffectResetState,
  'no-effect-adjust-state': noEffectAdjustState,
  'no-effect-post-action': noEffectPostAction,
  'no-effect-chain': noEffectChain,
  'no-effect-notify-parent': noEffectNotifyParent,
  'no-effect-pass-data-parent': noEffectPassDataParent,
  'no-effect-app-init': noEffectAppInit,
}

const recommendedRules: Record<string, 'warn'> = Object.fromEntries(
  Object.keys(rules).map((key) => [`react-effectless/${key}`, 'warn']),
)

const plugin = {
  rules,
  configs: {
    'flat/recommended': {
      plugins: { 'react-effectless': { rules } },
      rules: recommendedRules,
    },
    recommended: {
      plugins: ['react-effectless'],
      rules: recommendedRules,
    },
  },
}

export default plugin
