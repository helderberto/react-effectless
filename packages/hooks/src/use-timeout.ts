import { useEffect, useRef } from 'react'
import type { TimeoutOptions } from './types'

export function useTimeout({ callback, delay }: TimeoutOptions) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (delay === null) return
    const id = setTimeout(() => callbackRef.current(), delay)
    return () => clearTimeout(id)
  }, [delay])
}
