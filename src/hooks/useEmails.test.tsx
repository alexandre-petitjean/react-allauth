import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '../test/setup'
import { authenticatedSession, v1 } from '../test/handlers'
import { wrapper } from '../test/utils'
import { useAuth } from './useAuth'
import { useEmails } from './useEmails'

describe('useEmails', () => {
  it('lists emails and adds a new one', async () => {
    let emails = [{ email: 'a@example.com', verified: true, primary: true }]
    server.use(
      authenticatedSession(),
      http.get(`${v1}/account/email`, () =>
        HttpResponse.json({ status: 200, data: emails }),
      ),
      http.post(`${v1}/account/email`, async ({ request }) => {
        const body = (await request.json()) as { email: string }
        emails = [...emails, { email: body.email, verified: false, primary: false }]
        return HttpResponse.json({ status: 200, data: emails })
      }),
    )

    const { result } = renderHook(() => useEmails(), { wrapper })
    await waitFor(() => expect(result.current.emails).toHaveLength(1))

    await act(async () => {
      await result.current.add('b@example.com')
    })

    await waitFor(() => expect(result.current.emails).toHaveLength(2))
    expect(result.current.emails[1]?.email).toBe('b@example.com')
  })

  it('refetches after the user authenticates', async () => {
    server.use(
      http.get(`${v1}/account/email`, () =>
        HttpResponse.json({
          status: 200,
          data: [{ email: 'a@example.com', verified: true, primary: true }],
        }),
      ),
    )
    const { result } = renderHook(
      () => ({ auth: useAuth(), emails: useEmails() }),
      { wrapper },
    )
    // Unauthenticated: the data hook does not fetch.
    await waitFor(() => expect(result.current.auth.status).toBe('unauthenticated'))
    expect(result.current.emails.emails).toHaveLength(0)

    await act(async () => {
      await result.current.auth.login({
        email: 'alice@example.com',
        password: 'secret',
      })
    })

    // After login the data hook refetches automatically.
    await waitFor(() => expect(result.current.emails.emails).toHaveLength(1))
  })

  it('verifies an email by key', async () => {
    server.use(
      http.get(`${v1}/account/email`, () =>
        HttpResponse.json({ status: 200, data: [] }),
      ),
      http.post(`${v1}/auth/email/verify`, () =>
        HttpResponse.json(
          { status: 200, meta: { is_authenticated: true }, data: {} },
          { status: 200 },
        ),
      ),
    )

    const { result } = renderHook(() => useEmails(), { wrapper })

    const response = await act(() => result.current.verify('verify-key'))
    expect(response.status).toBe(200)
  })
})
