import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '../test/setup'
import { v1 } from '../test/handlers'
import { wrapper } from '../test/utils'
import { useAuth } from './useAuth'

const CREDENTIALS = { email: 'alice@example.com', password: 'secret' }

/** Render `useAuth` and wait for the initial (anonymous) session to settle. */
async function renderAuth() {
  const { result } = renderHook(() => useAuth(), { wrapper })
  await waitFor(() => expect(result.current.status).toBe('unauthenticated'))
  return result
}

describe('useAuth', () => {
  it('resolves to unauthenticated once the session loads', async () => {
    const result = await renderAuth()
    expect(result.current.user).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('does not hang in loading when the session check fails (non-JSON)', async () => {
    server.use(
      http.get(`${v1}/auth/session`, () =>
        new HttpResponse('<html>Bad Gateway</html>', {
          status: 502,
          headers: { 'Content-Type': 'text/html' },
        }),
      ),
    )
    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => expect(result.current.status).toBe('unauthenticated'))
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.user).toBeNull()
  })

  it('does not hang in loading on a valid JSON error envelope (500)', async () => {
    server.use(
      http.get(`${v1}/auth/session`, () =>
        HttpResponse.json(
          { status: 500, errors: [{ message: 'boom', code: 'server_error' }] },
          { status: 500 },
        ),
      ),
    )
    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => expect(result.current.status).toBe('unauthenticated'))
    expect(result.current.error).toBeInstanceOf(Error)
  })

  it('does not hang in loading on malformed parseable JSON', async () => {
    server.use(http.get(`${v1}/auth/session`, () => HttpResponse.json({})))
    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => expect(result.current.status).toBe('unauthenticated'))
    expect(result.current.error).toBeInstanceOf(Error)
  })

  it('clears the startup error after a successful login', async () => {
    server.use(
      http.get(`${v1}/auth/session`, () =>
        HttpResponse.json({ status: 500 }, { status: 500 }),
      ),
    )
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.error).not.toBeNull())

    await act(async () => {
      await result.current.login(CREDENTIALS)
    })

    await waitFor(() => expect(result.current.status).toBe('authenticated'))
    expect(result.current.error).toBeNull()
  })

  it('surfaces a structured server error from logout', async () => {
    server.use(
      http.delete(`${v1}/auth/session`, () =>
        HttpResponse.json(
          { status: 500, errors: [{ message: 'boom', code: 'server_error' }] },
          { status: 500 },
        ),
      ),
    )
    const result = await renderAuth()

    const response = await act(() => result.current.logout())
    expect(response.status).toBe(500)
    expect(response.errors?.[0]?.code).toBe('server_error')
  })

  it('authenticates on login success', async () => {
    const result = await renderAuth()

    await act(async () => {
      await result.current.login(CREDENTIALS)
    })

    await waitFor(() => expect(result.current.status).toBe('authenticated'))
    expect(result.current.user?.email).toBe('alice@example.com')
  })

  it('returns errors and stays unauthenticated on login failure', async () => {
    server.use(
      http.post(`${v1}/auth/login`, () =>
        HttpResponse.json(
          {
            status: 400,
            errors: [
              { message: 'Incorrect credentials.', code: 'login', param: 'password' },
            ],
          },
          { status: 400 },
        ),
      ),
    )
    const result = await renderAuth()

    const response = await act(() =>
      result.current.login({ ...CREDENTIALS, password: 'wrong' }),
    )

    expect(response.errors?.[0]?.code).toBe('login')
    expect(result.current.status).toBe('unauthenticated')
    expect(result.current.user).toBeNull()
  })

  it('exposes the pending flow when MFA is required', async () => {
    server.use(
      http.post(`${v1}/auth/login`, () =>
        HttpResponse.json(
          {
            status: 401,
            data: {
              flows: [{ id: 'mfa_authenticate', is_pending: true, types: ['totp'] }],
            },
            meta: { is_authenticated: false },
          },
          { status: 401 },
        ),
      ),
    )
    const result = await renderAuth()

    await act(async () => {
      await result.current.login(CREDENTIALS)
    })

    await waitFor(() =>
      expect(result.current.flow?.current?.id).toBe('mfa_authenticate'),
    )
    expect(result.current.status).toBe('unauthenticated')
  })

  it('logs in by code: request opens the flow, confirm authenticates', async () => {
    let requested: unknown
    let confirmed: unknown
    server.use(
      http.post(`${v1}/auth/code/request`, async ({ request }) => {
        requested = await request.json()
        return HttpResponse.json(
          {
            status: 401,
            data: { flows: [{ id: 'login_by_code', is_pending: true }] },
            meta: { is_authenticated: false },
          },
          { status: 401 },
        )
      }),
      http.post(`${v1}/auth/code/confirm`, async ({ request }) => {
        confirmed = await request.json()
        return HttpResponse.json(
          {
            status: 200,
            data: { user: { id: 1, display: 'Alice', email: 'alice@example.com' } },
            meta: { is_authenticated: true },
          },
          { status: 200 },
        )
      }),
    )
    const result = await renderAuth()

    await act(() => result.current.requestLoginCode('alice@example.com'))
    expect(requested).toMatchObject({ email: 'alice@example.com' })
    expect(result.current.flow?.current?.id).toBe('login_by_code')
    expect(result.current.status).toBe('unauthenticated')

    await act(() => result.current.confirmLoginCode('ABCD-1234'))
    expect(confirmed).toMatchObject({ code: 'ABCD-1234' })
    expect(result.current.status).toBe('authenticated')
  })

  it('resend rejects on a rate limit and leaves the session state alone', async () => {
    server.use(
      http.post(`${v1}/auth/code/request`, () =>
        HttpResponse.json(
          {
            status: 401,
            data: { flows: [{ id: 'login_by_code', is_pending: true }] },
            meta: { is_authenticated: false },
          },
          { status: 401 },
        ),
      ),
      http.post(`${v1}/auth/code/resend`, () =>
        HttpResponse.json(
          { status: 429, errors: [{ message: 'Too many requests.', code: 'rate_limited' }] },
          { status: 429 },
        ),
      ),
    )
    const result = await renderAuth()
    await act(() => result.current.requestLoginCode('alice@example.com'))

    await expect(result.current.resendLoginCode()).rejects.toMatchObject({
      name: 'AllauthRequestError',
      status: 429,
    })
    expect(result.current.flow?.current?.id).toBe('login_by_code')
    expect(result.current.status).toBe('unauthenticated')
  })
})
