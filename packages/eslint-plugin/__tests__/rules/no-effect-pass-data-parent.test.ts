import rule from '@/rules/no-effect-pass-data-parent'
import { tester } from '../rule-tester'

describe('no-effect-pass-data-parent', () => {
  tester.run('no-effect-pass-data-parent', rule, {
    valid: [
      // child keeps local copy — sets local state AND calls parent
      {
        code: `
          import { useEffect, useState } from 'react'
          function Child({ onData }) {
            const [data, setData] = useState(null)
            useEffect(() => {
              fetch('/api/data').then(r => r.json()).then(d => {
                setData(d)
                onData(d)
              })
            }, [onData])
          }
        `,
      },
      // subscription — no fetch pattern, has cleanup
      {
        code: `
          import { useEffect } from 'react'
          function Component({ store, onChange }) {
            useEffect(() => {
              const sub = store.subscribe(onChange)
              return () => sub.unsubscribe()
            }, [store, onChange])
          }
        `,
      },
      // custom hook — must not be flagged
      {
        code: `
          import { useEffect } from 'react'
          function useFetchParent(onData) {
            useEffect(() => {
              fetch('/api/data').then(r => r.json()).then(onData)
            }, [onData])
          }
        `,
      },
      // parent callback called with locally computed value, no fetch
      {
        code: `
          import { useEffect } from 'react'
          function Component({ value, onValue }) {
            useEffect(() => {
              onValue(value)
            }, [value, onValue])
          }
        `,
      },
      // fetch result set into local state only — does not pass to parent
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
    ],
    invalid: [
      // classic: fetch → json → pass directly to parent
      {
        code: `
          import { useEffect } from 'react'
          function Child({ onData }) {
            useEffect(() => {
              fetch('/api/data').then(r => r.json()).then(onData)
            }, [onData])
          }
        `,
        errors: [
          {
            message:
              'A child component is fetching data and passing it to the parent via a callback prop. Lift the data fetching to the parent instead.',
          },
        ],
      },
      // fetch → pass response directly (no json step)
      {
        code: `
          import { useEffect } from 'react'
          function Child({ onFetch }) {
            useEffect(() => {
              fetch('/api/data').then(onFetch)
            }, [onFetch])
          }
        `,
        errors: [
          {
            message:
              'A child component is fetching data and passing it to the parent via a callback prop. Lift the data fetching to the parent instead.',
          },
        ],
      },
      // API method call instead of fetch
      {
        code: `
          import { useEffect } from 'react'
          function Child({ id, onSuccess }) {
            useEffect(() => {
              api.get(id).then(onSuccess)
            }, [id, onSuccess])
          }
        `,
        errors: [
          {
            message:
              'A child component is fetching data and passing it to the parent via a callback prop. Lift the data fetching to the parent instead.',
          },
        ],
      },
      // renamed import — same anti-pattern
      {
        code: `
          import { useEffect as ue } from 'react'
          function Child({ onData }) {
            ue(() => {
              fetch('/api/data').then(r => r.json()).then(onData)
            }, [onData])
          }
        `,
        errors: [
          {
            message:
              'A child component is fetching data and passing it to the parent via a callback prop. Lift the data fetching to the parent instead.',
          },
        ],
      },
      // nested component — inner has the anti-pattern
      {
        code: `
          import { useEffect } from 'react'
          function Outer() {
            function Child({ onResult }) {
              useEffect(() => {
                service.load().then(onResult)
              }, [onResult])
            }
          }
        `,
        errors: [
          {
            message:
              'A child component is fetching data and passing it to the parent via a callback prop. Lift the data fetching to the parent instead.',
          },
        ],
      },
      // multi-step .then chain — recursive hasThenWithOnCallback path
      {
        code: `
          import { useEffect } from 'react'
          function Child({ onData }) {
            useEffect(() => {
              fetch('/api/data')
                .then(r => r.json())
                .then(onData)
            }, [onData])
          }
        `,
        errors: [
          {
            message:
              'A child component is fetching data and passing it to the parent via a callback prop. Lift the data fetching to the parent instead.',
          },
        ],
      },
    ],
  })
})
