import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '../test/setup'
import { authenticatedSession, v1 } from '../test/handlers'
import { wrapper } from '../test/utils'
import { useMFA } from './useMFA'

const authPath = `${v1}/account/authenticators`

describe('useMFA', () => {
  it('lists authenticators', async () => {
    server.use(
      authenticatedSession(),
      http.get(authPath, () =>
        HttpResponse.json({
          status: 200,
          data: [
            { type: 'recovery_codes', created_at: 1, last_used_at: null, total_code_count: 10, unused_code_count: 8 },
          ],
        }),
      ),
    )
    const { result } = renderHook(() => useMFA(), { wrapper })
    await waitFor(() => expect(result.current.authenticators).toHaveLength(1))
    expect(result.current.authenticators[0]?.type).toBe('recovery_codes')
  })

  it('returns the TOTP setup from a 404 status', async () => {
    server.use(
      http.get(authPath, () => HttpResponse.json({ status: 200, data: [] })),
      http.get(`${authPath}/totp`, () =>
        HttpResponse.json(
          { status: 404, meta: { secret: 'BASE32SECRET', totp_url: 'otpauth://totp/x' } },
          { status: 404 },
        ),
      ),
    )
    const { result } = renderHook(() => useMFA(), { wrapper })

    const setup = await act(() => result.current.getTOTPSetup())
    expect(setup).toEqual({ secret: 'BASE32SECRET', totp_url: 'otpauth://totp/x' })
  })

  it('activates TOTP with a code', async () => {
    server.use(
      http.get(authPath, () => HttpResponse.json({ status: 200, data: [] })),
      http.post(`${authPath}/totp`, () =>
        HttpResponse.json({
          status: 200,
          data: { type: 'totp', created_at: 2, last_used_at: null },
        }),
      ),
    )
    const { result } = renderHook(() => useMFA(), { wrapper })

    const authenticator = await act(() => result.current.activateTOTP('123456'))
    expect(authenticator.type).toBe('totp')
  })

  it('views recovery codes', async () => {
    server.use(
      http.get(authPath, () => HttpResponse.json({ status: 200, data: [] })),
      http.get(`${authPath}/recovery-codes`, () =>
        HttpResponse.json({
          status: 200,
          data: {
            type: 'recovery_codes',
            created_at: 1,
            last_used_at: null,
            total_code_count: 10,
            unused_code_count: 2,
            unused_codes: ['code-a', 'code-b'],
          },
        }),
      ),
    )
    const { result } = renderHook(() => useMFA(), { wrapper })

    const codes = await act(() => result.current.viewRecoveryCodes())
    expect(codes).toEqual(['code-a', 'code-b'])
  })
})
