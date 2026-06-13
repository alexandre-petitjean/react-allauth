import { act, renderHook } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { AllauthRequestError } from '../errors'
import { server } from '../test/setup'
import { v1 } from '../test/handlers'
import { wrapper } from '../test/utils'
import { usePassword } from './usePassword'

describe('usePassword', () => {
  it('changes the password', async () => {
    let received: unknown
    server.use(
      http.post(`${v1}/account/password/change`, async ({ request }) => {
        received = await request.json()
        return HttpResponse.json({ status: 200 })
      }),
    )
    const { result } = renderHook(() => usePassword(), { wrapper })

    await act(async () => {
      await result.current.change({
        current_password: 'old',
        new_password: 'new-secret',
      })
    })

    expect(received).toEqual({ current_password: 'old', new_password: 'new-secret' })
  })

  it('throws AllauthRequestError on a failed change', async () => {
    server.use(
      http.post(`${v1}/account/password/change`, () =>
        HttpResponse.json(
          {
            status: 400,
            errors: [{ message: 'Too short.', code: 'min_length', param: 'new_password' }],
          },
          { status: 400 },
        ),
      ),
    )
    const { result } = renderHook(() => usePassword(), { wrapper })

    await expect(
      result.current.change({ current_password: 'old', new_password: 'x' }),
    ).rejects.toBeInstanceOf(AllauthRequestError)
  })

  it('requests a password reset', async () => {
    let received: unknown
    server.use(
      http.post(`${v1}/auth/password/request`, async ({ request }) => {
        received = await request.json()
        return HttpResponse.json({ status: 200 })
      }),
    )
    const { result } = renderHook(() => usePassword(), { wrapper })

    await act(async () => {
      await result.current.requestReset('me@example.com')
    })

    expect(received).toEqual({ email: 'me@example.com' })
  })

  it('confirms a password reset', async () => {
    server.use(
      http.post(`${v1}/auth/password/reset`, () =>
        HttpResponse.json(
          { status: 200, meta: { is_authenticated: true }, data: {} },
          { status: 200 },
        ),
      ),
    )
    const { result } = renderHook(() => usePassword(), { wrapper })

    const response = await act(() =>
      result.current.confirmReset({ key: 'reset-key', password: 'new-secret' }),
    )

    expect(response.status).toBe(200)
  })
})
