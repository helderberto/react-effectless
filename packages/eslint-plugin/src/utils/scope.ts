import type { Rule, Scope } from 'eslint'
import type { CallExpression } from 'estree'

export function resolveHookName(
  node: CallExpression & Rule.NodeParentExtension,
  context: Rule.RuleContext,
): string | null {
  if (node.callee.type !== 'Identifier') return null
  const calleeName = node.callee.name
  const scope = context.sourceCode.getScope(node)
  const variable = findVariable(scope, calleeName)
  if (!variable) return null
  for (const def of variable.defs) {
    if (
      def.type === 'ImportBinding' &&
      def.node.type === 'ImportSpecifier' &&
      def.parent.type === 'ImportDeclaration' &&
      def.parent.source.value === 'react'
    ) {
      return def.node.imported.type === 'Identifier' ? def.node.imported.name : null
    }
  }
  return null
}

function findVariable(scope: Scope.Scope, name: string): Scope.Variable | null {
  let current: Scope.Scope | null = scope
  while (current) {
    const variable = current.set.get(name)
    if (variable) return variable
    current = current.upper
  }
  return null
}
