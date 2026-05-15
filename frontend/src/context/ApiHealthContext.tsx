import React, { createContext, useContext } from 'react'
import { useApiHealth } from '../hooks/useApiHealth'

type ApiHealthValue = ReturnType<typeof useApiHealth>

const ApiHealthContext = createContext<ApiHealthValue | null>(null)

export function ApiHealthProvider({ children }: { children: React.ReactNode }) {
  const value = useApiHealth()
  return <ApiHealthContext.Provider value={value}>{children}</ApiHealthContext.Provider>
}

export function useApiHealthContext(): ApiHealthValue {
  const ctx = useContext(ApiHealthContext)
  if (!ctx) throw new Error('useApiHealthContext must be used within ApiHealthProvider')
  return ctx
}
