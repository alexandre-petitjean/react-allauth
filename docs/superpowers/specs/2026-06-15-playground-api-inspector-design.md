# Playground: two-pane layout with an API flow inspector

**Date:** 2026-06-15
**Status:** Approved

## Goal

Turn the playground into a demo/test surface split in two: the left pane drives
the interaction (existing auth UI), the right pane shows what the library is
doing — the live auth state and a chronological log of the allauth API calls
with their responses.

## Scope

In scope:

- 50/50 two-column layout, full height, each column scrolls independently.
- Right pane, top: live state from `useAuth()` — `status`, `user`, pending flow.
- Right pane, bottom: an API call log (method + endpoint + HTTP status + JSON
  response, newest first) with a "clear" button.
- Capture via a playground-side `window.fetch` wrapper filtered on `/_allauth/`.

Out of scope (separate tickets if wanted):

- A library-level observability hook (`onResponse`) — kept playground-only here.
- Persisting the log across reloads.

## Architecture

No library changes, no new dependencies. The fetch wrapper lives outside React,
so a small observable store bridges it to the component tree via the built-in
`useSyncExternalStore`.

New files:

- `playground/config.ts` — `BASE_URL` shared by the provider and the logger.
- `playground/lib/apiLog.ts` — observable store of recorded calls
  (`subscribe` / snapshot / `clearCalls`), `installFetchLogger(baseUrl)` that
  patches `window.fetch` once (idempotent, filters `/_allauth/`, clones the
  response to read the JSON without consuming it), and `useApiLog()` built on
  `useSyncExternalStore`.
- `playground/components/Inspector.tsx` — right pane: live state via `useAuth()`
  on top, the `useApiLog()` call log below (each entry: `METHOD /endpoint →
  status` + pretty-printed JSON), newest first.

Changed files:

- `playground/main.tsx` — call `installFetchLogger(BASE_URL)` before render so the
  initial `getSession()` is captured too.
- `playground/App.tsx` — CSS grid `1fr 1fr`; left column = heading + `AuthDemo`
  inside the error boundary; right column = `Inspector`.

Unchanged: `AuthDemo.tsx`, `CredentialsForm.tsx`.

## Backend connectivity (CORS / CSRF)

Discovered while testing the inspector: the dev server (`:5173`) and the backend
(`:8000`) are different origins, so calls were blocked.

- **CORS** → the Vite dev server proxies `/_allauth` to `http://localhost:8000`,
  making requests same-origin (`BASE_URL = ''`). No backend CORS config needed.
- **CSRF** → Django rejected cross-origin POSTs ("Origin checking failed"). Fixed
  by pinning the dev server to port 5173 (`strictPort`) and adding
  `CSRF_TRUSTED_ORIGINS = ["http://localhost:5173"]` to the playground backend
  settings, so login/signup POSTs are accepted.

## Data flow

Left-pane actions call the library client → the patched `fetch` records each
`/_allauth/` call into the store → the `Inspector` re-renders the log. Live state
comes straight from `useAuth()`. Both panes share the same `AllauthProvider`.

Note: under React StrictMode in dev, the initial session check runs twice, so the
log may show two `GET /auth/session` entries — expected dev behavior.

## Error handling

Network failures (no HTTP response) are not logged — there is no API response to
show; the existing error boundary still covers render errors. HTTP error
responses (4xx/5xx) are logged like any other call.

## Testing

No unit tests for the playground (consistent with the existing setup). Validation:
typecheck/lint/build pass, dev server serves the app, and a browser snapshot shows
the two panes with state and the logged session call.
