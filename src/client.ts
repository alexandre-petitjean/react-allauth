import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/browser'
import { AllauthTransportError } from './errors'
import type {
  AllauthResponse,
  AuthenticationData,
  Authenticator,
  AuthFlowResponse,
  AuthProcess,
  ChangePasswordInput,
  Config,
  ConfirmPasswordResetInput,
  EmailAddress,
  LoginCredentials,
  PasskeySignupData,
  ProviderAccount,
  ProviderToken,
  ReauthenticateData,
  SensitiveRecoveryCodesAuthenticator,
  SignupData,
  TOTPAuthenticator,
  UserSession,
  WebAuthnAuthenticator,
  WebAuthnFlow,
} from './types'

interface WebAuthnCreationOptions {
  creation_options: { publicKey: PublicKeyCredentialCreationOptionsJSON }
}

interface WebAuthnRequestOptions {
  request_options: { publicKey: PublicKeyCredentialRequestOptionsJSON }
}

export interface AllauthClientOptions {
  /** Base URL of the django-allauth server. */
  baseUrl: string
  /**
   * Ordered cookie names to inspect for the browser CSRF token. The first
   * non-empty cookie wins. Defaults to Django's `csrftoken`.
   */
  csrfCookieNames?: readonly string[]
}

const DEFAULT_CSRF_COOKIE_NAMES = ['csrftoken'] as const

/** Build the versioned browser endpoint prefix, e.g. `<base>/_allauth/browser/v1`. */
export function allauthV1Url(baseUrl: string): string {
  return `${baseUrl}/_allauth/browser/v1`
}

/** Read a cookie value by name from `document.cookie`. */
function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const prefix = `${name}=`
  for (const cookie of document.cookie.split(';')) {
    const trimmed = cookie.trim()
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length))
    }
  }
  return null
}

/**
 * Thin fetch wrapper around the django-allauth headless API. Sends cookies and
 * wires the CSRF token for browser clients; every reply is the allauth envelope.
 */
export class AllauthClient {
  private readonly options: AllauthClientOptions
  private readonly csrfCookieNames: readonly string[]

  constructor(options: AllauthClientOptions) {
    this.options = options
    this.csrfCookieNames = options.csrfCookieNames
      ? [...options.csrfCookieNames]
      : DEFAULT_CSRF_COOKIE_NAMES
  }

  private endpoint(path: string): string {
    return `${allauthV1Url(this.options.baseUrl)}${path}`
  }

  private readCsrfToken(): string | null {
    for (const cookieName of this.csrfCookieNames) {
      const token = readCookie(cookieName)
      if (token) return token
    }
    return null
  }

