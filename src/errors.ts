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

/**
 * Thrown when a request never produced a valid allauth envelope: network
 * failure, non-JSON body (HTML error page, empty response), or gateway error.
 * Distinct from {@link AllauthRequestError}, which represents a well-formed
 * error response from the API.
 */
export class AllauthTransportError extends Error {
  /** HTTP status, when a response was received. */
  readonly status?: number

  constructor(message: string, options?: { cause?: unknown; status?: number }) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause })
    this.name = 'AllauthTransportError'
    this.status = options?.status
  }
}

/** Normalize an unknown thrown value into an `Error`. */
export function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value))
}

/** Throw {@link AllauthRequestError} on an error response; otherwise return it. */
export function ensureOk<T extends AllauthResponse>(response: T): T {
  if (response.status >= 400) throw new AllauthRequestError(response)
  return response
}

/** Return the response `data`, throwing when the response failed or carried none. */
export function ensureData<TData>(
  response: AllauthResponse<TData>,
): NonNullable<TData> {
  ensureOk(response)
  if (response.data == null) throw new AllauthRequestError(response)
  return response.data
}
