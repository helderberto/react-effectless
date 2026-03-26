import type { Rule } from 'eslint'
import type { Node, Statement } from 'estree'
import { isUseEffectCall, isComponentFunction } from '@/utils/ast'
import { resolveHookName } from '@/utils/scope'
import { parseDepsArray } from '@/utils/dependency'
import type { NodeWithParent, ExprStmtNode, CallNode, IdentifierNode } from '@/types'

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: {
      noEffectPostAction:
        'Avoid using a state flag to trigger a side effect in useEffect. Move the API call into the event handler directly.',
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
        if (hasReturnWithValue(stmts)) {
          return
        }
        if (!hasConditionalExternalCall(stmts)) {
          return
        }

        context.report({ node, messageId: 'noEffectPostAction' })
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

function hasConditionalExternalCall(stmts: Statement[]): boolean {
  return stmts.some((stmt) => {
    if (stmt.type !== 'IfStatement') {
      return false
    }
    const ifStmt = stmt as unknown as { test: Node; consequent: Node }
    if (ifStmt.test.type !== 'Identifier') {
      return false
    }
    return consequentHasExternalCall(ifStmt.consequent)
  })
}

function consequentHasExternalCall(node: Node): boolean {
  if (node.type === 'ExpressionStatement') {
    return isExternalCall((node as ExprStmtNode).expression)
  }
  if (node.type === 'BlockStatement') {
    const block = node as unknown as { body: Node[] }
    return block.body.some((s) => {
      if (s.type !== 'ExpressionStatement') {
        return false
      }
      return isExternalCall((s as ExprStmtNode).expression)
    })
  }
  return false
}

function isExternalCall(expr: Node): boolean {
  if (expr.type !== 'CallExpression') {
    return false
  }
  const call = expr as CallNode
  if (call.callee.type === 'MemberExpression') {
    return true
  }
  if (call.callee.type === 'Identifier') {
    const name = (call.callee as IdentifierNode).name
    return !name.startsWith('set') || name.length <= 3
  }
  return false
}

function hasReturnWithValue(stmts: Statement[]): boolean {
  return stmts.some(
    (s) =>
      s.type === 'ReturnStatement' && (s as unknown as { argument: unknown }).argument !== null,
  )
}

export default rule
