import { useCallback } from 'react'
import { useAllauthContext } from './useAllauthContext'
import { ensureOk } from '../errors'
import type {
  AuthFlowResponse,
  ChangePasswordInput,
  ConfirmPasswordResetInput,
} from '../types'

export interface UsePasswordResult {
  change(input: ChangePasswordInput): Promise<void>
  requestReset(email: string): Promise<void>
  confirmReset(input: ConfirmPasswordResetInput): Promise<AuthFlowResponse>
}

/** Password change and the reset-by-key flow. */
export function usePassword(): UsePasswordResult {
  const { client, applyResponse } = useAllauthContext()

  const change = useCallback(
    async (input: ChangePasswordInput) => {
      ensureOk(await client.changePassword(input))
    },
    [client],
  )

  const requestReset = useCallback(
    async (email: string) => {
      ensureOk(await client.requestPasswordReset(email))
    },
    [client],
  )

  const confirmReset = useCallback(
    async (input: ConfirmPasswordResetInput) =>
      applyResponse(await client.resetPassword(input)),
    [client, applyResponse],
  )

  return { change, requestReset, confirmReset }
}
