import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '../test/setup'
import { authenticatedSession, v1 } from '../test/handlers'
import { wrapper } from '../test/utils'
import { useSessions } from './useSessions'

function session(id: number, isCurrent = false) {
  return {
    id,
    user_agent: 'Firefox',
    ip: '127.0.0.1',
    created_at: 1,
    last_seen_at: 2,
    is_current: isCurrent,
  }
}

describe('useSessions', () => {
  it('lists sessions and revokes one', async () => {
    let sessions = [session(1, true), session(2)]
    server.use(
      authenticatedSession(),
      http.get(`${v1}/auth/sessions`, () =>
        HttpResponse.json({ status: 200, data: sessions }),
      ),
      http.delete(`${v1}/auth/sessions`, async ({ request }) => {
        const body = (await request.json()) as { sessions: number[] }
        sessions = sessions.filter((s) => !body.sessions.includes(s.id))
        return HttpResponse.json({ status: 200, data: sessions })
      }),
    )

    const { result } = renderHook(() => useSessions(), { wrapper })
    await waitFor(() => expect(result.current.sessions).toHaveLength(2))

    await act(async () => {
      await result.current.revoke(result.current.sessions[1]!)
    })

    await waitFor(() => expect(result.current.sessions).toHaveLength(1))
    expect(result.current.sessions[0]?.id).toBe(1)
  })

  it('returns an empty list without calling the API when anonymous', async () => {
    let called = false
    server.use(
      http.get(`${v1}/auth/sessions`, () => {
        called = true
        return HttpResponse.json({ status: 200, data: [] })
      }),
    )

    const { result } = renderHook(() => useSessions(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.sessions).toEqual([])
    expect(called).toBe(false)
  })

  it('surfaces a failed list as error', async () => {
    server.use(
      authenticatedSession(),
      http.get(`${v1}/auth/sessions`, () =>
        HttpResponse.json(
          { status: 500, errors: [{ message: 'boom', code: 'server_error' }] },
          { status: 500 },
        ),
      ),
    )

    const { result } = renderHook(() => useSessions(), { wrapper })

    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.sessions).toEqual([])
    expect(result.current.loading).toBe(false)
  })

  it('throws from revoke and keeps the list on failure', async () => {
    server.use(
      authenticatedSession(),
      http.get(`${v1}/auth/sessions`, () =>
        HttpResponse.json({ status: 200, data: [session(1, true), session(2)] }),
      ),
      http.delete(`${v1}/auth/sessions`, () =>
        HttpResponse.json(
          { status: 400, errors: [{ message: 'cannot revoke', code: 'invalid' }] },
          { status: 400 },
        ),
      ),
    )

    const { result } = renderHook(() => useSessions(), { wrapper })
    await waitFor(() => expect(result.current.sessions).toHaveLength(2))

    await expect(
      act(() => result.current.revoke(result.current.sessions[1]!)),
    ).rejects.toMatchObject({ name: 'AllauthRequestError' })
    expect(result.current.sessions).toHaveLength(2)
  })
})
