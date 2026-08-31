# Threat model

`react-allauth` is a thin browser-side client for the
[django-allauth headless API](https://docs.allauth.org/en/latest/headless/). It
delegates all authentication decisions, password hashing, token issuance and
session management to the server. This document states clearly what the library
protects against and what remains the responsibility of the consuming
application and its operators.

## In scope — what the library takes care of

- **CSRF wiring.** For browser clients, the CSRF token is read from the
  configured cookie names (`csrftoken` by default) and sent as the
  `X-CSRFToken` header on every mutating request, matching django-allauth's
  expectations.
- **Cookie-based session defaults.** Requests are sent with
  `credentials: 'include'` so the browser manages the `HttpOnly`, server-set
  session cookie. The session secret is never read or handled in JavaScript.
- **No secret storage in `localStorage`.** The browser client relies on cookies
  and never persists session secrets to `localStorage` or `sessionStorage`.
  Token-based storage, if added, will be strictly opt-in and documented.
- **No secret logging.** The library does not log credentials, tokens or session
  identifiers.
- **Correct re-authentication handling.** Responses that signal re-auth
  (`401` with `meta.is_authenticated = true`) are surfaced through the flow state
  so the app can prompt for re-authentication before sensitive actions.

## Out of scope — the consumer's responsibility

- **XSS in the consuming application.** If the host app is vulnerable to XSS, an
  attacker can act on behalf of the user regardless of this library. Sanitize
  your own inputs and outputs.
- **Transport security.** Always serve both the app and the allauth backend over
  HTTPS. The library does not and cannot enforce this.
- **Phishing and social engineering.** Out of scope.
- **Physical access and compromised devices.** A compromised device or browser
  extension can read anything the page can; this is not defended against.
- **Backend configuration.** Correct allauth settings (email verification, MFA
  policy, rate limiting, allowed origins) live on the server and are the
  operator's responsibility.

## Known trade-offs

- **Cookie-based, browser-only.** Only the allauth `browser` client (cookie +
  CSRF) is supported. The `app` client and its `X-Session-Token` strategy are
  intentionally not implemented, so cross-origin setups require correct CORS and
  cookie configuration on the backend. There is no React Native or SSR client.
- **No custom cryptography.** All crypto (password hashing, token signing, TOTP,
  WebAuthn) is delegated to django-allauth. The library adds none of its own.
- **Server is the source of truth.** Client-side flow state is a convenience
  mirror of server responses; the server always enforces the actual policy.
