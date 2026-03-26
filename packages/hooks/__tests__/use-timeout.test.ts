import { renderHook, act } from '@testing-library/react'
import { useTimeout } from '@/use-timeout'

describe('useTimeout', () => {
  it('calls callback once after delay', () => {
    const cb = vi.fn()
    renderHook(() => useTimeout({ callback: cb, delay: 300 }))
    act(() => vi.advanceTimersByTime(300))
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('does not call callback before delay elapses', () => {
    const cb = vi.fn()
    renderHook(() => useTimeout({ callback: cb, delay: 300 }))
    act(() => vi.advanceTimersByTime(299))
    expect(cb).not.toHaveBeenCalled()
  })

  it('does not call callback when delay is null', () => {
    const cb = vi.fn()
    renderHook(() => useTimeout({ callback: cb, delay: null }))
    act(() => vi.advanceTimersByTime(1000))
    expect(cb).not.toHaveBeenCalled()
  })

  it('uses latest callback without resetting the timeout', () => {
    const first = vi.fn()
    const second = vi.fn()
    let callback = first
    const { rerender } = renderHook(() => useTimeout({ callback, delay: 300 }))
    callback = second
    rerender()
    act(() => vi.advanceTimersByTime(300))
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('clears timeout on unmount — callback never fires', () => {
    const cb = vi.fn()
    const { unmount } = renderHook(() => useTimeout({ callback: cb, delay: 300 }))
    unmount()
    act(() => vi.advanceTimersByTime(300))
    expect(cb).not.toHaveBeenCalled()
  })

  it('resets timeout when delay changes', () => {
    const cb = vi.fn()
    const { rerender } = renderHook(({ delay }) => useTimeout({ callback: cb, delay }), {
      initialProps: { delay: 300 as number | null },
    })
    act(() => vi.advanceTimersByTime(200))
    rerender({ delay: 400 })
    act(() => vi.advanceTimersByTime(200))
    expect(cb).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(200))
    expect(cb).toHaveBeenCalledTimes(1)
  })
})
