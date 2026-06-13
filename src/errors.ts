import type { AllauthError, AllauthResponse } from './types'

/**
 * Thrown by mutating hook methods that return `void` when the server responds
 * with an error (status >= 400). Carries the structured allauth errors so the
 * caller can inspect `error.errors` (and `param` per field).
 */
export class AllauthRequestError extends Error {
  readonly status: number
  readonly errors: AllauthError[]

  constructor(response: AllauthResponse) {
    const errors = response.errors ?? []
    super(errors[0]?.message ?? `Request failed with status ${response.status}`)
    this.name = 'AllauthRequestError'
    this.status = response.status
    this.errors = errors
  }
}

/** Throw {@link AllauthRequestError} on an error response; otherwise return it. */
export function ensureOk<T extends AllauthResponse>(response: T): T {
  if (response.status >= 400) throw new AllauthRequestError(response)
  return response
}
