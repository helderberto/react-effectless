import rule from '@/rules/no-effect-chain'
import { tester } from '../rule-tester'

describe('no-effect-chain', () => {
  tester.run('no-effect-chain', rule, {
    valid: [
      // independent effects — no overlap between setters and deps
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component({ raw, title }) {
            const [processed, setProcessed] = useState(null)
            const [label, setLabel] = useState('')
            useEffect(() => {
              setProcessed(transform(raw))
            }, [raw])
            useEffect(() => {
              setLabel(title.trim())
            }, [title])
          }
        `,
      },
      // fetch + unrelated state update — not a chain
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component({ id, title }) {
            const [data, setData] = useState(null)
            useEffect(() => {
              fetch('/api/' + id).then(r => r.json()).then(setData)
            }, [id])
            useEffect(() => {
              document.title = title
            }, [title])
          }
        `,
      },
      // subscription with cleanup — legitimate, not a chain
      {
        code: `
          import { useEffect } from 'react'
          function Component({ store, filter }) {
            useEffect(() => {
              const sub = store.subscribe(() => {})
              return () => sub.unsubscribe()
            }, [store])
            useEffect(() => {
              const sub = filter.watch(() => {})
              return () => sub.cancel()
            }, [filter])
          }
        `,
      },
      // custom hook — must not be flagged
      {
        code: `
          import { useEffect, useState } from 'react'
          function useChain(raw) {
            const [processed, setProcessed] = useState(null)
            const [output, setOutput] = useState(null)
            useEffect(() => {
              setProcessed(transform(raw))
            }, [raw])
            useEffect(() => {
              setOutput(format(processed))
            }, [processed])
          }
        `,
      },
      // single effect with multiple setState — not a chain (no second effect)
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component({ raw }) {
            const [a, setA] = useState(null)
            const [b, setB] = useState(null)
            useEffect(() => {
              setA(transform(raw))
              setB(format(raw))
            }, [raw])
          }
        `,
      },
      // dep is external var, not state from another effect
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component({ userId, theme }) {
            const [profile, setProfile] = useState(null)
            useEffect(() => {
              setProfile(lookup(userId))
            }, [userId])
            useEffect(() => {
              applyTheme(theme)
            }, [theme])
          }
        `,
      },
    ],
    invalid: [
      // basic two-effect chain: setProcessed writes processed, second effect reads it
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component({ raw }) {
            const [processed, setProcessed] = useState(null)
            const [output, setOutput] = useState(null)
            useEffect(() => {
              setProcessed(transform(raw))
            }, [raw])
            useEffect(() => {
              setOutput(format(processed))
            }, [processed])
          }
        `,
        errors: [
          {
            message:
              "Avoid chaining useEffect calls where one effect's setState triggers another. Consolidate the logic into a single event handler.",
          },
        ],
      },
      // reversed order in source — still a chain
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component({ raw }) {
            const [processed, setProcessed] = useState(null)
            const [output, setOutput] = useState(null)
            useEffect(() => {
              setOutput(format(processed))
            }, [processed])
            useEffect(() => {
              setProcessed(transform(raw))
            }, [raw])
          }
        `,
        errors: [
          {
            message:
              "Avoid chaining useEffect calls where one effect's setState triggers another. Consolidate the logic into a single event handler.",
          },
        ],
      },
      // three-effect chain: A→B→C, B and C are both downstream
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component({ a }) {
            const [b, setB] = useState(null)
            const [c, setC] = useState(null)
            const [d, setD] = useState(null)
            useEffect(() => {
              setB(f(a))
            }, [a])
            useEffect(() => {
              setC(g(b))
            }, [b])
            useEffect(() => {
              setD(h(c))
            }, [c])
          }
        `,
        errors: [
          {
            message:
              "Avoid chaining useEffect calls where one effect's setState triggers another. Consolidate the logic into a single event handler.",
          },
          {
            message:
              "Avoid chaining useEffect calls where one effect's setState triggers another. Consolidate the logic into a single event handler.",
          },
        ],
      },
      // renamed import — same anti-pattern
      {
        code: `
          import { useEffect as ue, useState } from 'react'
          function Component({ raw }) {
            const [x, setX] = useState(null)
            const [y, setY] = useState(null)
            ue(() => {
              setX(f(raw))
            }, [raw])
            ue(() => {
              setY(g(x))
            }, [x])
          }
        `,
        errors: [
          {
            message:
              "Avoid chaining useEffect calls where one effect's setState triggers another. Consolidate the logic into a single event handler.",
          },
        ],
      },
      // nested component — inner has chain
      {
        code: `
          import { useEffect, useState } from 'react'
          function Outer() {
            function Inner({ raw }) {
              const [processed, setProcessed] = useState(null)
              const [output, setOutput] = useState(null)
              useEffect(() => {
                setProcessed(transform(raw))
              }, [raw])
              useEffect(() => {
                setOutput(format(processed))
              }, [processed])
            }
          }
        `,
        errors: [
          {
            message:
              "Avoid chaining useEffect calls where one effect's setState triggers another. Consolidate the logic into a single event handler.",
          },
        ],
      },
    ],
  })
})
