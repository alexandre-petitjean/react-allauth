import { act, renderHook } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { server } from '../test/setup'
import { v1 } from '../test/handlers'
import { wrapper } from '../test/utils'
import { useWebAuthn } from './useWebAuthn'

const fakeCredential = {
  id: 'cred-id',
  rawId: 'cred-id',
  type: 'public-key',
  response: {},
  clientExtensionResults: {},
}

vi.mock('@simplewebauthn/browser', () => ({
  startRegistration: vi.fn(async () => fakeCredential),
  startAuthentication: vi.fn(async () => fakeCredential),
}))

const publicKey = { challenge: 'abc', rpId: 'localhost' }

describe('useWebAuthn', () => {
  it('registers a passkey', async () => {
    let posted: unknown
    server.use(
      http.get(`${v1}/account/authenticators/webauthn`, () =>
        HttpResponse.json({ status: 200, data: { creation_options: { publicKey } } }),
      ),
      http.post(`${v1}/account/authenticators/webauthn`, async ({ request }) => {
        posted = await request.json()
        return HttpResponse.json({
          status: 200,
          data: { type: 'webauthn', id: 1, name: 'My key', created_at: 1, last_used_at: null },
        })
      }),
    )

    const { result } = renderHook(() => useWebAuthn(), { wrapper })

    const authenticator = await act(() => result.current.register('My key'))
    expect(authenticator.type).toBe('webauthn')
    expect(posted).toMatchObject({ name: 'My key', credential: { id: 'cred-id' } })
  })

  it('logs in with a passkey', async () => {
    server.use(
      http.get(`${v1}/auth/webauthn/login`, () =>
        HttpResponse.json({ status: 200, data: { request_options: { publicKey } } }),
      ),
      http.post(`${v1}/auth/webauthn/login`, () =>
        HttpResponse.json(
          { status: 200, meta: { is_authenticated: true }, data: {} },
          { status: 200 },
        ),
      ),
    )

    const { result } = renderHook(() => useWebAuthn(), { wrapper })

    const response = await act(() => result.current.login())
    expect(response.status).toBe(200)
    expect(response.meta?.is_authenticated).toBe(true)
  })
})
