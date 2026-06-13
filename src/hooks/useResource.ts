import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { toError } from '../errors'

export interface Resource<T> {
  /** The fetched value, or `null` until the first load resolves. */
  data: T | null
  /** True while a load is in flight. */
  loading: boolean
  /** The error from the last failed load, or `null`. */
  error: Error | null
  /** Re-run the fetcher (e.g. after a mutation or an auth change). */
  reload: () => Promise<void>
  /** Seed the value directly, e.g. from a mutation response that returns it. */
  setData: Dispatch<SetStateAction<T | null>>
}

/**
 * Fetch a value on mount (and whenever `fetcher` changes) and expose a manual
 * `reload`. Pass a stable `fetcher` (memoize it with `useCallback`). A failed
 * load surfaces as `error`.
 *
 * A monotonic request id, shared by the mount load and every `reload`, ensures
 * only the most recent request can update state: a stale reload or a load left
 * over from a previous `fetcher` never overwrites newer state. (The fetch chain
 * is inlined rather than extracted to keep React's effect setState rules happy.)
 */
export function useResource<T>(fetcher: () => Promise<T>): Resource<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const requestId = useRef(0)

  const reload = useCallback(() => {
    const id = ++requestId.current
    setLoading(true)
    setError(null)
    return fetcher()
      .then((result) => {
        if (id === requestId.current) setData(result)
      })
      .catch((caught: unknown) => {
        if (id === requestId.current) setError(toError(caught))
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false)
      })
  }, [fetcher])

  useEffect(() => {
    // `loading` starts true; the chain resolves it. Bumping the id invalidates
    // any in-flight reload when `fetcher` changes.
    const id = ++requestId.current
    fetcher()
      .then((result) => {
        if (id === requestId.current) setData(result)
      })
      .catch((caught: unknown) => {
        if (id === requestId.current) setError(toError(caught))
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false)
      })
  }, [fetcher])

  return { data, loading, error, reload, setData }
}
