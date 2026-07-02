# Backend configuration

`react-allauth` talks to django-allauth's headless **browser** API
(`/_allauth/browser/v1/...`), which authenticates with session cookies and
CSRF tokens — the same mechanics as a classic Django app.

## Minimal Django settings

```python
INSTALLED_APPS = [
    # ...
    "allauth",
    "allauth.account",
    "allauth.headless",
    # optional, per feature:
    "allauth.mfa",            # useMFA / useWebAuthn
    "allauth.socialaccount",  # useSocialAuth
    "allauth.usersessions",   # useSessions
]

MIDDLEWARE = [
    # ...
    "allauth.account.middleware.AccountMiddleware",
]

AUTHENTICATION_BACKENDS = ("allauth.account.auth_backends.AuthenticationBackend",)

# Serve only the headless API (no server-rendered account pages).
HEADLESS_ONLY = True

# Where emails should send users in YOUR front-end.
HEADLESS_FRONTEND_URLS = {
    "account_confirm_email": "/account/verify-email/{key}",
    "account_reset_password": "/account/password/reset",
    "account_reset_password_from_key": "/account/password/reset/key/{key}",
    "account_signup": "/account/signup",
}
```

A complete working example lives in the repository under
[`playground/backend`](https://github.com/alexandre-petitjean/react-allauth/tree/master/playground/backend).

## Same-origin (recommended): proxy the API

Cookies and CSRF work out of the box when the API is served from the same
origin as your front-end. In development, proxy `/_allauth` to Django and pass
an empty `baseUrl`:

```ts
// vite.config.ts
export default defineConfig({
  server: {
    proxy: { '/_allauth': 'http://localhost:8000' },
  },
})
```

```tsx
<AllauthProvider baseUrl="">
```

In production the equivalent is a reverse-proxy rule (nginx, Caddy...) routing
`/_allauth` to Django.

## Cross-origin: CORS + cookie settings

If the API lives on another origin (e.g. `api.example.com`), the browser must
be allowed to send credentials:

```python
# django-cors-headers
CORS_ALLOWED_ORIGINS = ["https://app.example.com"]
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = ["https://app.example.com"]

# Cookies must be sent cross-site:
SESSION_COOKIE_SAMESITE = "None"
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SAMESITE = "None"
CSRF_COOKIE_SECURE = True
```

::: warning
The client reads the `csrftoken` cookie to send the `X-CSRFToken` header on
mutating requests. Cross-origin, this requires the CSRF cookie to be readable
from your front-end origin's requests — prefer the same-origin setup when you
can; it is simpler and has a smaller attack surface. See the project's
[threat model](https://github.com/alexandre-petitjean/react-allauth/blob/master/docs/threat-model.md).
:::

## Email verification and password reset

The hooks cover verification **by code** (`ACCOUNT_EMAIL_VERIFICATION_BY_CODE_ENABLED = True`)
with `useEmails().verify(code)`, and reset-by-key with
`usePassword().confirmReset({ key, password })` — your front-end routes the
`HEADLESS_FRONTEND_URLS` links to the matching forms.
