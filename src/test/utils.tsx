import type { ReactNode } from 'react'
import { AllauthProvider } from '../AllauthProvider'
import { TEST_BASE_URL } from './handlers'

/** Wrap a hook under test in a configured `AllauthProvider`. */
export function wrapper({ children }: { children: ReactNode }) {
  return <AllauthProvider baseUrl={TEST_BASE_URL}>{children}</AllauthProvider>
}
