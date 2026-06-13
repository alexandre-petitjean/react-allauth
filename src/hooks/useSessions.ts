import { useCallback } from 'react'
import { useAllauthContext } from './useAllauthContext'
import { useResource } from './useResource'
import { ensureOk } from '../errors'
import type { UserSession } from '../types'

export interface UseSessionsResult {
  /** Active sessions for the authenticated user. */
  sessions: UserSession[]
  loading: boolean
  error: Error | null
  /** Refetch the session list. */
  reload(): Promise<void>
  revoke(session: UserSession): Promise<void>
}

/** List and revoke the user's active sessions. */
export function useSessions(): UseSessionsResult {
  const { client, session } = useAllauthContext()
  const isAuthenticated = session?.meta?.is_authenticated ?? false
  const fetcher = useCallback(
    () =>
      isAuthenticated
        ? client.getSessions().then((response) => ensureOk(response).data ?? [])
        : Promise.resolve<UserSession[]>([]),
    [client, isAuthenticated],
  )
  const { data, loading, error, reload, setData } = useResource(fetcher)

  const revoke = useCallback(
    async (target: UserSession) => {
      setData(ensureOk(await client.endSessions([target.id])).data ?? [])
    },
    [client, setData],
  )

  return { sessions: data ?? [], loading, error, reload, revoke }
}
