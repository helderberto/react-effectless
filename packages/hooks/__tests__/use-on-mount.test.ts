import { renderHook } from '@testing-library/react'
import { useOnMount } from '@/use-on-mount'

describe('useOnMount', () => {
  it('runs callback once on mount', () => {
    const cb = vi.fn()
    renderHook(() => useOnMount(cb))
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('does not re-run on re-render', () => {
    const cb = vi.fn()
    const { rerender } = renderHook(() => useOnMount(cb))
    rerender()
    rerender()
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('runs cleanup function on unmount', () => {
    const cleanup = vi.fn()
    const { unmount } = renderHook(() => useOnMount(() => cleanup))
    expect(cleanup).not.toHaveBeenCalled()
    unmount()
    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('does not require a cleanup return', () => {
    const cb = vi.fn(() => undefined)
    const { unmount } = renderHook(() => useOnMount(cb))
    expect(() => unmount()).not.toThrow()
  })
})
