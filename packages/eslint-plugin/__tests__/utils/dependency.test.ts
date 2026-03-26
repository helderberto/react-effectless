import { RuleTester } from 'eslint'
import type { Rule } from 'eslint'
import { parseDepsArray, getStateSetters, traceDepOrigin } from '@/utils/dependency'

const tester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      ecmaFeatures: { jsx: true },
    },
  },
})

describe('parseDepsArray', () => {
  const rule: Rule.RuleModule = {
    meta: {
      type: 'suggestion',
      schema: [],
      messages: { deps: '{{deps}}', noDeps: 'noDeps', emptyDeps: 'emptyDeps' },
    },
    create: (context) => ({
      CallExpression(node) {
        const callee = node.callee
        if (callee.type !== 'Identifier' || callee.name !== 'useEffect') return
        const deps = parseDepsArray(node)
        if (deps === null) context.report({ node, messageId: 'noDeps' })
        else if (deps.length === 0) context.report({ node, messageId: 'emptyDeps' })
        else context.report({ node, messageId: 'deps', data: { deps: deps.join(',') } })
      },
    }),
  }

  tester.run('parseDepsArray', rule, {
    valid: [],
    invalid: [
      {
        code: 'useEffect(() => {}, [count, name])',
        errors: [{ messageId: 'deps', data: { deps: 'count,name' } }],
      },
      {
        code: 'useEffect(() => {}, [])',
        errors: [{ messageId: 'emptyDeps' }],
      },
      {
        code: 'useEffect(() => {})',
        errors: [{ messageId: 'noDeps' }],
      },
    ],
  })
})

describe('getStateSetters', () => {
  const rule: Rule.RuleModule = {
    meta: { type: 'suggestion', schema: [], messages: { setters: '{{setters}}', none: 'none' } },
    create: (context) => ({
      CallExpression(node) {
        const callee = node.callee
        if (callee.type !== 'Identifier' || callee.name !== 'useEffect') return
        const setters = getStateSetters(node)
        if (setters.length === 0) context.report({ node, messageId: 'none' })
        else context.report({ node, messageId: 'setters', data: { setters: setters.join(',') } })
      },
    }),
  }

  tester.run('getStateSetters', rule, {
    valid: [],
    invalid: [
      {
        code: 'useEffect(() => { setCount(x + 1) }, [x])',
        errors: [{ messageId: 'setters', data: { setters: 'setCount' } }],
      },
      {
        code: 'useEffect(() => { console.log("hi") }, [])',
        errors: [{ messageId: 'none' }],
      },
      {
        code: 'useEffect(() => { setA(1); setB(2) }, [])',
        errors: [{ messageId: 'setters', data: { setters: 'setA,setB' } }],
      },
    ],
  })
})

describe('traceDepOrigin', () => {
  const rule: Rule.RuleModule = {
    meta: { type: 'suggestion', schema: [], messages: { origin: '{{origin}}' } },
    create: (context) => ({
      CallExpression(node) {
        const callee = node.callee
        if (callee.type !== 'Identifier' || callee.name !== 'useEffect') return
        const deps = parseDepsArray(node)
        if (!deps || deps.length === 0) return
        for (const dep of deps) {
          const origin = traceDepOrigin(dep, node, context)
          context.report({ node, messageId: 'origin', data: { origin } })
        }
      },
    }),
  }

  tester.run('traceDepOrigin', rule, {
    valid: [],
    invalid: [
      {
        code: `
          function Component({ userId }) {
            useEffect(() => { setData(userId) }, [userId])
          }
        `,
        errors: [{ messageId: 'origin', data: { origin: 'prop' } }],
      },
      {
        code: `
          function Component() {
            const [count, setCount] = useState(0)
            useEffect(() => { setTotal(count * 2) }, [count])
          }
        `,
        errors: [{ messageId: 'origin', data: { origin: 'state' } }],
      },
      {
        code: 'useEffect(() => {}, [externalValue])',
        errors: [{ messageId: 'origin', data: { origin: 'unknown' } }],
      },
    ],
  })
})
