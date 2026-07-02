import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '../test/setup'
import { v1 } from '../test/handlers'
import { wrapper } from '../test/utils'
import { AllauthTransportError } from '../errors'
import { useConfig } from './useConfig'

describe('useConfig', () => {
  it('loads the allauth configuration', async () => {
    server.use(
      http.get(`${v1}/config`, () =>
        HttpResponse.json(
          {
            status: 200,
            data: {
              account: { authentication_method: 'email', is_open_for_signup: true },
              socialaccount: {
                providers: [{ id: 'dummy', name: 'Dummy', flows: ['provider_redirect'] }],
              },
            },
          },
          { status: 200 },
        ),
      ),
    )

    const { result } = renderHook(() => useConfig(), { wrapper })

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.config?.account.is_open_for_signup).toBe(true)
    expect(result.current.config?.socialaccount?.providers[0]?.id).toBe('dummy')
    expect(result.current.error).toBeNull()
  })

  it('exposes an error when the request fails', async () => {
    server.use(
      http.get(`${v1}/config`, () =>
        HttpResponse.json(
          { status: 500, errors: [{ message: 'boom', code: 'server_error' }] },
          { status: 500 },
        ),
      ),
    )

    const { result } = renderHook(() => useConfig(), { wrapper })

    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.config).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('surfaces non-JSON replies as AllauthTransportError', async () => {
    server.use(
      http.get(`${v1}/config`, () =>
        HttpResponse.text('<html>Bad gateway</html>', { status: 502 }),
      ),
    )

    const { result } = renderHook(() => useConfig(), { wrapper })

    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.error).toBeInstanceOf(AllauthTransportError)
    expect(result.current.config).toBeNull()
  })

  it('reload refetches the configuration', async () => {
    let signupOpen = false
    server.use(
      http.get(`${v1}/config`, () =>
        HttpResponse.json({
          status: 200,
          data: {
            account: {
              authentication_method: 'email',
              is_open_for_signup: signupOpen,
            },
          },
        }),
      ),
    )

    const { result } = renderHook(() => useConfig(), { wrapper })
    await waitFor(() => expect(result.current.config).not.toBeNull())
    expect(result.current.config?.account.is_open_for_signup).toBe(false)

    signupOpen = true
    await act(() => result.current.reload())
    expect(result.current.config?.account.is_open_for_signup).toBe(true)
  })
})
