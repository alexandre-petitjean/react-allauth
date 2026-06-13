// Public type contract for the react-allauth library.
//
// These mirror the django-allauth *headless* browser API. Every server reply is
// wrapped in a common envelope (`status` / `data` / `meta` / `errors`), and
// authentication is modelled as a flow that may require several steps before the
// user becomes authenticated.
//
// Reference: https://docs.allauth.org/en/latest/headless/
//
// This library targets the browser client only (cookie + CSRF based). The `app`
// client family (X-Session-Token) is intentionally not supported.

// ---------------------------------------------------------------------------
// Response envelope
// ---------------------------------------------------------------------------

/** Common envelope wrapping every headless response. */
export interface AllauthResponse<TData = unknown> {
  status: number
  data?: TData
  meta?: ResponseMeta
  errors?: AllauthError[]
}

export interface ResponseMeta {
  /** Whether the session is authenticated (or, on a 401, needs re-auth). */
  is_authenticated: boolean
  /** TOTP setup secret, present on the 404 from the TOTP status endpoint. */
  secret?: string
  /** TOTP provisioning URI, present alongside `secret` during setup. */
  totp_url?: string
}

/** A single validation or business error returned by the API. */
export interface AllauthError {
  message: string
  code: string
  /** Form field the error applies to, when relevant. */
  param?: string
}

// ---------------------------------------------------------------------------
// User & session
// ---------------------------------------------------------------------------

export interface User {
  id: number | string
  display: string
  email?: string
  username?: string
  has_usable_password?: boolean
}

/** How the current session was authenticated. */
export interface AuthenticationMethod {
  method: 'password' | 'code' | 'socialaccount' | 'mfa' | 'reauthenticate'
  at: number
  email?: string
  username?: string
  provider?: string
  reauthenticated?: boolean
}

/** `data` payload of authentication-related responses. */
export interface AuthenticationData {
  user?: User
  methods?: AuthenticationMethod[]
  flows?: Flow[]
}

/** Envelope returned by every flow-advancing call (login, signup, verify...). */
export type AuthFlowResponse = AllauthResponse<AuthenticationData>

// ---------------------------------------------------------------------------
// Flow state machine
// ---------------------------------------------------------------------------

/** Every flow the headless API can advertise or require. */
export type FlowId =
  | 'login'
  | 'login_by_code'
  | 'signup'
  | 'verify_email'
  | 'phone_verify'
  | 'provider_redirect'
  | 'provider_token'
  | 'provider_signup'
  | 'mfa_authenticate'
  | 'mfa_login_webauthn'
  | 'mfa_signup_webauthn'
  | 'mfa_trust'
  | 'reauthenticate'
  | 'mfa_reauthenticate'

/** A flow advertised by the server, optionally pending completion. */
export interface Flow {
  id: FlowId
  /** Provider ids, for `provider_redirect` / `provider_token`. */
  providers?: string[]
  /** Authenticator types, for `mfa_authenticate`. */
  types?: AuthenticatorType[]
  /** True when this flow is the next required step. */
  is_pending?: boolean
}

/** High-level authentication status derived from the envelope. */
export type AuthStatus =
  | 'loading'
  | 'authenticated'
  | 'unauthenticated'
  | 'reauthentication_required'

/**
 * Resolved view of the authentication flow machine: the step the user is
 * currently expected to complete, plus every pending step behind it.
 */
export interface FlowState {
  /** The next step to complete, or `null` when none is required. */
  current: Flow | null
  /** All steps still pending before the user is fully authenticated. */
  pending: Flow[]
}

// ---------------------------------------------------------------------------
// Credentials & flow inputs
// ---------------------------------------------------------------------------

export interface LoginCredentials {
  email?: string
  username?: string
  password: string
}

export interface SignupData {
  email: string
  username?: string
  password: string
}

export interface ReauthenticateData {
  password: string
}

export interface ChangePasswordInput {
  current_password: string
  new_password: string
}

export interface ConfirmPasswordResetInput {
  key: string
  password: string
}

/** OAuth handshake processing intent. */
export type AuthProcess = 'login' | 'connect'

/** Third-party token handed over for the `provider_token` flow. */
export interface ProviderToken {
  client_id: string
  id_token?: string
  access_token?: string
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface Config {
  account: {
    authentication_method: 'email' | 'username' | 'username_email'
    login_methods?: string[]
    is_open_for_signup: boolean
    email_verification_by_code_enabled?: boolean
    login_by_code_enabled?: boolean
    password_reset_by_code_enabled?: boolean
  }
  socialaccount?: {
    providers: ProviderConfig[]
  }
  mfa?: {
    supported_types: AuthenticatorType[]
    passkey_login_enabled?: boolean
  }
  usersessions?: {
    track_activity: boolean
  }
}

export interface ProviderConfig {
  id: string
  name: string
  flows: FlowId[]
  client_id?: string
}

// ---------------------------------------------------------------------------
// Email management
// ---------------------------------------------------------------------------

export interface EmailAddress {
  email: string
  verified: boolean
  primary: boolean
}

// ---------------------------------------------------------------------------
// MFA / authenticators
// ---------------------------------------------------------------------------

export type AuthenticatorType = 'totp' | 'recovery_codes' | 'webauthn'

/** Fields shared by every authenticator. */
export interface BaseAuthenticator {
  last_used_at: number | null
  created_at: number
}

export interface TOTPAuthenticator extends BaseAuthenticator {
  type: 'totp'
}

export interface RecoveryCodesAuthenticator extends BaseAuthenticator {
  type: 'recovery_codes'
  total_code_count: number
  unused_code_count: number
}

export interface WebAuthnAuthenticator extends BaseAuthenticator {
  type: 'webauthn'
  id: number
  name: string
}

/** WebAuthn ceremonies that complete an authentication flow. */
export type WebAuthnFlow = 'authenticate' | 'login' | 'reauthenticate'

/** Recovery codes authenticator including the still-unused codes themselves. */
export interface SensitiveRecoveryCodesAuthenticator
  extends RecoveryCodesAuthenticator {
  unused_codes: string[]
}

export type Authenticator =
  | TOTPAuthenticator
  | RecoveryCodesAuthenticator
  | WebAuthnAuthenticator

/** TOTP secret + provisioning URI returned when starting TOTP setup. */
export interface TOTPSetup {
  secret: string
  totp_url: string
}

// ---------------------------------------------------------------------------
// Social accounts
// ---------------------------------------------------------------------------

export interface ProviderAccount {
  uid: string
  display: string
  provider: ProviderConfig
}

// ---------------------------------------------------------------------------
// User sessions
// ---------------------------------------------------------------------------

export interface UserSession {
  id: number
  user_agent: string
  ip: string
  created_at: number
  last_seen_at: number | null
  is_current: boolean
}
