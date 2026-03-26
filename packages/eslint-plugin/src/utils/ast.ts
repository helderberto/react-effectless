import type { Rule } from 'eslint'
import type { CallExpression } from 'estree'

export function isUseEffectCall(_node: CallExpression & Rule.NodeParentExtension): boolean {
  return false
}

export function getCalleeHookName(_node: CallExpression & Rule.NodeParentExtension): string | null {
  return null
}

export function isComponentFunction(_node: Rule.Node): boolean {
  return false
}
