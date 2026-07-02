# Error handling

The library separates three kinds of failure and is deliberately consistent
about which methods throw and which return.

## The two error classes

```ts
import { AllauthRequestError, AllauthTransportError } from 'react-allauth'
```

- **`AllauthRequestError`** — the server answered with a well-formed allauth
  envelope carrying an error status. It exposes `status` and the structured
  `errors` array (`message`, `code`, and `param` for field errors).
- **`AllauthTransportError`** — no valid envelope was produced: network
  failure, non-JSON body (HTML error page, gateway timeout), or a malformed
  payload. It exposes `status` when a response was received at all.

## Flow methods return the envelope

Methods that advance an authentication flow do **not** throw on API error
statuses — they return the envelope so your form can read the field errors
and the flow state:

```tsx
const response = await login({ email, password })
if (response.errors?.length) {
  // e.g. [{ message: "The email address and/or password you specified are not correct.", code: "email_password_mismatch", param: "password" }]
}
```

This applies to `login`, `signup`, `logout`, `reauthenticate`
(`useAuth`), `verify` (`useEmails`), `confirmReset` (`usePassword`),
`authenticate` / `reauthenticate` (`useMFA`), the WebAuthn ceremonies and
`authenticateByToken` / `providerSignup` (`useSocialAuth`). Transport
failures still throw `AllauthTransportError`.

## Mutation methods throw

Account-management mutations (`useEmails().add/remove/markPrimary`,
`useSessions().revoke`, `useMFA().activateTOTP/deactivateTOTP`,
`usePassword().change`, `useSocialAuth().disconnect`...) throw
`AllauthRequestError` on failure:

```tsx
try {
  await revoke(session)
} catch (error) {
  if (error instanceof AllauthRequestError) {
    console.log(error.status, error.errors)
  }
}
```

## Data hooks expose an error channel

Hooks that fetch data (`useConfig`, `useEmails`, `useMFA`, `useSessions`,
`useSocialAuth`) never reject from their initial load. They expose the last
load failure as state, alongside `loading` and `reload`:

```tsx
const { sessions, loading, error, reload } = useSessions()

if (loading) return <Spinner />
if (error) return <Retry onClick={() => reload()} />
```

The initial session check follows the same rule: a failed check surfaces on
`useAuth().error` with `status` resolving to `unauthenticated`, never a
permanent `loading` state.
