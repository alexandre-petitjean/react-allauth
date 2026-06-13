import type {
  AllauthResponse,
  AuthenticationData,
  AuthFlowResponse,
  ClientType,
  Config,
  LoginCredentials,
  ReauthenticateData,
  SignupData,
} from './types'

export interface AllauthClientOptions {
  /** Base URL of the django-allauth server. */
  baseUrl: string
  /** Headless endpoint family. */
  client: ClientType
}

/** Build the versioned headless endpoint prefix, e.g. `<base>/_allauth/browser/v1`. */
export function allauthV1Url(baseUrl: string, client: ClientType): string {
  return `${baseUrl}/_allauth/${client}/v1`
}

/** Read a cookie value by name from `document.cookie`. */
function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name}=([^;]*)`),
  )
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * Thin fetch wrapper around the django-allauth headless API. Sends cookies and
 * wires the CSRF token for browser clients; every reply is the allauth envelope.
 */
export class AllauthClient {
  private readonly options: AllauthClientOptions

  constructor(options: AllauthClientOptions) {
    this.options = options
  }

  private endpoint(path: string): string {
    const { baseUrl, client } = this.options
    return `${allauthV1Url(baseUrl, client)}${path}`
  }

  async request<TData = AuthenticationData>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<AllauthResponse<TData>> {
    const headers: Record<string, string> = {}
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    if (method !== 'GET' && this.options.client === 'browser') {
      const csrfToken = readCookie('csrftoken')
      if (csrfToken) headers['X-CSRFToken'] = csrfToken
    }

    const response = await fetch(this.endpoint(path), {
      method,
      headers,
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    })

    return (await response.json()) as AllauthResponse<TData>
  }

  getSession(): Promise<AuthFlowResponse> {
    return this.request('GET', '/auth/session')
  }

  login(credentials: LoginCredentials): Promise<AuthFlowResponse> {
    return this.request('POST', '/auth/login', credentials)
  }

  signup(data: SignupData): Promise<AuthFlowResponse> {
    return this.request('POST', '/auth/signup', data)
  }

  logout(): Promise<AuthFlowResponse> {
    return this.request('DELETE', '/auth/session')
  }

  reauthenticate(data: ReauthenticateData): Promise<AuthFlowResponse> {
    return this.request('POST', '/auth/reauthenticate', data)
  }

  getConfig(): Promise<AllauthResponse<Config>> {
    return this.request<Config>('GET', '/config')
  }
}
