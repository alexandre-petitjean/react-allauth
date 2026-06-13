import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '../test/setup'
import { v1 } from '../test/handlers'
import { wrapper } from '../test/utils'
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
  })
})
