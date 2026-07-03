import { useCallback } from 'react'
import { startAuthentication, startRegistration } from '@simplewebauthn/browser'
import { useAllauthContext } from './useAllauthContext'
import { AllauthRequestError, ensureData, ensureOk } from '../errors'
import type {
  AuthFlowResponse,
  WebAuthnAuthenticator,
  WebAuthnFlow,
} from '../types'

export interface UseWebAuthnResult {
  /** Register a new passkey on the authenticated account. */
  register(name?: string): Promise<WebAuthnAuthenticator>
  /** Complete an MFA step using a passkey. */
  authenticate(): Promise<AuthFlowResponse>
  /** Log in using a passkey. */
  login(): Promise<AuthFlowResponse>
  /** Re-authenticate using a passkey. */
  reauthenticate(): Promise<AuthFlowResponse>
  /** Rename a registered passkey. */
  rename(id: number, name: string): Promise<WebAuthnAuthenticator>
  /** Remove registered passkeys. Refresh lists via `useMFA().reload()`. */
  remove(ids: number[]): Promise<void>
}

/** WebAuthn / passkey registration and authentication. */
export function useWebAuthn(): UseWebAuthnResult {
  const { client, applyResponse } = useAllauthContext()

  const register = useCallback(
    async (name?: string) => {
      const optionsResponse = await client.getWebAuthnCreationOptions()
      const publicKey = optionsResponse.data?.creation_options?.publicKey
      if (!publicKey) throw new AllauthRequestError(optionsResponse)

      const credential = await startRegistration({ optionsJSON: publicKey })
      return ensureData(await client.registerWebAuthn(name, credential))
    },
    [client],
  )

  const runCeremony = useCallback(
    async (flow: WebAuthnFlow) => {
      const optionsResponse = await client.getWebAuthnRequestOptions(flow)
      const publicKey = optionsResponse.data?.request_options?.publicKey
      if (!publicKey) throw new AllauthRequestError(optionsResponse)

      const credential = await startAuthentication({ optionsJSON: publicKey })
      return applyResponse(await client.postWebAuthnCredential(flow, credential))
    },
    [client, applyResponse],
  )

  const authenticate = useCallback(
    () => runCeremony('authenticate'),
    [runCeremony],
  )
  const login = useCallback(() => runCeremony('login'), [runCeremony])
  const reauthenticate = useCallback(
    () => runCeremony('reauthenticate'),
    [runCeremony],
  )

  const rename = useCallback(
    async (id: number, name: string) =>
      ensureData(await client.renameWebAuthn(id, name)),
    [client],
  )

  const remove = useCallback(
    async (ids: number[]) => {
      ensureOk(await client.removeWebAuthn(ids))
    },
    [client],
  )

  return { register, authenticate, login, reauthenticate, rename, remove }
}
