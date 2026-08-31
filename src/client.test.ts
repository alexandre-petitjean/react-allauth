import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { server } from './test/setup'
import { TEST_BASE_URL, v1 } from './test/handlers'
import { AllauthClient, allauthV1Url } from './client'
import { AllauthTransportError } from './errors'

const client = new AllauthClient({ baseUrl: TEST_BASE_URL })

function clearCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; path=/`
}

function clearCsrfCookies() {
  clearCookie('csrftoken')
  clearCookie('__Secure-csrftoken')
  clearCookie('csrf.token')
  clearCookie('csrfXtoken')
}

afterEach(clearCsrfCookies)

describe('allauthV1Url', () => {
  it('builds the versioned endpoint prefix', () => {
    expect(allauthV1Url('https://api.example.com')).toBe(
      'https://api.example.com/_allauth/browser/v1',
    )
  })
})

describe('AllauthClient.request', () => {
  it('sends the CSRF cookie as X-CSRFToken on mutating requests only', async () => {
    document.cookie = 'csrftoken=tok-123'
    const seen: Record<string, string | null> = {}
    server.use(
      http.get(`${v1}/config`, ({ request }) => {
        seen.get = request.headers.get('X-CSRFToken')
        return HttpResponse.json({ status: 200, data: {} })
      }),
      http.post(`${v1}/auth/login`, ({ request }) => {
        seen.post = request.headers.get('X-CSRFToken')
        return HttpResponse.json({ status: 200, data: {} })
      }),
    )

    await client.request('GET', '/config')
    await client.request('POST', '/auth/login', { email: 'a@b.c' })

    expect(seen.get).toBeNull()
    expect(seen.post).toBe('tok-123')
  })

  it('resolves configured CSRF cookie names in priority order with fallback', async () => {
    const configuredClient = new AllauthClient({
      baseUrl: TEST_BASE_URL,
      csrfCookieNames: ['__Secure-csrftoken', 'csrftoken'],
    })
    const seen: Array<string | null> = []
    server.use(
      http.post(`${v1}/auth/login`, ({ request }) => {
        seen.push(request.headers.get('X-CSRFToken'))
        return HttpResponse.json({ status: 200, data: {} })
      }),
    )

    document.cookie = 'csrftoken=fallback-token; path=/'
    await configuredClient.request('POST', '/auth/login', {})

    document.cookie = '__Secure-csrftoken=secure-token; Secure; path=/'
    await configuredClient.request('POST', '/auth/login', {})

    clearCsrfCookies()
    await configuredClient.request('POST', '/auth/login', {})

    expect(seen).toEqual(['fallback-token', 'secure-token', null])
  })

  it('treats configured cookie names as literal values', async () => {
    const configuredClient = new AllauthClient({
      baseUrl: TEST_BASE_URL,
      csrfCookieNames: ['csrf.token'],
    })
    let seen: string | null = null
    server.use(
      http.post(`${v1}/auth/login`, ({ request }) => {
        seen = request.headers.get('X-CSRFToken')
        return HttpResponse.json({ status: 200, data: {} })
      }),
    )
    document.cookie = 'csrfXtoken=wrong-token'
    document.cookie = 'csrf.token=literal-token'

    await configuredClient.request('POST', '/auth/login', {})

    expect(seen).toBe('literal-token')
  })

  it('uses the configured CSRF cookie for provider redirect forms', () => {
    const configuredClient = new AllauthClient({
      baseUrl: TEST_BASE_URL,
      csrfCookieNames: ['__Secure-csrftoken', 'csrftoken'],
    })
    document.cookie = '__Secure-csrftoken=secure-token; Secure; path=/'
    const submit = vi
      .spyOn(HTMLFormElement.prototype, 'submit')
      .mockImplementation(() => {})

    configuredClient.redirectToProvider(
      'keycloak',
      'https://app.example.test/callback',
      'login',
    )

    const form = document.querySelector('form')
    expect(
      (
        form?.querySelector(
          '[name="csrfmiddlewaretoken"]',
        ) as HTMLInputElement | null
      )?.value,
    ).toBe('secure-token')
    submit.mockRestore()
    form?.remove()
  })

  it('only sets Content-Type when a body is sent', async () => {
    const seen: Record<string, string | null> = {}
    server.use(
      http.delete(`${v1}/auth/session`, ({ request }) => {
        seen.noBody = request.headers.get('Content-Type')
        return HttpResponse.json({ status: 200, data: {} })
      }),
      http.post(`${v1}/auth/login`, ({ request }) => {
        seen.body = request.headers.get('Content-Type')
        return HttpResponse.json({ status: 200, data: {} })
      }),
    )

    await client.request('DELETE', '/auth/session')
    await client.request('POST', '/auth/login', {})

    expect(seen.noBody).toBeNull()
    expect(seen.body).toBe('application/json')
  })

  it('wraps network failures in AllauthTransportError', async () => {
    server.use(http.get(`${v1}/config`, () => HttpResponse.error()))

    const failure = client.request('GET', '/config')
    await expect(failure).rejects.toBeInstanceOf(AllauthTransportError)
    await expect(failure).rejects.toMatchObject({ status: undefined })
  })

  it('wraps non-JSON replies in AllauthTransportError with the HTTP status', async () => {
    server.use(
      http.get(`${v1}/config`, () =>
        HttpResponse.text('<html>Bad gateway</html>', { status: 502 }),
      ),
    )

    await expect(client.request('GET', '/config')).rejects.toMatchObject({
      name: 'AllauthTransportError',
      status: 502,
    })
  })

  it('rejects JSON replies that are not an allauth envelope', async () => {
    server.use(
      http.get(`${v1}/config`, () =>
        HttpResponse.json({ detail: 'not allauth' }, { status: 200 }),
      ),
    )

    await expect(client.request('GET', '/config')).rejects.toMatchObject({
      name: 'AllauthTransportError',
      status: 200,
    })
  })

  it('returns well-formed envelopes untouched, even for error statuses', async () => {
    server.use(
      http.get(`${v1}/config`, () =>
        HttpResponse.json(
          { status: 400, errors: [{ message: 'bad', code: 'invalid' }] },
          { status: 400 },
        ),
      ),
    )

    const response = await client.request('GET', '/config')
    expect(response.status).toBe(400)
    expect(response.errors?.[0]?.code).toBe('invalid')
  })
})
