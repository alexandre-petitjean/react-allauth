import type { Config } from '../types'

export interface UseConfigResult {
  /** The allauth configuration, or `null` while loading. */
  config: Config | null
  loading: boolean
}

/** Fetch the one-shot allauth configuration. */
export function useConfig(): UseConfigResult {
  throw new Error('not implemented')
}
