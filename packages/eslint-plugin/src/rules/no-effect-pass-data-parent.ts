import type { Rule } from 'eslint'
import type { Statement } from 'estree'
import { isUseEffectCall, isComponentFunction } from '@/utils/ast'
import { resolveHookName } from '@/utils/scope'
import type {
  NodeWithParent,
  NodeWithBody,
  NodeWithStatements,
  ExprStmtNode,
  CallNode,
  IdentifierNode,
  MemberNode,
} from '@/types'

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: {
      noEffectPassDataParent:
        'A child component is fetching data and passing it to the parent via a callback prop. Lift the data fetching to the parent instead.',
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
        if (!enclosingFn || !isComponentFunction(enclosingFn)) {
          return
        }
        const callback = node.arguments[0]
        if (!callback) {
          return
        }
        if (callback.type !== 'ArrowFunctionExpression' && callback.type !== 'FunctionExpression') {
          return
        }
        const body = (callback as unknown as NodeWithBody).body
        if (!body || body.type !== 'BlockStatement') {
          return
        }
        const stmts = (body as unknown as NodeWithStatements).body as Statement[]
        if (hasStateSetterCall(stmts)) {
          return
        }
        if (!hasDirectThenParentCallback(stmts)) {
          return
        }
        context.report({ node, messageId: 'noEffectPassDataParent' })
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
    return containsSetterCall((stmt as unknown as ExprStmtNode).expression)
  })
}

function containsSetterCall(node: { type: string; [key: string]: unknown }): boolean {
  if (node.type === 'CallExpression') {
    const call = node as unknown as CallNode
    if (call.callee.type === 'Identifier') {
      const name = (call.callee as IdentifierNode).name
      if (name.startsWith('set') && name.length > 3) {
        return true
      }
    }
  }
  return false
}

function hasDirectThenParentCallback(stmts: Statement[]): boolean {
  return stmts.some((stmt) => {
    if (stmt.type !== 'ExpressionStatement') {
      return false
    }
    const expr = (stmt as unknown as ExprStmtNode).expression
    return hasThenWithOnCallback(expr)
  })
}

function hasThenWithOnCallback(node: { type: string; [key: string]: unknown }): boolean {
  if (node.type !== 'CallExpression') {
    return false
  }
  const call = node as unknown as CallWithArgs
  const callee = call.callee
  if (callee.type !== 'MemberExpression') {
    return false
  }
  const member = callee as unknown as MemberNode
  const property = member.property as { type: string; name?: string }
  if (property.type === 'Identifier' && property.name === 'then') {
    const firstArg = call.arguments[0]
    if (firstArg && isOnCallbackIdentifier(firstArg)) {
      return true
    }
  }
  return hasThenWithOnCallback(member.object as { type: string; [key: string]: unknown })
}

function isOnCallbackIdentifier(node: { type: string; [key: string]: unknown }): boolean {
  if (node.type !== 'Identifier') {
    return false
  }
  const name = (node as unknown as IdentifierNode).name
  return /^on[A-Z]/.test(name)
}

interface CallWithArgs {
  callee: { type: string; [key: string]: unknown }
  arguments: Array<{ type: string; [key: string]: unknown }>
}

export default rule