  async request<TData = AuthenticationData>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<AllauthResponse<TData>> {
    const headers: Record<string, string> = {}
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    if (method !== 'GET') {
      const csrfToken = this.readCsrfToken()
      if (csrfToken) headers['X-CSRFToken'] = csrfToken
    }

    let response: Response
    try {
      response = await fetch(this.endpoint(path), {
        method,
        headers,
        credentials: 'include',
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch (cause) {
      throw new AllauthTransportError(
        'Network request to the allauth server failed',
        { cause },
      )
    }

    let payload: unknown
    try {
      payload = await response.json()
    } catch (cause) {
      throw new AllauthTransportError(
        `Expected a JSON allauth response (status ${response.status})`,
        { cause, status: response.status },
      )
    }

    if (
      typeof payload !== 'object' ||
      payload === null ||
      typeof (payload as { status?: unknown }).status !== 'number'
    ) {
      throw new AllauthTransportError(
        `Malformed allauth response: missing numeric "status" (HTTP ${response.status})`,
        { status: response.status },
      )
    }

    return payload as AllauthResponse<TData>
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

  requestLoginCode(email: string): Promise<AuthFlowResponse> {
    return this.request('POST', '/auth/code/request', { email })
  }

  confirmLoginCode(code: string): Promise<AuthFlowResponse> {
    return this.request('POST', '/auth/code/confirm', { code })
  }

  resendLoginCode(): Promise<AllauthResponse> {
    return this.request('POST', '/auth/code/resend')
  }

  getConfig(): Promise<AllauthResponse<Config>> {
    return this.request<Config>('GET', '/config')
  }

  getSessions(): Promise<AllauthResponse<UserSession[]>> {
    return this.request<UserSession[]>('GET', '/auth/sessions')
  }

  endSessions(sessionIds: number[]): Promise<AllauthResponse<UserSession[]>> {
    return this.request<UserSession[]>('DELETE', '/auth/sessions', {
      sessions: sessionIds,
    })
  }

  changePassword(input: ChangePasswordInput): Promise<AllauthResponse> {
    return this.request('POST', '/account/password/change', input)
  }

  requestPasswordReset(email: string): Promise<AllauthResponse> {
    return this.request('POST', '/auth/password/request', { email })
  }

  resetPassword(input: ConfirmPasswordResetInput): Promise<AuthFlowResponse> {
    return this.request('POST', '/auth/password/reset', input)
  }

  getEmails(): Promise<AllauthResponse<EmailAddress[]>> {
    return this.request<EmailAddress[]>('GET', '/account/email')
  }

  addEmail(email: string): Promise<AllauthResponse<EmailAddress[]>> {
    return this.request<EmailAddress[]>('POST', '/account/email', { email })
  }

  removeEmail(email: string): Promise<AllauthResponse<EmailAddress[]>> {
    return this.request<EmailAddress[]>('DELETE', '/account/email', { email })
  }

  markEmailPrimary(email: string): Promise<AllauthResponse<EmailAddress[]>> {
    return this.request<EmailAddress[]>('PATCH', '/account/email', {
      email,
      primary: true,
    })
  }

  requestEmailVerification(email: string): Promise<AllauthResponse> {
    return this.request('PUT', '/account/email', { email })
  }

  verifyEmail(key: string): Promise<AuthFlowResponse> {
    return this.request('POST', '/auth/email/verify', { key })
  }

  resendVerificationEmail(): Promise<AllauthResponse> {
    return this.request('POST', '/auth/email/verify/resend')
  }

  getAuthenticators(): Promise<AllauthResponse<Authenticator[]>> {
    return this.request<Authenticator[]>('GET', '/account/authenticators')
  }

  // GET returns 404 with `meta.secret` / `meta.totp_url` when TOTP is not set up.
  getTOTPStatus(): Promise<AllauthResponse<TOTPAuthenticator>> {
    return this.request<TOTPAuthenticator>('GET', '/account/authenticators/totp')
  }

  activateTOTP(code: string): Promise<AllauthResponse<TOTPAuthenticator>> {
    return this.request<TOTPAuthenticator>(
      'POST',
      '/account/authenticators/totp',
      { code },
    )
  }

  deactivateTOTP(): Promise<AllauthResponse> {
    return this.request('DELETE', '/account/authenticators/totp')
  }

  getRecoveryCodes(): Promise<AllauthResponse<SensitiveRecoveryCodesAuthenticator>> {
    return this.request<SensitiveRecoveryCodesAuthenticator>(
      'GET',
      '/account/authenticators/recovery-codes',
    )
  }

  regenerateRecoveryCodes(): Promise<
    AllauthResponse<SensitiveRecoveryCodesAuthenticator>
  > {
    return this.request<SensitiveRecoveryCodesAuthenticator>(
      'POST',
      '/account/authenticators/recovery-codes',
    )
  }

  mfaAuthenticate(code: string): Promise<AuthFlowResponse> {
    return this.request('POST', '/auth/2fa/authenticate', { code })
  }

  mfaReauthenticate(code: string): Promise<AuthFlowResponse> {
    return this.request('POST', '/auth/2fa/reauthenticate', { code })
  }

  getProviders(): Promise<AllauthResponse<ProviderAccount[]>> {
    return this.request<ProviderAccount[]>('GET', '/account/providers')
  }

  disconnectProvider(
    provider: string,
    account: string,
  ): Promise<AllauthResponse<ProviderAccount[]>> {
    return this.request<ProviderAccount[]>('DELETE', '/account/providers', {
      provider,
      account,
    })
  }

  providerToken(
    provider: string,
    token: ProviderToken,
    process: AuthProcess,
  ): Promise<AuthFlowResponse> {
    return this.request('POST', '/auth/provider/token', {
      provider,
      token,
      process,
    })
  }

  providerSignup(data: SignupData): Promise<AuthFlowResponse> {
    return this.request('POST', '/auth/provider/signup', data)
  }

  // A full-page form POST: the browser follows the provider's OAuth redirect.
  redirectToProvider(
    providerId: string,
    callbackUrl: string,
    process: AuthProcess,
  ): void {
    if (typeof document === 'undefined') {
      throw new Error('redirectToProvider requires a browser environment')
    }
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = this.endpoint('/auth/provider/redirect')

    const fields: Record<string, string> = {
      provider: providerId,
      callback_url: callbackUrl,
      process,
    }
    const csrfToken = this.readCsrfToken()
    if (csrfToken) fields.csrfmiddlewaretoken = csrfToken

    for (const [name, value] of Object.entries(fields)) {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = name
      input.value = value
      form.appendChild(input)
    }

    document.body.appendChild(form)
    form.submit()
  }

  getWebAuthnCreationOptions(): Promise<AllauthResponse<WebAuthnCreationOptions>> {
    return this.request<WebAuthnCreationOptions>(
      'GET',
      '/account/authenticators/webauthn',
    )
  }

  registerWebAuthn(
    name: string | undefined,
    credential: RegistrationResponseJSON,
  ): Promise<AllauthResponse<WebAuthnAuthenticator>> {
    return this.request<WebAuthnAuthenticator>(
      'POST',
      '/account/authenticators/webauthn',
      { name, credential },
    )
  }

  renameWebAuthn(
    id: number,
    name: string,
  ): Promise<AllauthResponse<WebAuthnAuthenticator>> {
    return this.request<WebAuthnAuthenticator>(
      'PUT',
      '/account/authenticators/webauthn',
      { id, name },
    )
  }

  removeWebAuthn(ids: number[]): Promise<AllauthResponse> {
    return this.request('DELETE', '/account/authenticators/webauthn', {
      authenticators: ids,
    })
  }

  getWebAuthnRequestOptions(
    flow: WebAuthnFlow,
  ): Promise<AllauthResponse<WebAuthnRequestOptions>> {
    return this.request<WebAuthnRequestOptions>('GET', `/auth/webauthn/${flow}`)
  }

  postWebAuthnCredential(
    flow: WebAuthnFlow,
    credential: AuthenticationResponseJSON,
  ): Promise<AuthFlowResponse> {
    return this.request('POST', `/auth/webauthn/${flow}`, { credential })
  }

  signupWebAuthn(data: PasskeySignupData): Promise<AuthFlowResponse> {
    return this.request('POST', '/auth/webauthn/signup', data)
  }

  getWebAuthnSignupOptions(): Promise<AllauthResponse<WebAuthnCreationOptions>> {
    return this.request<WebAuthnCreationOptions>('GET', '/auth/webauthn/signup')
  }

  completeWebAuthnSignup(
    name: string | undefined,
    credential: RegistrationResponseJSON,
  ): Promise<AuthFlowResponse> {
    return this.request('PUT', '/auth/webauthn/signup', { name, credential })
  }
}
