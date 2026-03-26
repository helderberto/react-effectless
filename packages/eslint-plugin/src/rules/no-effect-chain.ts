import type { Rule } from 'eslint'
import { isUseEffectCall, isComponentFunction } from '@/utils/ast'
import { resolveHookName } from '@/utils/scope'
import { parseDepsArray } from '@/utils/dependency'
import type {
  NodeWithParent,
  NodeWithArgs,
  NodeWithBody,
  NodeWithStatements,
  ExprStmtNode,
  CallNode,
  IdentifierNode,
} from '@/types'

interface EffectInfo {
  node: Rule.Node
  deps: string[]
  setterTargets: string[]
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: {
      noEffectChain:
        "Avoid chaining useEffect calls where one effect's setState triggers another. Consolidate the logic into a single event handler.",
    },
  },
  create(context) {
    const componentStack: EffectInfo[][] = []

    function enterFunction(node: Rule.Node) {
      if (isComponentFunction(node)) {
        componentStack.push([])
      }
    }

    function exitFunction(node: Rule.Node) {
      if (!isComponentFunction(node)) {
        return
      }
      const effects = componentStack.pop()
      if (!effects || effects.length < 2) {
        return
      }
      reportChains(effects, context)
    }

    return {
      FunctionDeclaration: enterFunction,
      'FunctionDeclaration:exit': exitFunction,
      ArrowFunctionExpression: enterFunction,
      'ArrowFunctionExpression:exit': exitFunction,
      FunctionExpression: enterFunction,
      'FunctionExpression:exit': exitFunction,
      CallExpression(node) {
        if (componentStack.length === 0) {
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
        const setterTargets = extractSetterTargets(node)
        const top = componentStack[componentStack.length - 1]
        if (top) {
          top.push({ node, deps, setterTargets })
        }
      },
    }
  },
}

function reportChains(effects: EffectInfo[], context: Rule.RuleContext) {
  for (const effect of effects) {
    const isDownstream = effect.deps.some((dep) =>
      effects.some((other) => other !== effect && other.setterTargets.includes(dep)),
    )
    if (isDownstream) {
      context.report({ node: effect.node, messageId: 'noEffectChain' })
    }
  }
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

function extractSetterTargets(effectNode: Rule.Node): string[] {
  const args = (effectNode as NodeWithArgs).arguments
  const callback = args[0]
  if (!callback) {
    return []
  }
  if (callback.type !== 'ArrowFunctionExpression' && callback.type !== 'FunctionExpression') {
    return []
  }
  const body = (callback as unknown as NodeWithBody).body
  if (!body || body.type !== 'BlockStatement') {
    return []
  }
  const stmts = (body as unknown as NodeWithStatements).body
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

export default rule
