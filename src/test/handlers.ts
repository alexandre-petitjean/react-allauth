import { http, HttpResponse } from 'msw'

/** Base URL used across the test suite. */
export const TEST_BASE_URL = 'http://localhost:8000'

/** Versioned browser endpoint prefix. */
export const v1 = `${TEST_BASE_URL}/_allauth/browser/v1`

/**
 * Default handlers: an anonymous session and a successful login. Individual
 * tests override these with `server.use(...)` for failure/MFA scenarios.
 */
/** Override the session handler to report an authenticated browser session. */
export function authenticatedSession() {
  return http.get(`${v1}/auth/session`, () =>
    HttpResponse.json({
      status: 200,
      data: { user: { id: 1, display: 'Alice', email: 'alice@example.com' } },
      meta: { is_authenticated: true },
    }),
  )
}

export const handlers = [
  http.get(`${v1}/auth/session`, () =>
    HttpResponse.json(
      {
        status: 401,
        data: { flows: [{ id: 'login' }] },
        meta: { is_authenticated: false },
      },
      { status: 401 },
    ),
  ),
  http.post(`${v1}/auth/login`, () =>
    HttpResponse.json(
      {
        status: 200,
        data: {
          user: { id: 1, display: 'Alice', email: 'alice@example.com' },
        },
        meta: { is_authenticated: true },
      },
      { status: 200 },
    ),
  ),
]
