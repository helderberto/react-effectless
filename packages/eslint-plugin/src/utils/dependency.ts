import type { Rule, Scope } from 'eslint'
import type { CallExpression, Node, Expression, SpreadElement, Pattern } from 'estree'

export function parseDepsArray(node: CallExpression & Rule.NodeParentExtension): string[] | null {
  const depsArg = node.arguments[1]
  if (!depsArg || depsArg.type !== 'ArrayExpression') return null
  const names: string[] = []
  for (const el of depsArg.elements) {
    if (el && el.type === 'Identifier') names.push(el.name)
  }
  return names
}

export function getStateSetters(node: CallExpression & Rule.NodeParentExtension): string[] {
  const callback = node.arguments[0]
  if (
    !callback ||
    (callback.type !== 'ArrowFunctionExpression' && callback.type !== 'FunctionExpression')
  ) {
    return []
  }
  const setters: string[] = []
  collectSetterCalls(callback.body, setters)
  return setters
}

function collectSetterCalls(
  node: Node | Expression | SpreadElement | Pattern,
  setters: string[],
): void {
  if (!node || typeof node !== 'object') return
  if (node.type === 'CallExpression') {
    if (node.callee.type === 'Identifier' && node.callee.name.startsWith('set')) {
      setters.push(node.callee.name)
    }
    for (const arg of node.arguments) collectSetterCalls(arg, setters)
  } else if (node.type === 'BlockStatement') {
    for (const stmt of node.body) collectSetterCalls(stmt, setters)
  } else if (node.type === 'ExpressionStatement') {
    collectSetterCalls(node.expression, setters)
  } else if (node.type === 'IfStatement') {
    collectSetterCalls(node.consequent, setters)
    if (node.alternate) collectSetterCalls(node.alternate, setters)
  } else if (node.type === 'ReturnStatement' && node.argument) {
    collectSetterCalls(node.argument, setters)
  }
}

export function traceDepOrigin(
  dep: string,
  node: CallExpression & Rule.NodeParentExtension,
  context: Rule.RuleContext,
): 'prop' | 'state' | 'unknown' {
  const scope = context.sourceCode.getScope(node)
  const variable = findVariable(scope, dep)
  if (!variable) return 'unknown'

  for (const def of variable.defs) {
    if (def.type === 'Parameter') return 'prop'
    if (def.type === 'Variable' && def.node.type === 'VariableDeclarator') {
      const decl = def.node
      if (
        decl.id.type === 'ArrayPattern' &&
        decl.init?.type === 'CallExpression' &&
        decl.init.callee.type === 'Identifier' &&
        decl.init.callee.name === 'useState'
      )
        return 'state'
    }
  }

  return 'unknown'
}

function findVariable(scope: Scope.Scope, name: string): Scope.Variable | null {
  let current: Scope.Scope | null = scope
  while (current) {
    const variable = current.set.get(name)
    if (variable) return variable
    current = current.upper
  }
  return null
}
