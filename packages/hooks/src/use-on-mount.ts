import { useEffect } from 'react'
import type { MountCallback } from './types'

export function useOnMount(cb: MountCallback) {
  useEffect(cb, [])
}
