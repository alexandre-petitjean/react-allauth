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

  it('throws AllauthRequestError when creation options are missing', async () => {
    server.use(
      http.get(`${v1}/account/authenticators/webauthn`, () =>
        HttpResponse.json(
          {
            status: 401,
            errors: [{ message: 'reauth required', code: 'reauthentication_required' }],
          },
          { status: 401 },
        ),
      ),
    )

    const { result } = renderHook(() => useWebAuthn(), { wrapper })

    await expect(result.current.register('Key')).rejects.toMatchObject({
      name: 'AllauthRequestError',
      status: 401,
    })
  })

  it('throws AllauthRequestError when request options are missing', async () => {
    server.use(
      http.get(`${v1}/auth/webauthn/login`, () =>
        HttpResponse.json({ status: 200, data: {} }),
      ),
    )

    const { result } = renderHook(() => useWebAuthn(), { wrapper })

    await expect(result.current.login()).rejects.toMatchObject({
      name: 'AllauthRequestError',
    })
  })

  it('surfaces a rejected registration ceremony', async () => {
    server.use(
      http.get(`${v1}/account/authenticators/webauthn`, () =>
        HttpResponse.json({ status: 200, data: { creation_options: { publicKey } } }),
      ),
      http.post(`${v1}/account/authenticators/webauthn`, () =>
        HttpResponse.json(
          { status: 400, errors: [{ message: 'invalid credential', code: 'invalid' }] },
          { status: 400 },
        ),
      ),
    )

    const { result } = renderHook(() => useWebAuthn(), { wrapper })

    await expect(result.current.register('Key')).rejects.toMatchObject({
      name: 'AllauthRequestError',
      status: 400,
    })
  })

  it('renames a passkey', async () => {
    let sent: unknown
    server.use(
      http.put(`${v1}/account/authenticators/webauthn`, async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({
          status: 200,
          data: { type: 'webauthn', id: 7, name: 'Renamed', created_at: 1, last_used_at: null },
        })
      }),
    )

    const { result } = renderHook(() => useWebAuthn(), { wrapper })

    const authenticator = await act(() => result.current.rename(7, 'Renamed'))
    expect(sent).toMatchObject({ id: 7, name: 'Renamed' })
    expect(authenticator.name).toBe('Renamed')
  })

  it('removes passkeys', async () => {
    let sent: unknown
    server.use(
      http.delete(`${v1}/account/authenticators/webauthn`, async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ status: 200 })
      }),
    )

    const { result } = renderHook(() => useWebAuthn(), { wrapper })

    await act(() => result.current.remove([7, 9]))
    expect(sent).toMatchObject({ authenticators: [7, 9] })
  })

  it('rejects a refused removal with AllauthRequestError', async () => {
    server.use(
      http.delete(`${v1}/account/authenticators/webauthn`, () =>
        HttpResponse.json(
          { status: 400, errors: [{ message: 'cannot remove', code: 'invalid' }] },
          { status: 400 },
        ),
      ),
    )

    const { result } = renderHook(() => useWebAuthn(), { wrapper })

    await expect(result.current.remove([7])).rejects.toMatchObject({
      name: 'AllauthRequestError',
      status: 400,
    })
  })
})
