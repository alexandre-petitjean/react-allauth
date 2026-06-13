import { useCallback } from 'react'
import { useAllauthContext } from './useAllauthContext'
import { useResource } from './useResource'
import { ensureOk } from '../errors'
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
  const { data, setData } = useResource(fetcher)

  const revoke = useCallback(
    async (session: UserSession) => {
      setData(ensureOk(await client.endSessions([session.id])).data ?? [])
    },
    [client, setData],
  )

  return { sessions: data ?? [], revoke }
}
