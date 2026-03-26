import type { Rule } from 'eslint'
import type { CallExpression } from 'estree'

export function parseDepsArray(_node: CallExpression & Rule.NodeParentExtension): string[] | null {
  return null
}

export function getStateSetters(_node: CallExpression & Rule.NodeParentExtension): string[] {
  return []
}

export function traceDepOrigin(
  _dep: string,
  _node: CallExpression & Rule.NodeParentExtension,
  _context: Rule.RuleContext,
): 'prop' | 'state' | 'unknown' {
  return 'unknown'
}
