import type { Rule } from 'eslint'
import type { Node, Statement, ReturnStatement } from 'estree'
import { isUseEffectCall, isComponentFunction } from '@/utils/ast'
import { resolveHookName } from '@/utils/scope'

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: {
      noEffectAppInit:
        'Avoid using useEffect with empty deps for one-time initialization. Use module-level code or a didInit guard instead.',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const hookName = resolveHookName(node, context)
        if (hookName !== 'useEffect' && !isUseEffectCall(node)) return

        const enclosingFn = getEnclosingFunction(node)
        if (!enclosingFn) return
        if (!isComponentFunction(enclosingFn)) return

        if (!hasEmptyDeps(node)) return

        const callback = node.arguments[0]
        if (!callback) return
        if (callback.type !== 'ArrowFunctionExpression' && callback.type !== 'FunctionExpression')
          return

        const body = callback.body
        if (!body || body.type !== 'BlockStatement') return

        const stmts = body.body
        if (stmts.length === 0) return
        if (hasReturnStatement(stmts)) return
        if (hasStateSetterCall(stmts)) return
        if (hasRefCurrentAccess(stmts)) return
        if (!hasAnyCallExpression(stmts)) return

        context.report({ node, messageId: 'noEffectAppInit' })
      },
    }
  },
}

function getEnclosingFunction(node: Rule.Node): Rule.Node | null {
  let current: Rule.Node | null = (node as Rule.Node & { parent?: Rule.Node }).parent ?? null
  while (current) {
    if (
      current.type === 'FunctionDeclaration' ||
      current.type === 'ArrowFunctionExpression' ||
      current.type === 'FunctionExpression'
    ) {
      return current
    }
    current = (current as Rule.Node & { parent?: Rule.Node }).parent ?? null
  }
  return null
}

function hasEmptyDeps(node: Rule.Node): boolean {
  if (node.type !== 'CallExpression') return false
  const depsArg = (node as Rule.Node & { arguments: Node[] }).arguments[1]
  if (!depsArg || depsArg.type !== 'ArrayExpression') return false
  return (depsArg as Rule.Node & { elements: Node[] }).elements.length === 0
}

function hasReturnStatement(stmts: Statement[]): boolean {
  return stmts.some((stmt) => {
    if (stmt.type === 'ReturnStatement') {
      return (stmt as ReturnStatement).argument !== null
    }
    return false
  })
}

function hasStateSetterCall(stmts: Statement[]): boolean {
  return stmts.some((stmt) => containsStateSetterCall(stmt as Node))
}

function containsStateSetterCall(node: Node): boolean {
  if (node.type === 'CallExpression') {
    if (
      node.callee.type === 'Identifier' &&
      node.callee.name.startsWith('set') &&
      node.callee.name.length > 3
    ) {
      return true
    }
  }
  return childNodes(node).some(containsStateSetterCall)
}

function hasRefCurrentAccess(stmts: Statement[]): boolean {
  return stmts.some((stmt) => containsRefCurrentAccess(stmt as Node))
}

function containsRefCurrentAccess(node: Node): boolean {
  if (
    node.type === 'MemberExpression' &&
    node.property.type === 'Identifier' &&
    node.property.name === 'current'
  ) {
    return true
  }
  return childNodes(node).some(containsRefCurrentAccess)
}

function hasAnyCallExpression(stmts: Statement[]): boolean {
  return stmts.some((stmt) => containsCallExpression(stmt as Node))
}

function containsCallExpression(node: Node): boolean {
  if (node.type === 'CallExpression') return true
  return childNodes(node).some(containsCallExpression)
}

const SKIP_KEYS = new Set(['parent', 'range', 'loc'])

function childNodes(node: Node): Node[] {
  const children: Node[] = []
  for (const key of Object.keys(node)) {
    if (SKIP_KEYS.has(key)) continue
    const val = (node as unknown as Record<string, unknown>)[key]
    if (Array.isArray(val)) {
      for (const item of val) {
        if (item && typeof item === 'object' && 'type' in item) children.push(item as Node)
      }
    } else if (val && typeof val === 'object' && 'type' in val) {
      children.push(val as Node)
    }
  }
  return children
}

export default rule
