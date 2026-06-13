import { useCallback, useEffect, useState } from 'react'

export interface Resource<T> {
  /** The fetched value, or `null` until the first load resolves. */
  data: T | null
  /** True while a load is in flight. */
  loading: boolean
  /** Re-run the fetcher (e.g. after a mutation). */
  reload: () => Promise<void>
}

/**
 * Fetch a value on mount (and whenever `fetcher` changes) and expose a manual
 * `reload`. Pass a stable `fetcher` (memoize it with `useCallback`).
 */
export function useResource<T>(fetcher: () => Promise<T>): Resource<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setData(await fetcher())
    } finally {
      setLoading(false)
    }
  }, [fetcher])

  useEffect(() => {
    let active = true
    // `loading` starts true; the manual `reload` sets it for subsequent loads.
    fetcher()
      .then((result) => {
        if (active) setData(result)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [fetcher])

  return { data, loading, reload }
}
