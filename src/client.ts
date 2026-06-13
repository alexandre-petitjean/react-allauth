import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/browser'
import type {
  AllauthResponse,
  AuthenticationData,
  Authenticator,
  AuthFlowResponse,
  AuthProcess,
  ChangePasswordInput,
  ClientType,
  Config,
  ConfirmPasswordResetInput,
  EmailAddress,
  LoginCredentials,
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
    const csrfToken = readCookie('csrftoken')
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
}
