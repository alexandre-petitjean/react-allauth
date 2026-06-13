import { useCallback } from 'react'
import { useAllauthContext } from './useAllauthContext'
import { useResource } from './useResource'
import { ensureOk } from '../errors'
import type { AuthFlowResponse, EmailAddress } from '../types'

export interface UseEmailsResult {
  /** Email addresses on the account. */
  emails: EmailAddress[]
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
    () => client.getEmails().then((response) => response.data ?? []),
    [client],
  )
  const { data, reload } = useResource(fetcher)

  const add = useCallback(
    async (email: string) => {
      ensureOk(await client.addEmail(email))
      await reload()
    },
    [client, reload],
  )

  const remove = useCallback(
    async (email: string) => {
      ensureOk(await client.removeEmail(email))
      await reload()
    },
    [client, reload],
  )

  const markPrimary = useCallback(
    async (email: string) => {
      ensureOk(await client.markEmailPrimary(email))
      await reload()
    },
    [client, reload],
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
    add,
    remove,
    markPrimary,
    requestVerification,
    verify,
  }
}
