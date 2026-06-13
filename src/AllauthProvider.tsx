import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AllauthClient } from './client'
import { AllauthContext } from './context'
import { toError } from './errors'
import type { AuthFlowResponse } from './types'

export interface AllauthProviderProps {
  /** Base URL of the django-allauth server. */
  baseUrl: string
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
 * Wrap your app once, near the root. The current session is fetched on mount;
 * a failed check is surfaced as `sessionError` so consumers never hang in
 * `loading`.
 */
export function AllauthProvider({ baseUrl, children }: AllauthProviderProps) {
  const client = useMemo(() => new AllauthClient({ baseUrl }), [baseUrl])
  const [session, setSession] = useState<AuthFlowResponse | null>(null)
  const [sessionError, setSessionError] = useState<Error | null>(null)

  const applyResponse = useCallback((response: AuthFlowResponse) => {
    if (isAuthenticationResponse(response)) setSession(response)
    return response
  }, [])

  useEffect(() => {
    let active = true
    client
      .getSession()
      .then((result) => {
        if (active) applyResponse(result)
      })
      .catch((caught: unknown) => {
        if (active) setSessionError(toError(caught))
      })
    return () => {
      active = false
    }
  }, [client, applyResponse])

  const value = useMemo(
    () => ({ client, session, sessionError, applyResponse }),
    [client, session, sessionError, applyResponse],
  )

  return (
    <AllauthContext.Provider value={value}>{children}</AllauthContext.Provider>
  )
}
