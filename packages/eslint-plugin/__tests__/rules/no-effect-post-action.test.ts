import rule from '@/rules/no-effect-post-action'
import { tester } from '../rule-tester'

describe('no-effect-post-action', () => {
  tester.run('no-effect-post-action', rule, {
    valid: [
      // fetch on id change — legitimate data fetching effect
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
      // subscription — legitimate
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
      // API call in event handler — correct pattern
      {
        code: `
          import { useState } from 'react'
          function Component() {
            const [saved, setSaved] = useState(false)
            function handleSave() {
              setSaved(true)
              api.save()
            }
            return null
          }
        `,
      },
      // flag used for conditional render, no API call in effect — not this pattern
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component() {
            const [loading, setLoading] = useState(false)
            useEffect(() => {
              setLoading(false)
            }, [])
          }
        `,
      },
      // custom hook — must not be flagged
      {
        code: `
          import { useEffect, useState } from 'react'
          function usePostAction(submitted) {
            useEffect(() => {
              if (submitted) api.save()
            }, [submitted])
          }
        `,
      },
      // renamed import — no API call in effect
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
      // if consequent is an assignment, not a call — isExternalCall returns false
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component() {
            const [submitted, setSubmitted] = useState(false)
            let result
            useEffect(() => {
              if (submitted) result = submitted
            }, [submitted])
          }
        `,
      },
      // if consequent has higher-order call (callee is CallExpression) — not flagged
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component() {
            const [done, setDone] = useState(false)
            useEffect(() => {
              if (done) getHandler()()
            }, [done])
          }
        `,
      },
    ],
    invalid: [
      // boolean flag triggers API call in effect
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component() {
            const [submitted, setSubmitted] = useState(false)
            useEffect(() => {
              if (submitted) api.save()
            }, [submitted])
          }
        `,
        errors: [
          {
            message:
              'Avoid using a state flag to trigger a side effect in useEffect. Move the API call into the event handler directly.',
          },
        ],
      },
      // flag with full block body
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component() {
            const [saved, setSaved] = useState(false)
            useEffect(() => {
              if (saved) {
                api.save(data)
              }
            }, [saved])
          }
        `,
        errors: [
          {
            message:
              'Avoid using a state flag to trigger a side effect in useEffect. Move the API call into the event handler directly.',
          },
        ],
      },
      // different boolean flag name
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component() {
            const [isLoading, setIsLoading] = useState(false)
            useEffect(() => {
              if (isLoading) fetchData()
            }, [isLoading])
          }
        `,
        errors: [
          {
            message:
              'Avoid using a state flag to trigger a side effect in useEffect. Move the API call into the event handler directly.',
          },
        ],
      },
      // renamed import — same anti-pattern
      {
        code: `
          import { useEffect as ue, useState } from 'react'
          function Component() {
            const [triggered, setTriggered] = useState(false)
            ue(() => {
              if (triggered) sendEvent()
            }, [triggered])
          }
        `,
        errors: [
          {
            message:
              'Avoid using a state flag to trigger a side effect in useEffect. Move the API call into the event handler directly.',
          },
        ],
      },
      // nested component — inner has anti-pattern
      {
        code: `
          import { useEffect, useState } from 'react'
          function Outer() {
            function Inner() {
              const [done, setDone] = useState(false)
              useEffect(() => {
                if (done) analytics.track('done')
              }, [done])
            }
          }
        `,
        errors: [
          {
            message:
              'Avoid using a state flag to trigger a side effect in useEffect. Move the API call into the event handler directly.',
          },
        ],
      },
    ],
  })
})
