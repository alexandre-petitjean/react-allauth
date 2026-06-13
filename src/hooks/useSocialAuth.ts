import type {
  AuthFlowResponse,
  AuthProcess,
  ProviderAccount,
  ProviderToken,
  SignupData,
} from '../types'

export interface UseSocialAuthResult {
  /** Third-party accounts connected to the user. */
  connections: ProviderAccount[]
  /** Navigate to the provider's redirect (OAuth) flow. */
  redirectToProvider(
    providerId: string,
    callbackUrl: string,
    process?: AuthProcess,
  ): void
  /** Authenticate by handing over a token retrieved elsewhere. */
  authenticateByToken(
    providerId: string,
    token: ProviderToken,
    process?: AuthProcess,
  ): Promise<AuthFlowResponse>
  /** Complete a pending provider signup. */
  providerSignup(data: SignupData): Promise<AuthFlowResponse>
  /** Disconnect a connected provider account. */
  disconnect(account: ProviderAccount): Promise<void>
}

/** Third-party (social) authentication and connected accounts. */
export function useSocialAuth(): UseSocialAuthResult {
  throw new Error('not implemented')
}
