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
      noEffectAdjustState:
        'Avoid adjusting state in useEffect when a prop changes. Derive the value during render instead.',
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
        if (stmts.length === 0) return
        if (hasReturnWithValue(stmts)) return
        if (hasExternalCall(stmts)) return
        if (!hasConditionalSetterPattern(stmts)) return

        context.report({ node, messageId: 'noEffectAdjustState' })
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

function hasExternalCall(stmts: Statement[]): boolean {
  return stmts.some((stmt) => containsExternalCall(stmt as Node))
}

function containsExternalCall(node: Node): boolean {
  if (node.type === 'CallExpression') {
    const call = node as { callee: Node } & Node
    if (call.callee.type === 'MemberExpression') {
      const member = call.callee as { object: Node; property: Node } & Node
      if (
        member.object.type === 'Identifier' &&
        member.property.type === 'Identifier' &&
        !(member.property as { name: string }).name.startsWith('set')
      ) {
        const objName = (member.object as { name: string }).name
        if (!objName.startsWith('set')) return true
      }
    }
    if (
      call.callee.type === 'Identifier' &&
      !(call.callee as { name: string }).name.startsWith('set')
    ) {
      return true
    }
  }
  return childNodes(node).some(containsExternalCall)
}

function hasConditionalSetterPattern(stmts: Statement[]): boolean {
  const hasIf = stmts.some((s) => s.type === 'IfStatement')
  if (hasIf) {
    return containsStateSetterCall(stmts as unknown as Node[])
  }
  return stmts.some((stmt) => {
    if (stmt.type !== 'ExpressionStatement') return false
    const expr = (stmt as { expression: Node }).expression
    return isSetterWithConditionalArg(expr)
  })
}

function containsStateSetterCall(nodes: Node[]): boolean {
  return nodes.some((n) => nodeContainsStateSetterCall(n))
}

function nodeContainsStateSetterCall(node: Node): boolean {
  if (node.type === 'CallExpression') {
    const call = node as { callee: Node } & Node
    if (
      call.callee.type === 'Identifier' &&
      (call.callee as { name: string }).name.startsWith('set')
    ) {
      return true
    }
  }
  return childNodes(node).some(nodeContainsStateSetterCall)
}

function isSetterWithConditionalArg(expr: Node): boolean {
  if (expr.type !== 'CallExpression') return false
  const call = expr as { callee: Node; arguments: Node[] } & Node
  if (call.callee.type !== 'Identifier') return false
  if (!(call.callee as { name: string }).name.startsWith('set')) return false
  return call.arguments.some((arg) => arg.type === 'ConditionalExpression')
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
