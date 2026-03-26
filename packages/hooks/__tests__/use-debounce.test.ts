import { renderHook, act } from '@testing-library/react'
import { useDebounce } from '@/use-debounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce({ value: 'hello', delay: 300 }))
    expect(result.current).toBe('hello')
  })

  it('returns updated value after delay elapses', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce({ value, delay: 300 }), {
      initialProps: { value: 'hello' },
    })
    rerender({ value: 'world' })
    expect(result.current).toBe('hello')
    act(() => vi.advanceTimersByTime(300))
    expect(result.current).toBe('world')
  })

  it('does not update before delay elapses', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce({ value, delay: 300 }), {
      initialProps: { value: 'a' },
    })
    rerender({ value: 'b' })
    act(() => vi.advanceTimersByTime(299))
    expect(result.current).toBe('a')
  })

  it('resets timer on rapid changes — only last value emitted', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce({ value, delay: 300 }), {
      initialProps: { value: 'a' },
    })
    rerender({ value: 'b' })
    act(() => vi.advanceTimersByTime(200))
    rerender({ value: 'c' })
    act(() => vi.advanceTimersByTime(200))
    expect(result.current).toBe('a')
    act(() => vi.advanceTimersByTime(100))
    expect(result.current).toBe('c')
  })

  it('clears timeout on unmount — no state update after unmount', () => {
    const { result, rerender, unmount } = renderHook(
      ({ value }) => useDebounce({ value, delay: 300 }),
      { initialProps: { value: 'a' } },
    )
    rerender({ value: 'b' })
    unmount()
    act(() => vi.advanceTimersByTime(300))
    expect(result.current).toBe('a')
  })
})
