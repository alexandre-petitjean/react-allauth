# Changelog

All notable changes to this project are documented in this file. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/).

## [0.3.0] - 2026-07-03

### Added

- Login by code: `useAuth().requestLoginCode(email)`, `confirmLoginCode(code)` and `resendLoginCode()`.
- `useEmails().resendVerification()` — resend the pending signup verification email (requires `ACCOUNT_EMAIL_VERIFICATION_SUPPORTS_RESEND = True` on the backend).
- Passkey management: `useWebAuthn().rename(id, name)` and `remove(ids)`.
- Passwordless signup: `useWebAuthn().signup(data, name?)` runs the full passkey signup ceremony.
- Playground: login-by-code form and a resend button on the verify-email panel, both covered by e2e scenarios.

## [0.2.0] - 2026-07-02

### Added

- `useMFA().authenticate(code)` and `useMFA().reauthenticate(code)` — complete the 2FA login flow (TOTP or recovery code).
- Documentation site (guides and full hook reference) deployed to GitHub Pages.
- Playwright e2e suite driving the playground against the real django-allauth backend in CI (login, signup + email verification by code, session revocation).
- Interactive playground: auth UI with a two-pane API inspector, plus email-verification, 2FA and session panels.
- Coverage thresholds enforced in CI; Dependabot; contributing guide.

## [0.1.0] - 2026-06-15

### Added

- `AllauthProvider` — wires the headless client and shared session state to the tree, fetching the current session on mount and handling cookies + CSRF for the browser client.
- `useAuth` — session state (`status`, `user`, pending `flow`) plus `login`, `signup`, `logout` and `reauthenticate`.
- `usePassword` — password change and the reset-by-key flow.
- `useEmails` — list, add, remove, mark-primary, request-verification and verify email addresses.
- `useMFA` — authenticator list, TOTP setup/activation and recovery codes.
- `useWebAuthn` — passkey registration, login, authentication and re-authentication.
- `useSocialAuth` — provider redirect / token login, connected accounts and disconnect.
- `useSessions` — list and revoke active sessions.
- `useConfig` — fetch the allauth configuration.
- Structured error classes `AllauthRequestError` (well-formed API errors) and `AllauthTransportError` (network and non-JSON failures); data hooks expose `loading`/`error` and refetch automatically once authenticated.
- Complete TypeScript type contract for the django-allauth headless browser API.
- Dual ESM + CommonJS build with bundled type declarations; `react` and `react-dom` are peer dependencies (React 18 or 19).
