import { useEffect } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AllauthProvider } from './AllauthProvider'
import type { AllauthClient } from './client'
import { useAllauthContext } from './hooks/useAllauthContext'
import { useAuth } from './hooks/useAuth'
import { server } from './test/setup'
import { TEST_BASE_URL, v1 } from './test/handlers'

function AuthProbe({ onClient }: { onClient: (client: AllauthClient) => void }) {
  const client = useAllauthContext().client
  const { status, login } = useAuth()
  useEffect(() => onClient(client), [client, onClient])
  return (
    <button
      disabled={status === 'loading'}
      onClick={() => void login({ username: 'alice', password: 'secret' })}
    >
      {status}
    </button>
  )
}

function clearSecureCsrfCookie() {
  document.cookie =
    '__Secure-csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; path=/'
}

afterEach(clearSecureCsrfCookie)

describe('AllauthProvider', () => {
  it('passes configured CSRF names without resetting for an equal inline list', async () => {
    let csrfHeader: string | null = null
    server.use(
      http.post(`${v1}/auth/login`, ({ request }) => {
        csrfHeader = request.headers.get('X-CSRFToken')
        return HttpResponse.json(
          { status: 400, errors: [{ message: 'stop', code: 'test' }] },
          { status: 400 },
        )
      }),
    )
    document.cookie = '__Secure-csrftoken=secure-token; Secure; path=/'
    const captureClient = vi.fn()

    const tree = () => (
      <AllauthProvider
        baseUrl={TEST_BASE_URL}
        csrfCookieNames={['__Secure-csrftoken', 'csrftoken']}
      >
        <AuthProbe onClient={captureClient} />
      </AllauthProvider>
    )
    const { rerender } = render(tree())

    await waitFor(() =>
      expect(screen.getByRole('button').textContent).toBe('unauthenticated'),
    )
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => expect(csrfHeader).toBe('secure-token'))

    expect(captureClient).toHaveBeenCalledOnce()
    rerender(tree())
    expect(captureClient).toHaveBeenCalledOnce()
  })
})
