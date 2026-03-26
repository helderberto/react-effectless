import type { Rule } from 'eslint'
import type { CallExpression } from 'estree'

export function isUseEffectCall(node: CallExpression & Rule.NodeParentExtension): boolean {
  return node.callee.type === 'Identifier' && node.callee.name === 'useEffect'
}

export function getCalleeHookName(node: CallExpression & Rule.NodeParentExtension): string | null {
  return node.callee.type === 'Identifier' ? node.callee.name : null
}

export function isComponentFunction(node: Rule.Node): boolean {
  if (node.type === 'FunctionDeclaration') {
    return node.id !== null && /^[A-Z]/.test(node.id.name)
  }
  if (node.type === 'ArrowFunctionExpression') {
    const parent = node.parent
    if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
      return /^[A-Z]/.test(parent.id.name)
    }
  }
  return false
}
