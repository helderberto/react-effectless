import { renderHook, act } from '@testing-library/react'
import { useInterval } from '@/use-interval'

describe('useInterval', () => {
  it('calls callback repeatedly at given interval', () => {
    const cb = vi.fn()
    renderHook(() => useInterval({ callback: cb, delay: 100 }))
    act(() => vi.advanceTimersByTime(350))
    expect(cb).toHaveBeenCalledTimes(3)
  })

  it('does not call callback when delay is null', () => {
    const cb = vi.fn()
    renderHook(() => useInterval({ callback: cb, delay: null }))
    act(() => vi.advanceTimersByTime(1000))
    expect(cb).not.toHaveBeenCalled()
  })

  it('uses latest callback without restarting interval', () => {
    const first = vi.fn()
    const second = vi.fn()
    let callback = first
    const { rerender } = renderHook(() => useInterval({ callback, delay: 100 }))
    callback = second
    rerender()
    act(() => vi.advanceTimersByTime(100))
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('clears interval on unmount', () => {
    const cb = vi.fn()
    const { unmount } = renderHook(() => useInterval({ callback: cb, delay: 100 }))
    unmount()
    act(() => vi.advanceTimersByTime(300))
    expect(cb).not.toHaveBeenCalled()
  })

  it('pauses when delay changes to null', () => {
    const cb = vi.fn()
    const { rerender } = renderHook(({ delay }) => useInterval({ callback: cb, delay }), {
      initialProps: { delay: 100 as number | null },
    })
    act(() => vi.advanceTimersByTime(100))
    expect(cb).toHaveBeenCalledTimes(1)
    rerender({ delay: null })
    act(() => vi.advanceTimersByTime(500))
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('resumes when delay changes from null', () => {
    const cb = vi.fn()
    const { rerender } = renderHook(({ delay }) => useInterval({ callback: cb, delay }), {
      initialProps: { delay: null as number | null },
    })
    act(() => vi.advanceTimersByTime(500))
    expect(cb).not.toHaveBeenCalled()
    rerender({ delay: 100 })
    act(() => vi.advanceTimersByTime(200))
    expect(cb).toHaveBeenCalledTimes(2)
  })
})
