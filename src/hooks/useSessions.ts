import type { UserSession } from '../types'

export interface UseSessionsResult {
  /** Active sessions for the authenticated user. */
  sessions: UserSession[]
  revoke(session: UserSession): Promise<void>
}

/** List and revoke the user's active sessions. */
export function useSessions(): UseSessionsResult {
  throw new Error('not implemented')
}
