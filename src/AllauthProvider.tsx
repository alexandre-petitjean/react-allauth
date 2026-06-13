import { useMemo, type ReactNode } from 'react'
import { AllauthContext } from './context'
import type { ClientType } from './types'

export interface AllauthProviderProps {
  /** Base URL of the django-allauth server. */
  baseUrl: string
  /** Headless endpoint family to target. Defaults to `browser`. */
  client?: ClientType
  children: ReactNode
}

/**
 * Provides the allauth configuration to every hook in the tree. Wrap your app
 * once, near the root.
 */
export function AllauthProvider({
  baseUrl,
  client = 'browser',
  children,
}: AllauthProviderProps) {
  const value = useMemo(() => ({ baseUrl, client }), [baseUrl, client])

  return (
    <AllauthContext.Provider value={value}>{children}</AllauthContext.Provider>
  )
}
