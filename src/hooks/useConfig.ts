import { useCallback } from 'react'
import { useAllauthContext } from './useAllauthContext'
import { useResource } from './useResource'
import { ensureOk } from '../errors'
import type { Config } from '../types'

export interface UseConfigResult {
  /** The allauth configuration, or `null` while loading or on error. */
  config: Config | null
  loading: boolean
  error: Error | null
}

/** Fetch the one-shot allauth configuration. */
export function useConfig(): UseConfigResult {
  const { client } = useAllauthContext()
  const fetcher = useCallback(
    () => client.getConfig().then((response) => ensureOk(response).data ?? null),
    [client],
  )
  const { data: config, loading, error } = useResource(fetcher)
  return { config, loading, error }
}
