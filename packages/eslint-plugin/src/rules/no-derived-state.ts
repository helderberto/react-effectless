import type { Rule } from 'eslint'
import { isUseEffectCall, isComponentFunction } from '@/utils/ast'
import { resolveHookName } from '@/utils/scope'
import { parseDepsArray, getStateSetters } from '@/utils/dependency'

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: {
      noDerivedState:
        'Derive this value during render instead of syncing it with useEffect. Use an inline calculation or useMemo.',
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

        const setters = getStateSetters(node)
        if (setters.length === 0) return

        if (!isPureDerivation(node, deps)) return

        context.report({ node, messageId: 'noDerivedState' })
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

function isPureDerivation(node: Rule.Node, deps: string[]): boolean {
  if (node.type !== 'CallExpression') return false

  const callNode = node as Rule.Node & { arguments: Rule.Node[] }
  const callback = callNode.arguments[0]
  if (!callback) return false
  if (callback.type !== 'ArrowFunctionExpression' && callback.type !== 'FunctionExpression')
    return false

  const body = (callback as Rule.Node & { body: Rule.Node }).body
  if (!body) return false

  const stmts: Rule.Node[] =
    body.type === 'BlockStatement'
      ? (body as Rule.Node & { body: Rule.Node[] }).body
      : [{ type: 'ExpressionStatement', expression: body } as unknown as Rule.Node]

  if (stmts.length === 0) return false

  return stmts.every((stmt) => {
    if (stmt.type !== 'ExpressionStatement') return false
    const expr = (stmt as Rule.Node & { expression: Rule.Node }).expression
    return isSetterCallWithDepsOnly(expr, deps)
  })
}

function isSetterCallWithDepsOnly(expr: Rule.Node, deps: string[]): boolean {
  if (expr.type !== 'CallExpression') return false

  const call = expr as Rule.Node & { callee: Rule.Node; arguments: Rule.Node[] }
  if (call.callee.type !== 'Identifier') return false
  if (!(call.callee as Rule.Node & { name: string }).name.startsWith('set')) return false

  return call.arguments.every((arg) => isExpressionOfDeps(arg, deps))
}

function isExpressionOfDeps(node: Rule.Node, deps: string[]): boolean {
  if (node.type === 'Identifier') return deps.includes((node as Rule.Node & { name: string }).name)
  if (node.type === 'Literal') return true

  if (node.type === 'BinaryExpression' || node.type === 'LogicalExpression') {
    const bin = node as Rule.Node & { left: Rule.Node; right: Rule.Node }
    return isExpressionOfDeps(bin.left, deps) && isExpressionOfDeps(bin.right, deps)
  }

  if (node.type === 'TemplateLiteral') {
    return (node as Rule.Node & { expressions: Rule.Node[] }).expressions.every((e) =>
      isExpressionOfDeps(e, deps),
    )
  }

  return false
}

export default rule
