import { RuleTester } from 'eslint'
import type { Rule } from 'eslint'
import { resolveHookName } from '@/utils/scope'

const tester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      ecmaFeatures: { jsx: true },
    },
  },
})

describe('resolveHookName', () => {
  const rule: Rule.RuleModule = {
    meta: { type: 'suggestion', schema: [], messages: { resolved: '{{name}}' } },
    create: (context) => ({
      CallExpression(node) {
        const name = resolveHookName(node, context)
        if (name) context.report({ node, messageId: 'resolved', data: { name } })
      },
    }),
  }

  tester.run('resolveHookName', rule, {
    valid: [
      {
        code: `
          import { useEffect } from 'some-other-lib'
          useEffect(() => {}, [])
        `,
      },
      { code: 'unknownFn()' },
    ],
    invalid: [
      {
        code: `
          import { useEffect } from 'react'
          useEffect(() => {}, [])
        `,
        errors: [{ messageId: 'resolved', data: { name: 'useEffect' } }],
      },
      {
        code: `
          import { useEffect as ue } from 'react'
          ue(() => {}, [])
        `,
        errors: [{ messageId: 'resolved', data: { name: 'useEffect' } }],
      },
      {
        code: `
          import { useState as us } from 'react'
          us(null)
        `,
        errors: [{ messageId: 'resolved', data: { name: 'useState' } }],
      },
    ],
  })
})
