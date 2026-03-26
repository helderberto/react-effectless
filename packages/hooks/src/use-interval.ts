import { useEffect, useRef } from 'react'
import type { IntervalOptions } from './types'

export function useInterval({ callback, delay }: IntervalOptions) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (delay === null) return
    const id = setInterval(() => callbackRef.current(), delay)
    return () => clearInterval(id)
  }, [delay])
}
