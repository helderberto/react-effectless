import type { Rule } from 'eslint'
import type { Statement, FunctionDeclaration } from 'estree'
import { isUseEffectCall, isComponentFunction } from '@/utils/ast'
import { resolveHookName } from '@/utils/scope'
import { parseDepsArray } from '@/utils/dependency'
import type {
  NodeWithParent,
  NodeWithBody,
  NodeWithStatements,
  ExprStmtNode,
  CallNode,
  IdentifierNode,
} from '@/types'

interface EffectEntry {
  node: Rule.Node
  deps: string[]
  hasUnconditionalExternalCall: boolean
  hasCleanupReturn: boolean
  hasIfStatement: boolean
}

interface ComponentScope {
  handlerVars: Set<string>
  effects: EffectEntry[]
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: {
      noEffectEventHandler:
        'This effect fires because of state set in an event handler. Move the logic into the handler directly.',
    },
  },
  create(context) {
    const stack: ComponentScope[] = []

    function enterFunction(node: Rule.Node) {
      if (!isComponentFunction(node)) {
        return
      }
      stack.push({ handlerVars: new Set(), effects: [] })
    }

    function exitFunction(node: Rule.Node) {
      if (!isComponentFunction(node)) {
        return
      }
      const scope = stack.pop()
      if (!scope || scope.effects.length === 0) {
        return
      }
      for (const effect of scope.effects) {
        if (effect.deps.length === 0) {
          continue
        }
        if (!effect.deps.every((dep) => scope.handlerVars.has(dep))) {
          continue
        }
        if (!effect.hasUnconditionalExternalCall) {
          continue
        }
        if (effect.hasCleanupReturn) {
          continue
        }
        if (effect.hasIfStatement) {
          continue
        }
        context.report({ node: effect.node, messageId: 'noEffectEventHandler' })
      }
    }

    return {
      FunctionDeclaration(node) {
        enterFunction(node as unknown as Rule.Node)
        const top = stack[stack.length - 1]
        if (!top) {
          return
        }
        const name = (node as FunctionDeclaration).id?.name
        if (!name?.startsWith('handle')) {
          return
        }
        const body = (node as FunctionDeclaration).body
        const setters = extractSetterTargetsFromStmts(body.body as Statement[])
        for (const s of setters) {
          top.handlerVars.add(s)
        }
      },
      'FunctionDeclaration:exit': exitFunction,
      ArrowFunctionExpression: enterFunction,
      'ArrowFunctionExpression:exit': exitFunction,
      FunctionExpression: enterFunction,
      'FunctionExpression:exit': exitFunction,
      CallExpression(node) {
        if (stack.length === 0) {
          return
        }
        const hookName = resolveHookName(node, context)
        if (hookName !== 'useEffect' && !isUseEffectCall(node)) {
          return
        }
        const enclosingFn = getEnclosingFunction(node)
        if (!enclosingFn || !isComponentFunction(enclosingFn)) {
          return
        }
        const deps = parseDepsArray(node) ?? []
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
        const top = stack[stack.length - 1]
        if (!top) {
          return
        }
        top.effects.push({
          node,
          deps,
          hasUnconditionalExternalCall: stmts.some(isUnconditionalExternalCallStmt),
          hasCleanupReturn: hasReturnWithValue(stmts),
          hasIfStatement: stmts.some((s) => s.type === 'IfStatement'),
        })
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

function extractSetterTargetsFromStmts(stmts: Statement[]): string[] {
  const targets: string[] = []
  for (const stmt of stmts) {
    if (stmt.type !== 'ExpressionStatement') {
      continue
    }
    const expr = (stmt as unknown as ExprStmtNode).expression
    if (expr.type !== 'CallExpression') {
      continue
    }
    const call = expr as CallNode
    if (call.callee.type !== 'Identifier') {
      continue
    }
    const name = (call.callee as IdentifierNode).name
    if (!name.startsWith('set') || name.length <= 3) {
      continue
    }
    const fourth = name[3]
    if (fourth !== undefined) {
      targets.push(fourth.toLowerCase() + name.slice(4))
    }
  }
  return targets
}

function isUnconditionalExternalCallStmt(stmt: Statement): boolean {
  if (stmt.type !== 'ExpressionStatement') {
    return false
  }
  const expr = (stmt as unknown as ExprStmtNode).expression
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
