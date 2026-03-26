import { RuleTester } from 'eslint'
import rule from '@/rules/no-derived-state'

const tester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      ecmaFeatures: { jsx: true },
    },
  },
})

describe('no-derived-state', () => {
  it('passes valid cases and flags invalid cases', () => {
    tester.run('no-derived-state', rule, {
      valid: [
        // fetch side effect — legitimate useEffect
        {
          code: `
            import { useEffect, useState } from 'react'
            function Component({ id }) {
              const [data, setData] = useState(null)
              useEffect(() => {
                fetch('/api/' + id).then(r => r.json()).then(setData)
              }, [id])
            }
          `,
        },
        // subscription — legitimate useEffect
        {
          code: `
            import { useEffect } from 'react'
            function Component({ store }) {
              useEffect(() => {
                const sub = store.subscribe(() => {})
                return () => sub.unsubscribe()
              }, [store])
            }
          `,
        },
        // DOM manipulation — legitimate useEffect
        {
          code: `
            import { useEffect, useRef } from 'react'
            function Component() {
              const ref = useRef(null)
              useEffect(() => {
                ref.current.focus()
              }, [])
            }
          `,
        },
        // inline calculation — already correct pattern
        {
          code: `
            function Component({ a, b }) {
              const sum = a + b
              return sum
            }
          `,
        },
        // useMemo — already correct pattern
        {
          code: `
            import { useMemo } from 'react'
            function Component({ items }) {
              const sorted = useMemo(() => [...items].sort(), [items])
            }
          `,
        },
        // custom hook using useEffect internally — must not be flagged
        {
          code: `
            import { useEffect, useState } from 'react'
            function useCustomHook(dep) {
              const [val, setVal] = useState(null)
              useEffect(() => {
                setVal(dep * 2)
              }, [dep])
              return val
            }
          `,
        },
        // renamed import but effect does not purely derive state
        {
          code: `
            import { useEffect as ue, useState } from 'react'
            function Component({ id }) {
              const [data, setData] = useState(null)
              ue(() => {
                fetch('/api/' + id).then(r => r.json()).then(setData)
              }, [id])
            }
          `,
        },
        // nested component — inner component effect is legitimate fetch
        {
          code: `
            import { useEffect, useState } from 'react'
            function Outer() {
              function Inner({ id }) {
                const [data, setData] = useState(null)
                useEffect(() => {
                  fetch('/api/' + id).then(r => r.json()).then(setData)
                }, [id])
              }
            }
          `,
        },
      ],
      invalid: [
        // pure prop → state derivation
        {
          code: `
            import { useEffect, useState } from 'react'
            function Component({ userId }) {
              const [id, setId] = useState(userId)
              useEffect(() => {
                setId(userId)
              }, [userId])
            }
          `,
          errors: [{ messageId: 'noDerivedState' }],
        },
        // arithmetic derivation
        {
          code: `
            import { useEffect, useState } from 'react'
            function Component({ a, b }) {
              const [sum, setSum] = useState(0)
              useEffect(() => {
                setSum(a + b)
              }, [a, b])
            }
          `,
          errors: [{ messageId: 'noDerivedState' }],
        },
        // string concat derivation
        {
          code: `
            import { useEffect, useState } from 'react'
            function Component({ first, last }) {
              const [full, setFull] = useState('')
              useEffect(() => {
                setFull(first + ' ' + last)
              }, [first, last])
            }
          `,
          errors: [{ messageId: 'noDerivedState' }],
        },
        // prop passed directly to setState
        {
          code: `
            import { useEffect, useState } from 'react'
            function Component({ value }) {
              const [local, setLocal] = useState(value)
              useEffect(() => {
                setLocal(value)
              }, [value])
            }
          `,
          errors: [{ messageId: 'noDerivedState' }],
        },
        // renamed import — same anti-pattern
        {
          code: `
            import { useEffect as ue, useState } from 'react'
            function Component({ count }) {
              const [doubled, setDoubled] = useState(0)
              ue(() => {
                setDoubled(count * 2)
              }, [count])
            }
          `,
          errors: [{ messageId: 'noDerivedState' }],
        },
        // nested component — inner component has anti-pattern
        {
          code: `
            import { useEffect, useState } from 'react'
            function Outer() {
              function Inner({ value }) {
                const [local, setLocal] = useState(value)
                useEffect(() => {
                  setLocal(value)
                }, [value])
              }
            }
          `,
          errors: [{ messageId: 'noDerivedState' }],
        },
      ],
    })
  })
})
