import rule from '@/rules/no-effect-adjust-state'
import { tester } from '../rule-tester'

describe('no-effect-adjust-state', () => {
  tester.run('no-effect-adjust-state', rule, {
    valid: [
      // fetch inside condition — legitimate
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component({ id }) {
            const [data, setData] = useState(null)
            useEffect(() => {
              if (id) fetch('/api/' + id).then(r => r.json()).then(setData)
            }, [id])
          }
        `,
      },
      // subscription with cleanup — legitimate
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
      // no setState call — not this pattern
      {
        code: `
          import { useEffect } from 'react'
          function Component({ enabled }) {
            useEffect(() => {
              if (enabled) analytics.track('enabled')
            }, [enabled])
          }
        `,
      },
      // unconditional setState — no-derived-state territory, not this rule
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
      },
      // custom hook — must not be flagged
      {
        code: `
          import { useEffect, useState } from 'react'
          function useAdjusted(items) {
            const [sel, setSel] = useState(null)
            useEffect(() => {
              if (items.length === 0) setSel(null)
            }, [items])
            return sel
          }
        `,
      },
      // renamed import — not this pattern (no setState)
      {
        code: `
          import { useEffect as ue } from 'react'
          function Component({ flag }) {
            ue(() => {
              if (flag) logEvent('on')
            }, [flag])
          }
        `,
      },
      // member expression call with ternary arg — isSetterWithConditionalArg returns false for non-Identifier callee
      {
        code: `
          import { useEffect } from 'react'
          function Component({ isAdmin, userId }) {
            useEffect(() => {
              obj.set(isAdmin ? userId : null)
            }, [isAdmin, userId])
          }
        `,
      },
    ],
    invalid: [
      // if + setState — partial state adjustment
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component({ items }) {
            const [selection, setSelection] = useState(null)
            useEffect(() => {
              if (items.length === 0) setSelection(null)
            }, [items])
          }
        `,
        errors: [
          {
            message:
              'Avoid adjusting state in useEffect when a prop changes. Derive the value during render instead.',
          },
        ],
      },
      // if/else + setState
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component({ count }) {
            const [clamped, setClamped] = useState(0)
            useEffect(() => {
              if (count < 0) setClamped(0)
              else setClamped(count)
            }, [count])
          }
        `,
        errors: [
          {
            message:
              'Avoid adjusting state in useEffect when a prop changes. Derive the value during render instead.',
          },
        ],
      },
      // conditional (ternary) in setter arg using dep
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component({ isAdmin, userId }) {
            const [visibleId, setVisibleId] = useState(null)
            useEffect(() => {
              setVisibleId(isAdmin ? userId : null)
            }, [isAdmin, userId])
          }
        `,
        errors: [
          {
            message:
              'Avoid adjusting state in useEffect when a prop changes. Derive the value during render instead.',
          },
        ],
      },
      // renamed import — same anti-pattern
      {
        code: `
          import { useEffect as ue, useState } from 'react'
          function Component({ items }) {
            const [sel, setSel] = useState(null)
            ue(() => {
              if (items.length === 0) setSel(null)
            }, [items])
          }
        `,
        errors: [
          {
            message:
              'Avoid adjusting state in useEffect when a prop changes. Derive the value during render instead.',
          },
        ],
      },
      // nested component — inner has anti-pattern
      {
        code: `
          import { useEffect, useState } from 'react'
          function Outer() {
            function Inner({ value }) {
              const [capped, setCapped] = useState(0)
              useEffect(() => {
                if (value > 100) setCapped(100)
              }, [value])
            }
          }
        `,
        errors: [
          {
            message:
              'Avoid adjusting state in useEffect when a prop changes. Derive the value during render instead.',
          },
        ],
      },
      // multiple conditional setters
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component({ page, total }) {
            const [current, setCurrent] = useState(0)
            useEffect(() => {
              if (page > total) setCurrent(total)
            }, [page, total])
          }
        `,
        errors: [
          {
            message:
              'Avoid adjusting state in useEffect when a prop changes. Derive the value during render instead.',
          },
        ],
      },
    ],
  })
})
