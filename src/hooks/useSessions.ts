import { useCallback } from 'react'
import { useAllauthContext } from './useAllauthContext'
import { useResource } from './useResource'
import type { UserSession } from '../types'

export interface UseSessionsResult {
  /** Active sessions for the authenticated user. */
  sessions: UserSession[]
  revoke(session: UserSession): Promise<void>
}

/** List and revoke the user's active sessions. */
export function useSessions(): UseSessionsResult {
  const { client } = useAllauthContext()
  const fetcher = useCallback(
    () => client.getSessions().then((response) => response.data ?? []),
    [client],
  )
  const { data, reload } = useResource(fetcher)

  const revoke = useCallback(
    async (session: UserSession) => {
      await client.endSessions([session.id])
      await reload()
    },
    [client, reload],
  )

  return { sessions: data ?? [], revoke }
}
