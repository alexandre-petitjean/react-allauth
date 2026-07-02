# useSocialAuth

Third-party (social) authentication: provider redirect flow, token login,
connected accounts and disconnection.

## Result

```ts
interface UseSocialAuthResult {
  /** Third-party accounts connected to the user. */
  connections: ProviderAccount[]
  loading: boolean
  error: Error | null
  /** Refetch the connected accounts. */
  reload(): Promise<void>
  /** Navigate to the provider's redirect (OAuth) flow. */
  redirectToProvider(providerId: string, callbackUrl: string, process?: AuthProcess): void
  /** Authenticate by handing over a token retrieved elsewhere. */
  authenticateByToken(providerId: string, token: ProviderToken, process?: AuthProcess): Promise<AuthFlowResponse>
  /** Complete a pending provider signup. */
  providerSignup(data: SignupData): Promise<AuthFlowResponse>
  /** Disconnect a connected provider account. */
  disconnect(account: ProviderAccount): Promise<void>
}
```

## Example

```tsx
import { useSocialAuth } from 'react-allauth'

function GoogleButton() {
  const { redirectToProvider } = useSocialAuth()

  return (
    <button
      onClick={() =>
        redirectToProvider('google', `${window.location.origin}/callback`)
      }
    >
      Continue with Google
    </button>
  )
}
```

## Notes

- `redirectToProvider` performs a full-page form POST: the browser leaves your
  app for the provider and comes back to `callbackUrl`. `process` defaults to
  `'login'`; pass `'connect'` to link a provider to the signed-in account.
- `authenticateByToken` suits providers whose SDK hands you a token client-side
  (e.g. one-tap sign-in). Flow method: returns the envelope.
- `connections` is empty (no request made) while anonymous. `disconnect` is a
  mutation: it throws `AllauthRequestError` (e.g. when removing the last login
  method) and keeps the list in sync on success.
- Available providers come from [useConfig](./use-config).
