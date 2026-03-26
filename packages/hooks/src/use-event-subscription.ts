import { useEffect, useRef } from 'react'
import type { EventSubscriptionOptions } from './types'

export function useEventSubscription({
  target,
  event,
  handler,
  options,
}: EventSubscriptionOptions) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    const listener: EventListener = (e) => handlerRef.current(e)
    target.addEventListener(event, listener, options)
    return () => target.removeEventListener(event, listener)
  }, [target, event])
}
