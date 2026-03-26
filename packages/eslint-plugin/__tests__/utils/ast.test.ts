import { RuleTester } from 'eslint'
import type { Rule } from 'eslint'
import { isUseEffectCall, getCalleeHookName, isComponentFunction } from '@/utils/ast'

const tester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      ecmaFeatures: { jsx: true },
    },
  },
})

describe('isUseEffectCall', () => {
  const rule: Rule.RuleModule = {
    meta: { type: 'suggestion', schema: [], messages: { yes: 'yes' } },
    create: (context) => ({
      CallExpression(node) {
        if (isUseEffectCall(node)) context.report({ node, messageId: 'yes' })
      },
    }),
  }

  tester.run('isUseEffectCall', rule, {
    valid: [
      { code: 'useState(null)' },
      { code: 'fetchData()' },
      { code: 'React.useEffect(() => {}, [])' },
    ],
    invalid: [
      { code: 'useEffect(() => {}, [])', errors: [{ messageId: 'yes' }] },
      { code: 'useEffect(() => {})', errors: [{ messageId: 'yes' }] },
    ],
  })
})

describe('getCalleeHookName', () => {
  const rule: Rule.RuleModule = {
    meta: { type: 'suggestion', schema: [], messages: { name: '{{name}}' } },
    create: (context) => ({
      CallExpression(node) {
        const name = getCalleeHookName(node)
        if (name) context.report({ node, messageId: 'name', data: { name } })
      },
    }),
  }

  tester.run('getCalleeHookName', rule, {
    valid: [{ code: 'React.useEffect(() => {}, [])' }],
    invalid: [
      {
        code: 'useEffect(() => {}, [])',
        errors: [{ messageId: 'name', data: { name: 'useEffect' } }],
      },
      { code: 'useState(null)', errors: [{ messageId: 'name', data: { name: 'useState' } }] },
      { code: 'foo()', errors: [{ messageId: 'name', data: { name: 'foo' } }] },
    ],
  })
})

describe('isComponentFunction', () => {
  const rule: Rule.RuleModule = {
    meta: { type: 'suggestion', schema: [], messages: { yes: 'yes' } },
    create: (context) => ({
      FunctionDeclaration(node) {
        if (isComponentFunction(node)) context.report({ node, messageId: 'yes' })
      },
      'VariableDeclarator > ArrowFunctionExpression'(node: Rule.Node) {
        if (isComponentFunction(node)) context.report({ node, messageId: 'yes' })
      },
    }),
  }

  tester.run('isComponentFunction', rule, {
    valid: [
      { code: 'function myHelper() { return null }' },
      { code: 'function useFoo() { return null }' },
      { code: 'const fn = () => null' },
    ],
    invalid: [
      { code: 'function MyComponent() { return null }', errors: [{ messageId: 'yes' }] },
      { code: 'function Button() { return null }', errors: [{ messageId: 'yes' }] },
      { code: 'const MyComponent = () => null', errors: [{ messageId: 'yes' }] },
    ],
  })
})
