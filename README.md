# react-allauth

> Typed React hooks for the [django-allauth](https://docs.allauth.org/) headless API — authentication, MFA, social login and more, wired up for you.

[![npm version](https://img.shields.io/npm/v/react-allauth.svg)](https://www.npmjs.com/package/react-allauth)
[![CI](https://github.com/alexandre-petitjean/react-allauth/actions/workflows/ci.yml/badge.svg)](https://github.com/alexandre-petitjean/react-allauth/actions/workflows/ci.yml)
[![bundle size](https://img.shields.io/bundlephobia/minzip/react-allauth.svg)](https://bundlephobia.com/package/react-allauth)
[![license](https://img.shields.io/npm/l/react-allauth.svg)](./LICENSE)
[![types](https://img.shields.io/npm/types/react-allauth.svg)](https://www.typescriptlang.org/)

> [!NOTE]
> This package is under active development. All hooks are implemented and tested,
> but the API may still change between `0.x` releases. See [Stability](#stability).

**Documentation:** guides and the full hook reference live at
[alexandre-petitjean.github.io/react-allauth](https://alexandre-petitjean.github.io/react-allauth/).

## Why this exists

django-allauth ships an excellent headless API, but its official front-end
example is a demo SPA, not a reusable library. `react-allauth` turns that API
into a small set of fully-typed React hooks: you get a provider, a flow-aware
`useAuth`, and a contract that covers the entire headless surface (MFA, WebAuthn,
social, sessions, email management) — without hand-rolling fetch calls and CSRF
wiring in every project.

## Install

```sh
npm install react-allauth
```

`react` and `react-dom` are peer dependencies (React 18 or 19):

```sh
npm install react react-dom
```

## Quickstart

Wrap your app in `<AllauthProvider>` and use the hooks anywhere below it:

```tsx
import { AllauthProvider, useAuth } from 'react-allauth'

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

export function App() {
  return (
    <AllauthProvider baseUrl="https://api.example.com">
      <Account />
    </AllauthProvider>
  )
}
```

## Hooks

| Hook            | What it does                                            |
| --------------- | ------------------------------------------------------ |
| `useAuth`       | Session state plus login / signup / logout / reauth    |
| `useConfig`     | Fetch the one-shot allauth configuration               |
| `usePassword`   | Change password and the reset-by-key flow              |
| `useEmails`     | Manage email addresses and verification                |
| `useMFA`        | TOTP, recovery codes and completing 2FA login          |
| `useWebAuthn`   | Passkey registration and authentication                |
| `useSocialAuth` | Provider redirect / token login and connected accounts |
| `useSessions`   | List and revoke active sessions                        |

## Compatibility

- **django-allauth**: 65.18+ with `allauth.headless` enabled (`HEADLESS_ONLY`
  recommended).
- **React**: 18 or 19.
- **Environment**: browser only. No server-side rendering and no React Native —
  the default client relies on cookies. See the
  [threat model](./docs/threat-model.md) for the trade-offs.

## Stability

This package is in its `0.x` phase: the API is still being shaped and breaking
changes may land between `0.x` releases (always noted in the CHANGELOG). Pin a
version if you need stability. See [VERSIONING.md](./VERSIONING.md) for the full
policy and the road to `1.0.0`.

## Security

`react-allauth` handles a security-critical part of your app. Please report
vulnerabilities privately — see [SECURITY.md](./SECURITY.md) — and read the
[threat model](./docs/threat-model.md) before relying on it.

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md). Common scripts:

| Script               | Description                               |
| -------------------- | ----------------------------------------- |
| `npm run dev`        | Run the playground app (Vite, with HMR)   |
| `npm run build`      | Build the library (ESM + CJS + type defs) |
| `npm run test`       | Run the test suite with Vitest            |
| `npm run test:watch` | Run the test suite in watch mode          |
| `npm run lint`       | Lint the source with ESLint               |
| `npm run typecheck`  | Type-check the project with TypeScript    |

Enable the git hooks once after cloning (lint, type-check, whitespace):

```sh
pre-commit install
```

A local allauth backend for development lives under
[`playground/`](./playground/README.md).

## License

[MIT](./LICENSE) © Alexandre Petitjean
