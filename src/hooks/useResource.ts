import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'

export interface Resource<T> {
  /** The fetched value, or `null` until the first load resolves. */
  data: T | null
  /** True while a load is in flight. */
  loading: boolean
  /** The error from the last failed load, or `null`. */
  error: Error | null
  /** Re-run the fetcher (e.g. after a mutation). */
  reload: () => Promise<void>
  /** Seed the value directly, e.g. from a mutation response that returns it. */
  setData: Dispatch<SetStateAction<T | null>>
}

/** Normalize an unknown thrown value into an `Error`. */
function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value))
}

/**
 * Fetch a value on mount (and whenever `fetcher` changes) and expose a manual
 * `reload`. Pass a stable `fetcher` (memoize it with `useCallback`). A failed
 * load surfaces as `error` rather than being swallowed.
 */
export function useResource<T>(fetcher: () => Promise<T>): Resource<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await fetcher())
    } catch (caught) {
      setError(toError(caught))
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
      .catch((caught: unknown) => {
        if (active) setError(toError(caught))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [fetcher])

  return { data, loading, error, reload, setData }
}
