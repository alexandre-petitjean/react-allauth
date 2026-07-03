import { useCallback } from 'react'
import { useAllauthContext } from './useAllauthContext'
import { useResource } from './useResource'
import { ensureOk } from '../errors'
import type { AuthFlowResponse, EmailAddress } from '../types'

export interface UseEmailsResult {
  /** Email addresses on the account. */
  emails: EmailAddress[]
  loading: boolean
  error: Error | null
  /** Refetch the email list. */
  reload(): Promise<void>
  add(email: string): Promise<void>
  remove(email: string): Promise<void>
  markPrimary(email: string): Promise<void>
  requestVerification(email: string): Promise<void>
  verify(key: string): Promise<AuthFlowResponse>
  /**
   * Resend the verification email of the pending signup flow. Unlike
   * `requestVerification`, this needs no authenticated session. Throws when
   * nothing is pending or the resend is rate limited.
   */
  resendVerification(): Promise<void>
}

/** Manage the account's email addresses and verification. */
export function useEmails(): UseEmailsResult {
  const { client, session, applyResponse } = useAllauthContext()
  const isAuthenticated = session?.meta?.is_authenticated ?? false
  const fetcher = useCallback(
    () =>
      isAuthenticated
        ? client.getEmails().then((response) => ensureOk(response).data ?? [])
        : Promise.resolve<EmailAddress[]>([]),
    [client, isAuthenticated],
  )
  const { data, loading, error, reload, setData } = useResource(fetcher)

  const add = useCallback(
    async (email: string) => {
      setData(ensureOk(await client.addEmail(email)).data ?? [])
    },
    [client, setData],
  )

  const remove = useCallback(
    async (email: string) => {
      setData(ensureOk(await client.removeEmail(email)).data ?? [])
    },
    [client, setData],
  )

  const markPrimary = useCallback(
    async (email: string) => {
      setData(ensureOk(await client.markEmailPrimary(email)).data ?? [])
    },
    [client, setData],
  )

  const requestVerification = useCallback(
    async (email: string) => {
      ensureOk(await client.requestEmailVerification(email))
    },
    [client],
  )

  const verify = useCallback(
    async (key: string) => applyResponse(await client.verifyEmail(key)),
    [client, applyResponse],
  )

  // The resend reply is a bare 200 without session payload: applying it would
  // clobber the pending-flow state, so this is a mutation, not a flow method.
  const resendVerification = useCallback(async () => {
    ensureOk(await client.resendVerificationEmail())
  }, [client])

  return {
    emails: data ?? [],
    loading,
    error,
    reload,
    add,
    remove,
    markPrimary,
    requestVerification,
    verify,
    resendVerification,
  }
}
