import rule from '@/rules/no-effect-event-handler'
import { tester } from '../rule-tester'

describe('no-effect-event-handler', () => {
  tester.run('no-effect-event-handler', rule, {
    valid: [
      // fetch on prop change — dep is a prop, not set by a handler
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
      // subscription with cleanup — has return, not a handler pattern
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
      // custom hook — must not be flagged
      {
        code: `
          import { useEffect, useState } from 'react'
          function useTracker(value) {
            const [count, setCount] = useState(0)
            function handleClick() {
              setCount(c => c + 1)
            }
            useEffect(() => {
              analytics.track(count)
            }, [count])
          }
        `,
      },
      // dep set by handler but effect only does setState — not this pattern
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component() {
            const [count, setCount] = useState(0)
            const [doubled, setDoubled] = useState(0)
            function handleClick() {
              setCount(c => c + 1)
            }
            useEffect(() => {
              setDoubled(count * 2)
            }, [count])
          }
        `,
      },
      // dep set by handler but effect has IfStatement — that is no-effect-post-action
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component() {
            const [submitted, setSubmitted] = useState(false)
            function handleSubmit() {
              setSubmitted(true)
            }
            useEffect(() => {
              if (submitted) api.save()
            }, [submitted])
          }
        `,
      },
      // dep is NOT set by any handle* function — external/prop-driven
      {
        code: `
          import { useEffect } from 'react'
          function Component({ theme }) {
            useEffect(() => {
              document.body.className = theme
            }, [theme])
          }
        `,
      },
      // handler calls member expression only — extractSetterTargets skips non-Identifier callee
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component() {
            const [count, setCount] = useState(0)
            function handleSave() {
              api.save()
            }
            useEffect(() => {
              analytics.track(count)
            }, [count])
          }
        `,
      },
      // handler calls non-setter identifier — no target extracted, dep not in handlerVars
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component() {
            const [value, setValue] = useState('')
            function handleClick() {
              go()
            }
            useEffect(() => {
              analytics.track(value)
            }, [value])
          }
        `,
      },
      // effect body has CallExpression callee — isUnconditionalExternalCallStmt returns false
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component() {
            const [value, setValue] = useState('')
            function handleChange(v) {
              setValue(v)
            }
            useEffect(() => {
              getTracker()(value)
            }, [value])
          }
        `,
      },
    ],
    invalid: [
      // handleClick sets count, effect runs analytics.track unconditionally
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component() {
            const [count, setCount] = useState(0)
            function handleClick() {
              setCount(c => c + 1)
            }
            useEffect(() => {
              analytics.track(count)
            }, [count])
          }
        `,
        errors: [
          {
            message:
              'This effect fires because of state set in an event handler. Move the logic into the handler directly.',
          },
        ],
      },
      // handleSubmit sets submitted, effect runs logger.log unconditionally
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component() {
            const [submitted, setSubmitted] = useState(false)
            function handleSubmit() {
              setSubmitted(true)
            }
            useEffect(() => {
              logger.log(submitted)
            }, [submitted])
          }
        `,
        errors: [
          {
            message:
              'This effect fires because of state set in an event handler. Move the logic into the handler directly.',
          },
        ],
      },
      // handleChange sets value, effect runs external notify call
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component() {
            const [value, setValue] = useState('')
            function handleChange(v) {
              setValue(v)
            }
            useEffect(() => {
              notifyChange(value)
            }, [value])
          }
        `,
        errors: [
          {
            message:
              'This effect fires because of state set in an event handler. Move the logic into the handler directly.',
          },
        ],
      },
      // renamed import — same anti-pattern
      {
        code: `
          import { useEffect as ue, useState } from 'react'
          function Component() {
            const [step, setStep] = useState(0)
            function handleNext() {
              setStep(s => s + 1)
            }
            ue(() => {
              telemetry.step(step)
            }, [step])
          }
        `,
        errors: [
          {
            message:
              'This effect fires because of state set in an event handler. Move the logic into the handler directly.',
          },
        ],
      },
      // nested component — inner has the anti-pattern
      {
        code: `
          import { useEffect, useState } from 'react'
          function Outer() {
            function Inner() {
              const [page, setPage] = useState(0)
              function handleNext() {
                setPage(p => p + 1)
              }
              useEffect(() => {
                router.push(page)
              }, [page])
            }
          }
        `,
        errors: [
          {
            message:
              'This effect fires because of state set in an event handler. Move the logic into the handler directly.',
          },
        ],
      },
    ],
  })
})
