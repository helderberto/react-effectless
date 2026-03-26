import type { Rule } from 'eslint'
import type { Node, Statement } from 'estree'
import { isUseEffectCall, isComponentFunction } from '@/utils/ast'
import { resolveHookName } from '@/utils/scope'
import { parseDepsArray } from '@/utils/dependency'

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: {
      noEffectResetState:
        'Avoid resetting all state in a useEffect when a prop changes. Pass a key prop to the component from the parent instead.',
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

        const deps = parseDepsArray(node)
        if (!deps || deps.length === 0) return

        const callback = node.arguments[0]
        if (!callback) return
        if (callback.type !== 'ArrowFunctionExpression' && callback.type !== 'FunctionExpression')
          return

        const body = callback.body
        if (!body || body.type !== 'BlockStatement') return

        const stmts = body.body
        if (stmts.length < 2) return
        if (hasReturnWithValue(stmts)) return
        if (hasConditional(stmts)) return
        if (!allStatementsAreResetSetterCalls(stmts)) return

        context.report({ node, messageId: 'noEffectResetState' })
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

function hasReturnWithValue(stmts: Statement[]): boolean {
  return stmts.some(
    (s) => s.type === 'ReturnStatement' && (s as { argument: unknown }).argument !== null,
  )
}

function hasConditional(stmts: Statement[]): boolean {
  return stmts.some((s) => s.type === 'IfStatement')
}

function allStatementsAreResetSetterCalls(stmts: Statement[]): boolean {
  return stmts.every((stmt) => {
    if (stmt.type !== 'ExpressionStatement') return false
    const expr = (stmt as { expression: Node }).expression
    return isResetSetterCall(expr)
  })
}

function isResetSetterCall(expr: Node): boolean {
  if (expr.type !== 'CallExpression') return false
  const call = expr as { callee: Node; arguments: Node[] } & Node
  if (call.callee.type !== 'Identifier') return false
  if (!(call.callee as { name: string }).name.startsWith('set')) return false
  if (call.arguments.length !== 1) return false
  return isResetValue(call.arguments[0])
}

function isResetValue(node: Node): boolean {
  if (node.type === 'Literal') {
    const val = (node as { value: unknown }).value
    return val === null || val === 0 || val === false || val === ''
  }
  if (node.type === 'ArrayExpression') {
    return (node as { elements: unknown[] }).elements.length === 0
  }
  if (node.type === 'ObjectExpression') {
    return (node as { properties: unknown[] }).properties.length === 0
  }
  if (node.type === 'Identifier') {
    return (node as { name: string }).name === 'undefined'
  }
  return false
}

export default rule
