export type MountCallback = () => void | (() => void)

export interface EventSubscriptionOptions {
  target: EventTarget
  event: string
  handler: EventListener
  options?: AddEventListenerOptions
}

export interface DebounceOptions<T> {
  value: T
  delay: number
}

export interface IntervalOptions {
  callback: () => void
  delay: number | null
}

export interface TimeoutOptions {
  callback: () => void
  delay: number | null
}
