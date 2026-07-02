import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useResource } from './useResource'

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason: Error) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useResource', () => {
  // The hook's contract requires a stable fetcher (useCallback in real usage):
  // tests define each fetcher once and close over mutable state instead of
  // recreating the function on every render.
  it('loads on mount and exposes the data', async () => {
    const fetcher = () => Promise.resolve('v1')
    const { result } = renderHook(() => useResource(fetcher))

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toBe('v1')
    expect(result.current.error).toBeNull()
  })

  it('surfaces a failed load as error and recovers on reload', async () => {
    let fail = true
    const fetcher = () =>
      fail ? Promise.reject(new Error('boom')) : Promise.resolve('ok')
    const { result } = renderHook(() => useResource(fetcher))

    await waitFor(() => expect(result.current.error?.message).toBe('boom'))
    expect(result.current.data).toBeNull()

    fail = false
    await act(() => result.current.reload())
    expect(result.current.error).toBeNull()
    expect(result.current.data).toBe('ok')
  })

  it('ignores a stale reload resolving after a newer one', async () => {
    const calls: Deferred<string>[] = []
    const fetcher = () => {
      const d = deferred<string>()
      calls.push(d)
      return d.promise
    }
    const { result } = renderHook(() => useResource(fetcher))

    // Mount load resolves first so the hook settles.
    calls[0]!.resolve('mount')
    await waitFor(() => expect(result.current.data).toBe('mount'))

    // Two overlapping reloads: the older resolves LAST and must be ignored.
    let first!: Promise<void>
    let second!: Promise<void>
    act(() => {
      first = result.current.reload()
      second = result.current.reload()
    })
    calls[2]!.resolve('newer')
    await act(() => second)
    calls[1]!.resolve('older')
    await act(() => first)

    expect(result.current.data).toBe('newer')
  })

  it('ignores an in-flight load after the fetcher changes', async () => {
    const calls: Deferred<string>[] = []
    const fetcherA = () => {
      const d = deferred<string>()
      calls.push(d)
      return d.promise
    }
    const fetcherB = () => Promise.resolve('from-b')

    const { result, rerender } = renderHook(
      ({ fetcher }) => useResource(fetcher),
      { initialProps: { fetcher: fetcherA } },
    )

    rerender({ fetcher: fetcherB })
    await waitFor(() => expect(result.current.data).toBe('from-b'))

    // The abandoned fetcher-A load resolves late and must not win.
    calls[0]!.resolve('from-a')
    await act(async () => {})
    expect(result.current.data).toBe('from-b')
  })
})
