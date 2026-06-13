# Playground

Internal development environment for `react-allauth`. Never published to npm.

It has two parts:

- **Frontend app** (`index.html`, `main.tsx`, `App.tsx`) — a Vite dev app that
  consumes the library through its package name (`react-allauth`, aliased to
  `../src/index.ts`) with HMR.
- **Backend** (`backend/`) — a local [django-allauth](https://docs.allauth.org/)
  server running in `HEADLESS_ONLY` mode, used to validate hooks against a real
  API. Sourced from `examples/react-spa/backend` of the
  [pennersr/django-allauth](https://github.com/pennersr/django-allauth) repo (MIT).

## Frontend

From the repository root:

```sh
npm run dev
```

Starts Vite on http://localhost:5173. Editing `src/*` hot-reloads the app.

## Backend

Requires Docker. From `playground/backend/`:

```sh
docker compose up
```

This starts two services:

| Service | URL                                          | Description                              |
| ------- | -------------------------------------------- | ---------------------------------------- |
| Django  | http://localhost:8000                         | allauth headless API (`HEADLESS_ONLY`)   |
| Django  | http://localhost:8000/admin/                  | Django admin                             |
| Django  | http://localhost:8000/_allauth/openapi.html   | allauth headless OpenAPI spec            |
| Mailpit | http://localhost:8025                         | Captured outgoing emails (web UI)        |

Stop with `docker compose down` (add `-v` to also drop the SQLite volume).

### Headless API

Browser-session endpoints live under `/_allauth/browser/v1/`. Quick check:

```sh
curl http://localhost:8000/_allauth/browser/v1/auth/session
```

An anonymous request returns HTTP 401 with a JSON body listing the available
authentication flows and `meta.is_authenticated: false` — this confirms the
backend is up and headless mode is active.

### Test accounts

| Type      | Username / Email                  | Password | Notes                          |
| --------- | --------------------------------- | -------- | ------------------------------ |
| Superuser | `admin` / `admin@example.com`     | `admin`  | Created automatically. Use it for `/admin/`. |

Regular user accounts are created through the headless signup flow
(`POST /_allauth/browser/v1/auth/signup`). Email verification is **mandatory**
and login-by-code is enabled, so verification/login emails land in Mailpit
(http://localhost:8025).

### Enabled features

- Login methods: **email**
- Signup: open, email verification by code
- MFA: TOTP, recovery codes, WebAuthn (passkeys)
- Social providers: **dummy** (test provider, no real OAuth credentials needed)

### Configuration

Settings live in `backend/backend/settings.py`. To override values locally
without touching the source, create `backend/backend/local_settings.py` — it is
imported at the end of `settings.py` if present.
