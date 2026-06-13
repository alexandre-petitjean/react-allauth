import { createContext } from 'react'
import type { ClientType } from './types'

/** Configuration shared with every hook through {@link AllauthProvider}. */
export interface AllauthContextValue {
  /** Base URL of the django-allauth server, e.g. `https://api.example.com`. */
  baseUrl: string
  /** Which headless endpoint family to use. */
  client: ClientType
}

export const AllauthContext = createContext<AllauthContextValue | null>(null)
