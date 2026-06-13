import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AllauthClient } from './client'
import { AllauthContext } from './context'
import type { AuthFlowResponse, ClientType } from './types'

export interface AllauthProviderProps {
  /** Base URL of the django-allauth server. */
  baseUrl: string
  /** Headless endpoint family to target. Defaults to `browser`. */
  client?: ClientType
  children: ReactNode
}

/**
 * Authentication responses (200/401/410) carry session state and should refresh
 * it; validation errors (e.g. 400) must leave the current session untouched.
 */
function isAuthenticationResponse(response: AuthFlowResponse): boolean {
  return [200, 401, 410].includes(response.status)
}

/**
 * Provides the allauth client and session state to every hook in the tree.
 * Wrap your app once, near the root. The current session is fetched on mount.
 */
export function AllauthProvider({
  baseUrl,
  client = 'browser',
  children,
}: AllauthProviderProps) {
  const allauthClient = useMemo(
    () => new AllauthClient({ baseUrl, client }),
    [baseUrl, client],
  )
  const [session, setSession] = useState<AuthFlowResponse | null>(null)

  const applyResponse = useCallback((response: AuthFlowResponse) => {
    if (isAuthenticationResponse(response)) setSession(response)
    return response
  }, [])

  useEffect(() => {
    let active = true
    void allauthClient.getSession().then((result) => {
      if (active) applyResponse(result)
    })
    return () => {
      active = false
    }
  }, [allauthClient, applyResponse])

  const value = useMemo(
    () => ({ client: allauthClient, session, applyResponse }),
    [allauthClient, session, applyResponse],
  )

  return (
    <AllauthContext.Provider value={value}>{children}</AllauthContext.Provider>
  )
}
