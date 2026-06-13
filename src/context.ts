import { createContext } from 'react'
import type { AllauthClient } from './client'
import type { AuthFlowResponse } from './types'

/** Value shared with every hook through {@link AllauthProvider}. */
export interface AllauthContextValue {
  /** Configured headless client. */
  client: AllauthClient
  /** Latest authentication/session response, or `null` while loading. */
  session: AuthFlowResponse | null
  /** Error from the initial session check, or `null`. */
  sessionError: Error | null
  /**
   * Feed an auth-flow response back into shared state. Responses that carry
   * session state (200/401/410) refresh the session; others are passed through
   * untouched. Returns the same response for convenient chaining.
   */
  applyResponse: (response: AuthFlowResponse) => AuthFlowResponse
}

export const AllauthContext = createContext<AllauthContextValue | null>(null)
