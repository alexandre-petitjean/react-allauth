import { useCallback } from 'react'
import { useAllauthContext } from './useAllauthContext'
import { useResource } from './useResource'
import { AllauthRequestError, ensureData, ensureOk } from '../errors'
import type { Authenticator, TOTPAuthenticator, TOTPSetup } from '../types'

export interface UseMFAResult {
  /** Configured authenticators (TOTP, recovery codes, WebAuthn). */
  authenticators: Authenticator[]
  loading: boolean
  error: Error | null
  /** Fetch the TOTP secret + provisioning URI to display a QR code. */
  getTOTPSetup(): Promise<TOTPSetup>
  activateTOTP(code: string): Promise<TOTPAuthenticator>
  deactivateTOTP(): Promise<void>
  /** Regenerate recovery codes and return the new codes. */
  generateRecoveryCodes(): Promise<string[]>
  /** Return the still-unused recovery codes. */
  viewRecoveryCodes(): Promise<string[]>
}

/** Multi-factor authentication: TOTP and recovery codes. */
export function useMFA(): UseMFAResult {
  const { client } = useAllauthContext()
  const fetcher = useCallback(
    () =>
      client.getAuthenticators().then((response) => ensureOk(response).data ?? []),
    [client],
  )
  const { data, loading, error, reload } = useResource(fetcher)

  const getTOTPSetup = useCallback(async (): Promise<TOTPSetup> => {
    const response = await client.getTOTPStatus()
    const { secret, totp_url } = response.meta ?? {}
    if (!secret || !totp_url) throw new AllauthRequestError(response)
    return { secret, totp_url }
  }, [client])

  const activateTOTP = useCallback(
    async (code: string) => {
      const authenticator = ensureData(await client.activateTOTP(code))
      await reload()
      return authenticator
    },
    [client, reload],
  )

  const deactivateTOTP = useCallback(async () => {
    ensureOk(await client.deactivateTOTP())
    await reload()
  }, [client, reload])

  const generateRecoveryCodes = useCallback(async () => {
    const response = ensureOk(await client.regenerateRecoveryCodes())
    await reload()
    return response.data?.unused_codes ?? []
  }, [client, reload])

  const viewRecoveryCodes = useCallback(async () => {
    const response = ensureOk(await client.getRecoveryCodes())
    return response.data?.unused_codes ?? []
  }, [client])

  return {
    authenticators: data ?? [],
    loading,
    error,
    getTOTPSetup,
    activateTOTP,
    deactivateTOTP,
    generateRecoveryCodes,
    viewRecoveryCodes,
  }
}
