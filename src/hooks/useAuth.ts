import { useCallback, useMemo } from 'react'
import { useAllauthContext } from './useAllauthContext'
import { ensureOk } from '../errors'
import type {
  AuthFlowResponse,
  AuthStatus,
  FlowState,
  LoginCredentials,
  ReauthenticateData,
  SignupData,
  User,
} from '../types'

export interface UseAuthResult {
  /** High-level authentication status. */
  status: AuthStatus
  /** The authenticated user, or `null`. */
  user: User | null
  /** The pending authentication flow, or `null` when none is required. */
  flow: FlowState | null
  /** Error from the initial session check, or `null`. */
  error: Error | null
  login(credentials: LoginCredentials): Promise<AuthFlowResponse>
  signup(data: SignupData): Promise<AuthFlowResponse>
  logout(): Promise<AuthFlowResponse>
  reauthenticate(data: ReauthenticateData): Promise<AuthFlowResponse>
  /** Email a one-time login code; opens the `login_by_code` flow. */
  requestLoginCode(email: string): Promise<AuthFlowResponse>
  /** Complete the `login_by_code` flow with the emailed code. */
  confirmLoginCode(code: string): Promise<AuthFlowResponse>
  /** Resend the pending login code. Throws when none is pending or rate limited. */
  resendLoginCode(): Promise<void>
}

/** Derive the high-level status from the raw session envelope. */
function deriveStatus(
  session: AuthFlowResponse | null,
  error: Error | null,
): AuthStatus {
  // A failed initial check resolves to unauthenticated (with `error` set), never
  // a permanent loading state.
  if (!session) return error ? 'unauthenticated' : 'loading'
  if (!session.meta?.is_authenticated) return 'unauthenticated'
  return session.status === 200 ? 'authenticated' : 'reauthentication_required'
}

/** Resolve the pending-flow view from the advertised flows. */
function deriveFlow(session: AuthFlowResponse | null): FlowState | null {
  const pending = session?.data?.flows?.filter((flow) => flow.is_pending) ?? []
  return pending.length > 0 ? { current: pending[0], pending } : null
}

/** Core authentication: session state plus login/signup/logout/reauth. */
export function useAuth(): UseAuthResult {
  const { client, session, sessionError, applyResponse } = useAllauthContext()

  const login = useCallback(
    async (credentials: LoginCredentials) =>
      applyResponse(await client.login(credentials)),
    [client, applyResponse],
  )

  const signup = useCallback(
    async (data: SignupData) => applyResponse(await client.signup(data)),
    [client, applyResponse],
  )

  const logout = useCallback(
    async () => applyResponse(await client.logout()),
    [client, applyResponse],
  )

  const reauthenticate = useCallback(
    async (data: ReauthenticateData) =>
      applyResponse(await client.reauthenticate(data)),
    [client, applyResponse],
  )

  const requestLoginCode = useCallback(
    async (email: string) => applyResponse(await client.requestLoginCode(email)),
    [client, applyResponse],
  )

  const confirmLoginCode = useCallback(
    async (code: string) => applyResponse(await client.confirmLoginCode(code)),
    [client, applyResponse],
  )

  // A resend reply is a bare 200 without session payload: applying it would
  // clobber the pending-flow state, so this is a mutation, not a flow method.
  const resendLoginCode = useCallback(async () => {
    ensureOk(await client.resendLoginCode())
  }, [client])

  const flow = useMemo(() => deriveFlow(session), [session])

  return {
    status: deriveStatus(session, sessionError),
    user: session?.data?.user ?? null,
    flow,
    error: sessionError,
    login,
    signup,
    logout,
    reauthenticate,
    requestLoginCode,
    confirmLoginCode,
    resendLoginCode,
  }
}
