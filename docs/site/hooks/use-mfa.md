# useMFA

Multi-factor authentication: list authenticators, set up TOTP, manage
recovery codes, and complete a pending 2FA login.

## Result

```ts
interface UseMFAResult {
  /** Configured authenticators (TOTP, recovery codes, WebAuthn). */
  authenticators: Authenticator[]
  loading: boolean
  error: Error | null
  /** Refetch the authenticator list. */
  reload(): Promise<void>
  /** Fetch the TOTP secret + provisioning URI to display a QR code. */
  getTOTPSetup(): Promise<TOTPSetup>
  activateTOTP(code: string): Promise<TOTPAuthenticator>
  deactivateTOTP(): Promise<void>
  /** Regenerate recovery codes and return the new codes. */
  generateRecoveryCodes(): Promise<string[]>
  /** Return the still-unused recovery codes. */
  viewRecoveryCodes(): Promise<string[]>
  /** Complete a pending mfa_authenticate flow with a TOTP or recovery code. */
  authenticate(code: string): Promise<AuthFlowResponse>
  /** Re-authenticate with a TOTP or recovery code. */
  reauthenticate(code: string): Promise<AuthFlowResponse>
}
```

## Example: TOTP enrollment

```tsx
import { useMFA } from 'react-allauth'

function EnrollTOTP() {
  const { getTOTPSetup, activateTOTP } = useMFA()

  async function start() {
    const { secret, totp_url } = await getTOTPSetup()
    // render totp_url as a QR code, then ask for a first code:
    await activateTOTP(firstCode)
  }
  // ...
}
```

## Example: completing a 2FA login

```tsx
const { flow } = useAuth()
const { authenticate } = useMFA()

if (flow?.current?.id === 'mfa_authenticate') {
  const response = await authenticate(code)
  if (response.errors?.length) {
    // incorrect code
  }
}
```

## Notes

- `authenticators` is empty (no request made) while anonymous; setup and
  management require an authenticated — often freshly reauthenticated —
  session.
- `activateTOTP`, `deactivateTOTP`, `generateRecoveryCodes` are mutations
  (throw on failure) and refresh the authenticator list.
- `authenticate` / `reauthenticate` are flow methods: they return the
  envelope, apply the session on success, and leave error statuses to the
  caller. Passkey-based MFA goes through [useWebAuthn](./use-webauthn).
