import { useContext } from 'react'
import { AllauthContext, type AllauthContextValue } from '../context'

/** Access the allauth context, with a clear error when the provider is missing. */
export function useAllauthContext(): AllauthContextValue {
  const context = useContext(AllauthContext)
  if (!context) {
    throw new Error('react-allauth hooks must be used within <AllauthProvider>')
  }
  return context
}
