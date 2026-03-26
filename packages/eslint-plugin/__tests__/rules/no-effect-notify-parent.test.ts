import rule from '@/rules/no-effect-notify-parent'
import { tester } from '../rule-tester'

describe('no-effect-notify-parent', () => {
  tester.run('no-effect-notify-parent', rule, {
    valid: [
      // fetch with callback — legitimate effect
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component({ onData }) {
            const [data, setData] = useState(null)
            useEffect(() => {
              fetch('/api').then(r => r.json()).then(d => {
                setData(d)
                onData(d)
              })
            }, [onData])
          }
        `,
      },
      // subscription with cleanup — legitimate
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
      // parent callback called in event handler — correct pattern
      {
        code: `
          import { useState } from 'react'
          function Component({ onChange }) {
            const [value, setValue] = useState('')
            function handleChange(v) {
              setValue(v)
              onChange(v)
            }
            return null
          }
        `,
      },
      // custom hook — must not be flagged
      {
        code: `
          import { useEffect, useState } from 'react'
          function useNotify(value, onNotify) {
            useEffect(() => {
              onNotify(value)
            }, [value, onNotify])
          }
        `,
      },
      // only setState, no parent callback — not this pattern
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
      // only parent callback, no setState — not this pattern
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
      // setter + parent callback + external member expression call — has side effect, skip
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component({ value, onChange }) {
            const [local, setLocal] = useState(value)
            useEffect(() => {
              setLocal(value)
              onChange(value)
              analytics.track(value)
            }, [value, onChange])
          }
        `,
      },
    ],
    invalid: [
      // setState then parent callback prop
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component({ value, onChange }) {
            const [local, setLocal] = useState(value)
            useEffect(() => {
              setLocal(value)
              onChange(value)
            }, [value, onChange])
          }
        `,
        errors: [
          {
            message:
              'Avoid calling a parent callback in useEffect after setState. Call the callback alongside setState in the event handler instead.',
          },
        ],
      },
      // parent callback then setState
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component({ count, onCount }) {
            const [n, setN] = useState(count)
            useEffect(() => {
              onCount(count)
              setN(count)
            }, [count, onCount])
          }
        `,
        errors: [
          {
            message:
              'Avoid calling a parent callback in useEffect after setState. Call the callback alongside setState in the event handler instead.',
          },
        ],
      },
      // on* callback naming convention
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component({ selected, onSelect }) {
            const [active, setActive] = useState(selected)
            useEffect(() => {
              setActive(selected)
              onSelect(selected)
            }, [selected, onSelect])
          }
        `,
        errors: [
          {
            message:
              'Avoid calling a parent callback in useEffect after setState. Call the callback alongside setState in the event handler instead.',
          },
        ],
      },
      // renamed import — same anti-pattern
      {
        code: `
          import { useEffect as ue, useState } from 'react'
          function Component({ val, onVal }) {
            const [v, setV] = useState(val)
            ue(() => {
              setV(val)
              onVal(val)
            }, [val, onVal])
          }
        `,
        errors: [
          {
            message:
              'Avoid calling a parent callback in useEffect after setState. Call the callback alongside setState in the event handler instead.',
          },
        ],
      },
      // nested component — inner has anti-pattern
      {
        code: `
          import { useEffect, useState } from 'react'
          function Outer() {
            function Inner({ x, onX }) {
              const [local, setLocal] = useState(x)
              useEffect(() => {
                setLocal(x)
                onX(x)
              }, [x, onX])
            }
          }
        `,
        errors: [
          {
            message:
              'Avoid calling a parent callback in useEffect after setState. Call the callback alongside setState in the event handler instead.',
          },
        ],
      },
    ],
  })
})
