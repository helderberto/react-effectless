import rule from '@/rules/no-derived-state'
import { tester } from '../rule-tester'

describe('no-derived-state', () => {
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
        errors: [
          {
            message:
              'Derive this value during render instead of syncing it with useEffect. Use an inline calculation or useMemo.',
          },
        ],
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
        errors: [
          {
            message:
              'Derive this value during render instead of syncing it with useEffect. Use an inline calculation or useMemo.',
          },
        ],
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
        errors: [
          {
            message:
              'Derive this value during render instead of syncing it with useEffect. Use an inline calculation or useMemo.',
          },
        ],
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
        errors: [
          {
            message:
              'Derive this value during render instead of syncing it with useEffect. Use an inline calculation or useMemo.',
          },
        ],
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
        errors: [
          {
            message:
              'Derive this value during render instead of syncing it with useEffect. Use an inline calculation or useMemo.',
          },
        ],
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
        errors: [
          {
            message:
              'Derive this value during render instead of syncing it with useEffect. Use an inline calculation or useMemo.',
          },
        ],
      },
      // template literal derivation
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component({ firstName, lastName }) {
            const [greeting, setGreeting] = useState('')
            useEffect(() => {
              setGreeting(\`Hello \${firstName} \${lastName}\`)
            }, [firstName, lastName])
          }
        `,
        errors: [
          {
            message:
              'Derive this value during render instead of syncing it with useEffect. Use an inline calculation or useMemo.',
          },
        ],
      },
      // expression body arrow function callback
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component({ a, b }) {
            const [sum, setSum] = useState(0)
            useEffect(() => setSum(a + b), [a, b])
          }
        `,
        errors: [
          {
            message:
              'Derive this value during render instead of syncing it with useEffect. Use an inline calculation or useMemo.',
          },
        ],
      },
    ],
  })
})
