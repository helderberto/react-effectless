import { renderHook } from '@testing-library/react'
import { useEventSubscription } from '@/use-event-subscription'

function makeTarget() {
  const listeners = new Map<string, Set<EventListener>>()
  const target = {
    addEventListener: vi.fn((event: string, handler: EventListener) => {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event)!.add(handler)
    }),
    removeEventListener: vi.fn((event: string, handler: EventListener) => {
      listeners.get(event)?.delete(handler)
    }),
    dispatch(event: string) {
      listeners.get(event)?.forEach((h) => h(new Event(event)))
    },
  }
  return target as unknown as typeof target & EventTarget
}

describe('useEventSubscription', () => {
  it('attaches listener on mount', () => {
    const target = makeTarget()
    const handler = vi.fn()
    renderHook(() => useEventSubscription({ target, event: 'click', handler }))
    expect(target.addEventListener).toHaveBeenCalledTimes(1)
    expect(target.addEventListener).toHaveBeenCalledWith('click', expect.any(Function), undefined)
  })

  it('removes listener on unmount', () => {
    const target = makeTarget()
    const handler = vi.fn()
    const { unmount } = renderHook(() => useEventSubscription({ target, event: 'click', handler }))
    unmount()
    expect(target.removeEventListener).toHaveBeenCalledTimes(1)
  })

  it('calls handler when event fires', () => {
    const target = makeTarget()
    const handler = vi.fn()
    renderHook(() => useEventSubscription({ target, event: 'click', handler }))
    target.dispatch('click')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('does not re-attach when handler reference changes between renders', () => {
    const target = makeTarget()
    const { rerender } = renderHook(() =>
      useEventSubscription({ target, event: 'click', handler: vi.fn() }),
    )
    rerender()
    rerender()
    expect(target.addEventListener).toHaveBeenCalledTimes(1)
  })

  it('uses latest handler without re-subscribing', () => {
    const target = makeTarget()
    const first = vi.fn()
    const second = vi.fn()
    let handler = first
    const { rerender } = renderHook(() => useEventSubscription({ target, event: 'click', handler }))
    handler = second
    rerender()
    target.dispatch('click')
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
    expect(target.addEventListener).toHaveBeenCalledTimes(1)
  })

  it('forwards options to addEventListener', () => {
    const target = makeTarget()
    const handler = vi.fn()
    renderHook(() =>
      useEventSubscription({ target, event: 'scroll', handler, options: { passive: true } }),
    )
    expect(target.addEventListener).toHaveBeenCalledWith('scroll', expect.any(Function), {
      passive: true,
    })
  })
})
