import { useCallback } from 'react'
import { useAllauthContext } from './useAllauthContext'
import { useResource } from './useResource'
import type { Config } from '../types'

export interface UseConfigResult {
  /** The allauth configuration, or `null` while loading. */
  config: Config | null
  loading: boolean
}

/** Fetch the one-shot allauth configuration. */
export function useConfig(): UseConfigResult {
  const { client } = useAllauthContext()
  const fetcher = useCallback(
    () => client.getConfig().then((response) => response.data ?? null),
    [client],
  )
  const { data: config, loading } = useResource(fetcher)
  return { config, loading }
}
