import type { AuthFlowResponse, WebAuthnAuthenticator } from '../types'

export interface UseWebAuthnResult {
  /** Register a new passkey on the authenticated account. */
  register(name?: string): Promise<WebAuthnAuthenticator>
  /** Complete an MFA step using a passkey. */
  authenticate(): Promise<AuthFlowResponse>
  /** Log in using a passkey. */
  login(): Promise<AuthFlowResponse>
  /** Re-authenticate using a passkey. */
  reauthenticate(): Promise<AuthFlowResponse>
}

/** WebAuthn / passkey registration and authentication. */
export function useWebAuthn(): UseWebAuthnResult {
  throw new Error('not implemented')
}
