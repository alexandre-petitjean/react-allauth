# useWebAuthn

Passkey (WebAuthn) registration and authentication, including passkey login
and re-authentication. Browser ceremonies are handled through
`@simplewebauthn/browser`.

## Result

```ts
interface UseWebAuthnResult {
  /** Register a new passkey on the authenticated account. */
  register(name?: string): Promise<WebAuthnAuthenticator>
  /** Complete an MFA step using a passkey. */
  authenticate(): Promise<AuthFlowResponse>
  /** Log in using a passkey. */
  login(): Promise<AuthFlowResponse>
  /** Re-authenticate using a passkey. */
  reauthenticate(): Promise<AuthFlowResponse>
}
```

## Example

```tsx
import { useWebAuthn } from 'react-allauth'

function PasskeyLogin() {
  const { login } = useWebAuthn()

  return (
    <button
      onClick={async () => {
        const response = await login() // triggers the browser passkey prompt
        if (response.errors?.length) {
          // ceremony rejected by the server
        }
      }}
    >
      Sign in with a passkey
    </button>
  )
}
```

## Notes

- Each method drives the full ceremony: fetch options from the backend, run
  the browser prompt, post the credential back.
- `register` requires an authenticated session and throws
  `AllauthRequestError` when the backend refuses to hand out creation options
  (typically `reauthentication_required`).
- The browser prompt itself can reject (user cancel, no authenticator): that
  surfaces as the DOM exception from `@simplewebauthn/browser` — handle it in
  your UI.
- The ceremony-completing calls are flow methods returning the envelope.
