import type {
  Authenticator,
  RecoveryCodesAuthenticator,
  TOTPAuthenticator,
  TOTPSetup,
} from '../types'

export interface UseMFAResult {
  /** Configured authenticators (TOTP, recovery codes, WebAuthn). */
  authenticators: Authenticator[]
  // TOTP
  getTOTPSetup(): Promise<TOTPSetup>
  activateTOTP(code: string): Promise<TOTPAuthenticator>
  deactivateTOTP(): Promise<void>
  // Recovery codes
  generateRecoveryCodes(): Promise<RecoveryCodesAuthenticator>
  viewRecoveryCodes(): Promise<string[]>
  // Trust this browser
  trustBrowser(): Promise<void>
}

/** Multi-factor authentication: TOTP, recovery codes and browser trust. */
export function useMFA(): UseMFAResult {
  throw new Error('not implemented')
}
