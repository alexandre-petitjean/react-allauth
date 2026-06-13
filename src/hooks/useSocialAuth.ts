import { useCallback } from 'react'
import { useAllauthContext } from './useAllauthContext'
import { useResource } from './useResource'
import { ensureOk } from '../errors'
import type {
  AuthFlowResponse,
  AuthProcess,
  ProviderAccount,
  ProviderToken,
  SignupData,
} from '../types'

export interface UseSocialAuthResult {
  /** Third-party accounts connected to the user. */
  connections: ProviderAccount[]
  /** Navigate to the provider's redirect (OAuth) flow. */
  redirectToProvider(
    providerId: string,
    callbackUrl: string,
    process?: AuthProcess,
  ): void
  /** Authenticate by handing over a token retrieved elsewhere. */
  authenticateByToken(
    providerId: string,
    token: ProviderToken,
    process?: AuthProcess,
  ): Promise<AuthFlowResponse>
  /** Complete a pending provider signup. */
  providerSignup(data: SignupData): Promise<AuthFlowResponse>
  /** Disconnect a connected provider account. */
  disconnect(account: ProviderAccount): Promise<void>
}

/** Third-party (social) authentication and connected accounts. */
export function useSocialAuth(): UseSocialAuthResult {
  const { client, applyResponse } = useAllauthContext()
  const fetcher = useCallback(
    () => client.getProviders().then((response) => response.data ?? []),
    [client],
  )
  const { data, reload } = useResource(fetcher)

  const redirectToProvider = useCallback(
    (providerId: string, callbackUrl: string, process: AuthProcess = 'login') => {
      client.redirectToProvider(providerId, callbackUrl, process)
    },
    [client],
  )

  const authenticateByToken = useCallback(
    async (
      providerId: string,
      token: ProviderToken,
      process: AuthProcess = 'login',
    ) => applyResponse(await client.providerToken(providerId, token, process)),
    [client, applyResponse],
  )

  const providerSignup = useCallback(
    async (data: SignupData) => applyResponse(await client.providerSignup(data)),
    [client, applyResponse],
  )

  const disconnect = useCallback(
    async (account: ProviderAccount) => {
      ensureOk(await client.disconnectProvider(account.provider.id, account.uid))
      await reload()
    },
    [client, reload],
  )

  return {
    connections: data ?? [],
    redirectToProvider,
    authenticateByToken,
    providerSignup,
    disconnect,
  }
}
