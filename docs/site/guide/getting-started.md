# Getting started

`react-allauth` turns the [django-allauth headless API](https://docs.allauth.org/en/latest/headless/index.html)
into a small set of fully-typed React hooks: a provider, a flow-aware
`useAuth`, and hooks covering MFA, WebAuthn, social login, email and session
management.

## Install

```sh
npm install react-allauth
```

`react` and `react-dom` are peer dependencies (React 18 or 19):

```sh
npm install react react-dom
```

## Wrap your app

Wrap your tree once in `<AllauthProvider>` and point it at your backend. The
provider fetches the current session on mount and shares it with every hook.

```tsx
import { AllauthProvider } from 'react-allauth'

export function App() {
  return (
    <AllauthProvider baseUrl="https://api.example.com">
      <Account />
    </AllauthProvider>
  )
}
```

Use an empty `baseUrl` (`""`) when the API is served same-origin, e.g. behind
a dev-server proxy — see [Backend configuration](./backend).

## Use the hooks

```tsx
import { useAuth } from 'react-allauth'

function Account() {
  const { status, user, login, logout } = useAuth()

  if (status === 'loading') return <p>Loading…</p>
  if (status === 'authenticated') {
    return <button onClick={() => logout()}>Sign out {user?.display}</button>
  }
  return (
    <button onClick={() => login({ email: 'me@example.com', password: 'secret' })}>
      Sign in
    </button>
  )
}
```

Every hook is documented in the [hook reference](../hooks/use-auth).

## Pending flows

Authentication is not always a single step: the backend may require email
verification or a second factor. `useAuth().flow` exposes the pending flow so
you can render the right form:

```tsx
const { flow } = useAuth()

if (flow?.current?.id === 'verify_email') {
  // render a verification-code form -> useEmails().verify(code)
}
if (flow?.current?.id === 'mfa_authenticate') {
  // render a 2FA code form -> useMFA().authenticate(code)
}
```

## Compatibility

- **django-allauth**: 65.18+ with `allauth.headless` enabled (`HEADLESS_ONLY`
  recommended).
- **React**: 18 or 19.
- **Environment**: browser only — the client relies on cookies. No server-side
  rendering, no React Native.
