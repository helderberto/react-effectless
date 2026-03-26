import { useState, useEffect } from 'react'
import type { DebounceOptions } from './types'

export function useDebounce<T>({ value, delay }: DebounceOptions<T>): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return debounced
}
