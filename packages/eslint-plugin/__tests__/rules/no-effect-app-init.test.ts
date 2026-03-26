import rule from '@/rules/no-effect-app-init'
import { tester } from '../rule-tester'

describe('no-effect-app-init', () => {
  tester.run('no-effect-app-init', rule, {
    valid: [
      // has cleanup — legitimate mount effect
      {
        code: `
          import { useEffect } from 'react'
          function App() {
            useEffect(() => {
              const handler = () => {}
              window.addEventListener('resize', handler)
              return () => window.removeEventListener('resize', handler)
            }, [])
          }
        `,
      },
      // DOM ref access — legitimate mount effect
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
      // non-empty deps — not this pattern
      {
        code: `
          import { useEffect } from 'react'
          function Component({ id }) {
            useEffect(() => {
              analytics.track(id)
            }, [id])
          }
        `,
      },
      // state setter in effect — different anti-pattern
      {
        code: `
          import { useEffect, useState } from 'react'
          function Component() {
            const [data, setData] = useState(null)
            useEffect(() => {
              setData(computeDefault())
            }, [])
          }
        `,
      },
      // custom hook — must not be flagged
      {
        code: `
          import { useEffect } from 'react'
          function useAppInit() {
            useEffect(() => {
              analytics.init()
            }, [])
          }
        `,
      },
      // renamed import — not app-init pattern (has non-empty deps)
      {
        code: `
          import { useEffect as ue } from 'react'
          function App({ config }) {
            ue(() => {
              analytics.init(config)
            }, [config])
          }
        `,
      },
      // empty body — nothing to flag
      {
        code: `
          import { useEffect } from 'react'
          function App() {
            useEffect(() => {}, [])
          }
        `,
      },
    ],
    invalid: [
      // single initialization call
      {
        code: `
          import { useEffect } from 'react'
          function App() {
            useEffect(() => {
              analytics.init()
            }, [])
          }
        `,
        errors: [
          {
            message:
              'Avoid using useEffect with empty deps for one-time initialization. Use module-level code or a didInit guard instead.',
          },
        ],
      },
      // multiple initialization calls
      {
        code: `
          import { useEffect } from 'react'
          function App() {
            useEffect(() => {
              analytics.init()
              featureFlags.load()
            }, [])
          }
        `,
        errors: [
          {
            message:
              'Avoid using useEffect with empty deps for one-time initialization. Use module-level code or a didInit guard instead.',
          },
        ],
      },
      // standalone function call (not a method)
      {
        code: `
          import { useEffect } from 'react'
          function App() {
            useEffect(() => {
              initializeApp()
            }, [])
          }
        `,
        errors: [
          {
            message:
              'Avoid using useEffect with empty deps for one-time initialization. Use module-level code or a didInit guard instead.',
          },
        ],
      },
      // renamed import — same anti-pattern
      {
        code: `
          import { useEffect as ue } from 'react'
          function App() {
            ue(() => {
              analytics.init()
            }, [])
          }
        `,
        errors: [
          {
            message:
              'Avoid using useEffect with empty deps for one-time initialization. Use module-level code or a didInit guard instead.',
          },
        ],
      },
      // nested component — inner has anti-pattern
      {
        code: `
          import { useEffect } from 'react'
          function Outer() {
            function Inner() {
              useEffect(() => {
                thirdParty.setup()
              }, [])
            }
          }
        `,
        errors: [
          {
            message:
              'Avoid using useEffect with empty deps for one-time initialization. Use module-level code or a didInit guard instead.',
          },
        ],
      },
      // logging call
      {
        code: `
          import { useEffect } from 'react'
          function App() {
            useEffect(() => {
              logger.init({ level: 'warn' })
            }, [])
          }
        `,
        errors: [
          {
            message:
              'Avoid using useEffect with empty deps for one-time initialization. Use module-level code or a didInit guard instead.',
          },
        ],
      },
    ],
  })
})
