import type { Rule } from 'eslint'
import type { Statement } from 'estree'
import { isUseEffectCall, isComponentFunction } from '@/utils/ast'
import { resolveHookName } from '@/utils/scope'
import { parseDepsArray } from '@/utils/dependency'
import type { NodeWithParent, ExprStmtNode, CallNode, IdentifierNode } from '@/types'

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: {
      noEffectNotifyParent:
        'Avoid calling a parent callback in useEffect after setState. Call the callback alongside setState in the event handler instead.',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const hookName = resolveHookName(node, context)
        if (hookName !== 'useEffect' && !isUseEffectCall(node)) {
          return
        }

        const enclosingFn = getEnclosingFunction(node)
        if (!enclosingFn) {
          return
        }
        if (!isComponentFunction(enclosingFn)) {
          return
        }

        const deps = parseDepsArray(node)
        if (!deps || deps.length === 0) {
          return
        }

        const callback = node.arguments[0]
        if (!callback) {
          return
        }
        if (callback.type !== 'ArrowFunctionExpression' && callback.type !== 'FunctionExpression') {
          return
        }

        const body = callback.body
        if (!body || body.type !== 'BlockStatement') {
          return
        }

        const stmts = body.body
        if (!hasStateSetterCall(stmts)) {
          return
        }
        if (!hasParentCallbackCall(stmts)) {
          return
        }
        if (hasExternalSideEffect(stmts)) {
          return
        }
        if (hasReturnWithValue(stmts)) {
          return
        }

        context.report({ node, messageId: 'noEffectNotifyParent' })
      },
    }
  },
}

function getEnclosingFunction(node: Rule.Node): Rule.Node | null {
  let current: Rule.Node | null = (node as NodeWithParent).parent ?? null
  while (current) {
    if (
      current.type === 'FunctionDeclaration' ||
      current.type === 'ArrowFunctionExpression' ||
      current.type === 'FunctionExpression'
    ) {
      return current
    }
    current = (current as NodeWithParent).parent ?? null
  }
  return null
}

function hasStateSetterCall(stmts: Statement[]): boolean {
  return stmts.some((stmt) => {
    if (stmt.type !== 'ExpressionStatement') {
      return false
    }
    const expr = (stmt as unknown as ExprStmtNode).expression
    if (expr.type !== 'CallExpression') {
      return false
    }
    const call = expr as CallNode
    return (
      call.callee.type === 'Identifier' &&
      (call.callee as IdentifierNode).name.startsWith('set') &&
      (call.callee as IdentifierNode).name.length > 3
    )
  })
}

function hasParentCallbackCall(stmts: Statement[]): boolean {
  return stmts.some((stmt) => {
    if (stmt.type !== 'ExpressionStatement') {
      return false
    }
    const expr = (stmt as unknown as ExprStmtNode).expression
    if (expr.type !== 'CallExpression') {
      return false
    }
    const call = expr as CallNode
    if (call.callee.type !== 'Identifier') {
      return false
    }
    const name = (call.callee as IdentifierNode).name
    return name.startsWith('on') && name.length > 2 && /^on[A-Z]/.test(name)
  })
}

function hasExternalSideEffect(stmts: Statement[]): boolean {
  return stmts.some((stmt) => {
    if (stmt.type !== 'ExpressionStatement') {
      return false
    }
    const expr = (stmt as unknown as ExprStmtNode).expression
    if (expr.type !== 'CallExpression') {
      return false
    }
    const call = expr as CallNode
    return call.callee.type === 'MemberExpression'
  })
}

function hasReturnWithValue(stmts: Statement[]): boolean {
  return stmts.some(
    (s) =>
      s.type === 'ReturnStatement' && (s as unknown as { argument: unknown }).argument !== null,
  )
}

export default rule
