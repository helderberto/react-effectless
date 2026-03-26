import { useEffect } from 'react'

export function useOnMount(cb: () => void | (() => void)): void {
  useEffect(cb, [])
}
