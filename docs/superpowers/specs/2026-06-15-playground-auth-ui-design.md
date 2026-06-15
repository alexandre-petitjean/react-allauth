# Playground: interactive auth UI

**Date:** 2026-06-15
**Status:** Approved

## Goal

Turn the playground from a passive `HookShowcase` (read-only dump of every hook)
into an interactive auth demo, so the library can be exercised against the local
django-allauth backend: log in, sign up, log out, and see the resulting state.

## Scope

In scope (Auth core):

- Login form (email + password) → `useAuth().login`
- Signup form (email + password) → `useAuth().signup`
- Logout button → `useAuth().logout`
- Signed-in state (display the user)
- Read-only display of a pending MFA flow when login requires it
- Per-form error display from `response.errors`

Out of scope (separate tickets):

- Completing the MFA TOTP flow — the library does not yet expose
  `POST /auth/2fa/authenticate`.
- Account-management hooks (emails, password, sessions, social).

## Architecture

Vanilla React, inline styles, no new dependencies. Three files:

- `playground/App.tsx` — `AllauthProvider baseUrl="http://localhost:8000"` +
  `ErrorBoundary` + `<AuthDemo />`. Replaces the old `HookShowcase`.
- `playground/components/AuthDemo.tsx` — reads `useAuth()` and renders by status:
  - `loading` → "Loading…"
  - `authenticated` → "Signed in as {user}" + Logout button
  - otherwise → two `CredentialsForm`s (login, signup), plus a read-only banner
    when a pending MFA flow is present.
- `playground/components/CredentialsForm.tsx` — reusable email/password form with
  local state (email, password, submitting) and error display. Takes a title, a
  submit label, and an `onSubmit` returning the auth-flow response. Used twice by
  `AuthDemo` (login and signup), which avoids duplicating two near-identical forms.

## Data flow

Every component consumes `useAuth()` directly; session state is shared through the
provider. A successful login/signup flips `status`, and the UI reacts. Forms read
`response.errors` from the returned envelope and render them (including `param`).

## Error handling

- Form-level: inspect `response.errors` from `login`/`signup`.
- App-level: the existing `ErrorBoundary` catches unexpected render errors (e.g.
  backend unreachable) and shows a fallback.

## Testing

No unit tests for the playground — it is the manual harness used to test the
library against the real backend, consistent with the current setup. Validation
is: typecheck/lint/build pass and `npm run dev` serves the app.
