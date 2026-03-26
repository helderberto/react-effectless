import rule from '@/rules/no-effect-reset-state'
import { tester } from '../rule-tester'

describe('no-effect-reset-state', () => {
  tester.run('no-effect-reset-state', rule, {
    valid: [
      // single setter — not resetting all state
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component({ userId }) {
            const [page, setPage] = useState(0)
            useEffect(() => {
              setPage(0)
            }, [userId])
          }
        `,
      },
      // setter with computed value — different anti-pattern
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component({ userId }) {
            const [name, setName] = useState('')
            const [age, setAge] = useState(0)
            useEffect(() => {
              setName(userId.name)
              setAge(userId.age)
            }, [userId])
          }
        `,
      },
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
      // has cleanup return — legitimate
      {
        code: `
          import { useEffect } from 'react'
          function Component({ id }) {
            useEffect(() => {
              const sub = subscribe(id)
              return () => sub.unsubscribe()
            }, [id])
          }
        `,
      },
      // custom hook — must not be flagged
      {
        code: `
          import { useEffect, useState } from 'react'
          function useReset(key) {
            const [a, setA] = useState(null)
            const [b, setB] = useState(null)
            useEffect(() => {
              setA(null)
              setB(null)
            }, [key])
          }
        `,
      },
      // empty deps — different pattern (app-init)
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component() {
            const [a, setA] = useState(null)
            const [b, setB] = useState(false)
            useEffect(() => {
              setA(null)
              setB(false)
            }, [])
          }
        `,
      },
      // has conditional — different pattern (adjust-state)
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component({ items }) {
            const [sel, setSel] = useState(null)
            const [page, setPage] = useState(0)
            useEffect(() => {
              if (items.length === 0) {
                setSel(null)
                setPage(0)
              }
            }, [items])
          }
        `,
      },
    ],
    invalid: [
      // two setters resetting to null and empty array
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component({ userId }) {
            const [selection, setSelection] = useState(null)
            const [filters, setFilters] = useState([])
            useEffect(() => {
              setSelection(null)
              setFilters([])
            }, [userId])
          }
        `,
        errors: [
          {
            message:
              'Avoid resetting all state in a useEffect when a prop changes. Pass a key prop to the component from the parent instead.',
          },
        ],
      },
      // three setters resetting to 0, '', false
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component({ tab }) {
            const [page, setPage] = useState(0)
            const [query, setQuery] = useState('')
            const [open, setOpen] = useState(false)
            useEffect(() => {
              setPage(0)
              setQuery('')
              setOpen(false)
            }, [tab])
          }
        `,
        errors: [
          {
            message:
              'Avoid resetting all state in a useEffect when a prop changes. Pass a key prop to the component from the parent instead.',
          },
        ],
      },
      // two setters resetting to null
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component({ categoryId }) {
            const [item, setItem] = useState(null)
            const [error, setError] = useState(null)
            useEffect(() => {
              setItem(null)
              setError(null)
            }, [categoryId])
          }
        `,
        errors: [
          {
            message:
              'Avoid resetting all state in a useEffect when a prop changes. Pass a key prop to the component from the parent instead.',
          },
        ],
      },
      // renamed import — same anti-pattern
      {
        code: `
          import { useEffect as ue, useState } from 'react'
          function Component({ userId }) {
            const [a, setA] = useState(null)
            const [b, setB] = useState([])
            ue(() => {
              setA(null)
              setB([])
            }, [userId])
          }
        `,
        errors: [
          {
            message:
              'Avoid resetting all state in a useEffect when a prop changes. Pass a key prop to the component from the parent instead.',
          },
        ],
      },
      // nested component — inner has anti-pattern
      {
        code: `
          import { useEffect, useState } from 'react'
          function Outer() {
            function Inner({ id }) {
              const [x, setX] = useState(null)
              const [y, setY] = useState(0)
              useEffect(() => {
                setX(null)
                setY(0)
              }, [id])
            }
          }
        `,
        errors: [
          {
            message:
              'Avoid resetting all state in a useEffect when a prop changes. Pass a key prop to the component from the parent instead.',
          },
        ],
      },
    ],
  })
})
