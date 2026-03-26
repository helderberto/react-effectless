import type { Rule } from 'eslint'
import type { Node, Expression } from 'estree'
import { isUseEffectCall, isComponentFunction } from '@/utils/ast'
import { resolveHookName } from '@/utils/scope'
import { getStateSetters } from '@/utils/dependency'

const ARRAY_TRANSFORM_METHODS = new Set([
  'filter',
  'map',
  'reduce',
  'reduceRight',
  'sort',
  'flatMap',
  'flat',
  'find',
  'findIndex',
  'findLast',
  'findLastIndex',
  'some',
  'every',
  'slice',
  'concat',
])

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: {
      noEffectMemo:
        'Avoid using useEffect to compute derived array values. Use useMemo(() => compute(), [deps]) instead.',
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

        const setters = getStateSetters(node)
        if (setters.length === 0) return

        if (!isArrayTransformDerivation(node)) return

        context.report({ node, messageId: 'noEffectMemo' })
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

function isArrayTransformDerivation(node: Rule.Node): boolean {
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
    return isSetterWithArrayTransform(expr)
  })
}

function isSetterWithArrayTransform(expr: Rule.Node): boolean {
  if (expr.type !== 'CallExpression') return false

  const call = expr as Rule.Node & { callee: Rule.Node; arguments: Rule.Node[] }
  if (call.callee.type !== 'Identifier') return false
  if (!(call.callee as Rule.Node & { name: string }).name.startsWith('set')) return false

  return call.arguments.some((arg) => containsArrayTransform(arg as Node))
}

function containsArrayTransform(node: Node | Expression): boolean {
  if (node.type === 'CallExpression') {
    if (
      node.callee.type === 'MemberExpression' &&
      node.callee.property.type === 'Identifier' &&
      ARRAY_TRANSFORM_METHODS.has(node.callee.property.name)
    ) {
      return true
    }
  }

  if (node.type === 'ArrayExpression') {
    return (node.elements as (Node | null)[]).some(
      (el) => el !== null && containsArrayTransform(el as Node),
    )
  }

  return false
}

export default rule
