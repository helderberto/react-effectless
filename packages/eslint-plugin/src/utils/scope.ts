import type { Rule } from 'eslint'
import type { CallExpression } from 'estree'

export function resolveHookName(
  _node: CallExpression & Rule.NodeParentExtension,
  _context: Rule.RuleContext,
): string | null {
  return null
}
