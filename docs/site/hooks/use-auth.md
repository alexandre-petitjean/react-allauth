# useAuth

Core authentication: session state plus `login`, `signup`, `logout` and
`reauthenticate`.

## Result

```ts
interface UseAuthResult {
  /** 'loading' | 'authenticated' | 'unauthenticated' | 'reauthentication_required' */
  status: AuthStatus
  /** The authenticated user, or null. */
  user: User | null
  /** The pending authentication flow (verify_email, mfa_authenticate...), or null. */
  flow: FlowState | null
  /** Error from the initial session check, or null. */
  error: Error | null
  login(credentials: LoginCredentials): Promise<AuthFlowResponse>
  signup(data: SignupData): Promise<AuthFlowResponse>
  logout(): Promise<AuthFlowResponse>
  reauthenticate(data: ReauthenticateData): Promise<AuthFlowResponse>
}
```

## Example

```tsx
import { useAuth } from 'react-allauth'

function Account() {
  const { status, user, flow, login, logout } = useAuth()

  if (status === 'loading') return <p>Loading…</p>
  if (status === 'authenticated') {
    return <button onClick={() => logout()}>Sign out {user?.display}</button>
  }
  if (flow?.current?.id === 'mfa_authenticate') {
    return <TwoFactorForm /> // -> useMFA().authenticate(code)
  }
  return <LoginForm onSubmit={login} />
}
```

## Notes

- `login`/`signup`/`logout`/`reauthenticate` are flow methods: they return the
  allauth envelope without throwing on API error statuses — read
  `response.errors` for form feedback (see [Error handling](../guide/errors)).
- A successful call updates the shared session automatically; every other hook
  re-renders with the new state.
- `status === 'reauthentication_required'` means the session is authenticated
  but a sensitive action needs a fresh proof: call `reauthenticate` (password),
  `useMFA().reauthenticate` (code) or `useWebAuthn().reauthenticate` (passkey).
