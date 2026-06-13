import type { AuthFlowResponse } from '../types'

export interface ChangePasswordInput {
  current_password: string
  new_password: string
}

export interface ConfirmPasswordResetInput {
  key: string
  password: string
}

export interface UsePasswordResult {
  change(input: ChangePasswordInput): Promise<void>
  requestReset(email: string): Promise<void>
  confirmReset(input: ConfirmPasswordResetInput): Promise<AuthFlowResponse>
}

/** Password change and the reset-by-key flow. */
export function usePassword(): UsePasswordResult {
  throw new Error('not implemented')
}
