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
  throw new Error('not implemented')
}
