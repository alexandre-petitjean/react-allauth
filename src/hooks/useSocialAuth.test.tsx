import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { server } from '../test/setup'
import { v1 } from '../test/handlers'
import { wrapper } from '../test/utils'
import { useSocialAuth } from './useSocialAuth'

const providersPath = `${v1}/account/providers`

function connection(uid: string, providerId = 'google') {
  return {
    uid,
    display: `Account ${uid}`,
    provider: { id: providerId, name: 'Google', flows: ['provider_redirect'] },
  }
}

describe('useSocialAuth', () => {
  it('lists connections and disconnects one', async () => {
    let connections = [connection('a'), connection('b')]
    server.use(
      http.get(providersPath, () =>
        HttpResponse.json({ status: 200, data: connections }),
      ),
      http.delete(providersPath, async ({ request }) => {
        const body = (await request.json()) as { account: string }
        connections = connections.filter((c) => c.uid !== body.account)
        return HttpResponse.json({ status: 200, data: connections })
      }),
    )

    const { result } = renderHook(() => useSocialAuth(), { wrapper })
    await waitFor(() => expect(result.current.connections).toHaveLength(2))

    await act(async () => {
      await result.current.disconnect(result.current.connections[0]!)
    })

    await waitFor(() => expect(result.current.connections).toHaveLength(1))
    expect(result.current.connections[0]?.uid).toBe('b')
  })

  it('authenticates by token', async () => {
    let received: unknown
    server.use(
      http.get(providersPath, () => HttpResponse.json({ status: 200, data: [] })),
      http.post(`${v1}/auth/provider/token`, async ({ request }) => {
        received = await request.json()
        return HttpResponse.json(
          { status: 200, meta: { is_authenticated: true }, data: {} },
          { status: 200 },
        )
      }),
    )

    const { result } = renderHook(() => useSocialAuth(), { wrapper })

    const response = await act(() =>
      result.current.authenticateByToken('google', { client_id: 'abc', id_token: 'xyz' }),
    )

    expect(response.status).toBe(200)
    expect(received).toMatchObject({ provider: 'google', process: 'login' })
  })

  it('builds and submits a provider redirect form', async () => {
    server.use(
      http.get(providersPath, () => HttpResponse.json({ status: 200, data: [] })),
    )
    const submit = vi
      .spyOn(HTMLFormElement.prototype, 'submit')
      .mockImplementation(() => {})

    const { result } = renderHook(() => useSocialAuth(), { wrapper })

    act(() => {
      result.current.redirectToProvider('google', 'https://app/callback', 'login')
    })

    expect(submit).toHaveBeenCalledOnce()
    const form = document.querySelector('form')
    expect(form?.action).toContain('/auth/provider/redirect')
    expect(
      (form?.querySelector('[name="provider"]') as HTMLInputElement | null)?.value,
    ).toBe('google')
    submit.mockRestore()
    form?.remove()
  })
})
