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
  add(email: string): Promise<void>
  remove(email: string): Promise<void>
  markPrimary(email: string): Promise<void>
  requestVerification(email: string): Promise<void>
  verify(key: string): Promise<AuthFlowResponse>
}

/** Manage the account's email addresses and verification. */
export function useEmails(): UseEmailsResult {
  const { client, applyResponse } = useAllauthContext()
  const fetcher = useCallback(
    () => client.getEmails().then((response) => ensureOk(response).data ?? []),
    [client],
  )
  const { data, loading, error, setData } = useResource(fetcher)

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

  return {
    emails: data ?? [],
    loading,
    error,
    add,
    remove,
    markPrimary,
    requestVerification,
    verify,
  }
}
