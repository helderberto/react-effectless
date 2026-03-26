import rule from '@/rules/no-effect-memo'
import { tester } from '../rule-tester'

describe('no-effect-memo', () => {
  tester.run('no-effect-memo', rule, {
    valid: [
      // fetch — legitimate useEffect
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
      // already using useMemo — correct pattern
      {
        code: `
          import { useMemo } from 'react'
          function Component({ items }) {
            const filtered = useMemo(() => items.filter(x => x.active), [items])
          }
        `,
      },
      // setState with a non-array-method value — not this anti-pattern
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component({ count }) {
            const [doubled, setDoubled] = useState(0)
            useEffect(() => {
              setDoubled(count * 2)
            }, [count])
          }
        `,
      },
      // custom hook using useEffect with array method internally — must not be flagged
      {
        code: `
          import { useEffect, useState } from 'react'
          function useFilteredItems(items) {
            const [result, setResult] = useState([])
            useEffect(() => {
              setResult(items.filter(x => x.active))
            }, [items])
            return result
          }
        `,
      },
      // renamed import but effect is a fetch — not flagged
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
    ],
    invalid: [
      // setState with .filter()
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component({ items }) {
            const [active, setActive] = useState([])
            useEffect(() => {
              setActive(items.filter(x => x.active))
            }, [items])
          }
        `,
        errors: [
          {
            message:
              'Avoid using useEffect to compute derived array values. Use useMemo(() => compute(), [deps]) instead.',
          },
        ],
      },
      // setState with .map()
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component({ users }) {
            const [names, setNames] = useState([])
            useEffect(() => {
              setNames(users.map(u => u.name))
            }, [users])
          }
        `,
        errors: [
          {
            message:
              'Avoid using useEffect to compute derived array values. Use useMemo(() => compute(), [deps]) instead.',
          },
        ],
      },
      // setState with .reduce()
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component({ items }) {
            const [total, setTotal] = useState(0)
            useEffect(() => {
              setTotal(items.reduce((acc, x) => acc + x.price, 0))
            }, [items])
          }
        `,
        errors: [
          {
            message:
              'Avoid using useEffect to compute derived array values. Use useMemo(() => compute(), [deps]) instead.',
          },
        ],
      },
      // setState with .sort()
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component({ items }) {
            const [sorted, setSorted] = useState([])
            useEffect(() => {
              setSorted([...items].sort((a, b) => a.name.localeCompare(b.name)))
            }, [items])
          }
        `,
        errors: [
          {
            message:
              'Avoid using useEffect to compute derived array values. Use useMemo(() => compute(), [deps]) instead.',
          },
        ],
      },
      // setState with .flatMap()
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component({ groups }) {
            const [flat, setFlat] = useState([])
            useEffect(() => {
              setFlat(groups.flatMap(g => g.items))
            }, [groups])
          }
        `,
        errors: [
          {
            message:
              'Avoid using useEffect to compute derived array values. Use useMemo(() => compute(), [deps]) instead.',
          },
        ],
      },
      // renamed import — same anti-pattern
      {
        code: `
          import { useEffect as ue, useState } from 'react'
          function Component({ items }) {
            const [active, setActive] = useState([])
            ue(() => {
              setActive(items.filter(x => x.active))
            }, [items])
          }
        `,
        errors: [
          {
            message:
              'Avoid using useEffect to compute derived array values. Use useMemo(() => compute(), [deps]) instead.',
          },
        ],
      },
      // nested component — inner has anti-pattern
      {
        code: `
          import { useEffect, useState } from 'react'
          function Outer() {
            function Inner({ items }) {
              const [mapped, setMapped] = useState([])
              useEffect(() => {
                setMapped(items.map(x => x.id))
              }, [items])
            }
          }
        `,
        errors: [
          {
            message:
              'Avoid using useEffect to compute derived array values. Use useMemo(() => compute(), [deps]) instead.',
          },
        ],
      },
    ],
  })
})
