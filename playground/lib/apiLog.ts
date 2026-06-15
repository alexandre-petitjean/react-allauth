import { useSyncExternalStore } from 'react'

export interface ApiCall {
  id: number
  method: string
  /** Path after the base URL, e.g. `/auth/session`. */
  endpoint: string
  status: number
  response: unknown
  at: number
}

let calls: ApiCall[] = []
let nextId = 1
let installed = false
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

/**
 * Patch `window.fetch` once to record allauth API calls into the store. Network
 * failures (no response) are not recorded — there is no response to show.
 */
export function installFetchLogger(baseUrl: string) {
  if (installed || typeof window === 'undefined') return
  installed = true

  const original = window.fetch.bind(window)
  window.fetch = async (input, init) => {
    const response = await original(input, init)
    const url = requestUrl(input)
    if (url.includes('/_allauth/')) {
      const method = (
        init?.method ?? (input instanceof Request ? input.method : 'GET')
      ).toUpperCase()
      let body: unknown = null
      try {
        body = await response.clone().json()
      } catch {
        body = null
      }
      calls = [
        {
          id: nextId++,
          method,
          endpoint: url.replace(baseUrl, ''),
          status: response.status,
          response: body,
          at: Date.now(),
        },
        ...calls,
      ]
      emit()
    }
    return response
  }
}

export function clearCalls() {
  calls = []
  emit()
}

/** Recorded allauth calls, most recent first. */
export function useApiLog(): ApiCall[] {
  return useSyncExternalStore(subscribe, () => calls)
}
