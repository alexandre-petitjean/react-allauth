import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { AllauthProvider } from '../AllauthProvider'
import { server } from '../test/setup'
import { TEST_BASE_URL, v1 } from '../test/handlers'
import { useAuth } from './useAuth'

const CREDENTIALS = { email: 'alice@example.com', password: 'secret' }

function wrapper({ children }: { children: ReactNode }) {
  return <AllauthProvider baseUrl={TEST_BASE_URL}>{children}</AllauthProvider>
}

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
})
