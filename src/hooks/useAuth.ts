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
  login(credentials: LoginCredentials): Promise<AuthFlowResponse>
  signup(data: SignupData): Promise<AuthFlowResponse>
  logout(): Promise<void>
  reauthenticate(data: ReauthenticateData): Promise<AuthFlowResponse>
}

/** Core authentication: session state plus login/signup/logout/reauth. */
export function useAuth(): UseAuthResult {
  throw new Error('not implemented')
}
