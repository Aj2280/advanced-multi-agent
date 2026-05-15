import React, { createContext, useContext } from 'react'
import { useWorkbench } from '../hooks/useWorkbench'

type WorkbenchValue = ReturnType<typeof useWorkbench>

const WorkbenchContext = createContext<WorkbenchValue | null>(null)

export function WorkbenchProvider({ children }: { children: React.ReactNode }) {
  const value = useWorkbench()
  return <WorkbenchContext.Provider value={value}>{children}</WorkbenchContext.Provider>
}

export function useWorkbenchContext(): WorkbenchValue {
  const ctx = useContext(WorkbenchContext)
  if (!ctx) {
    throw new Error('useWorkbenchContext must be used within WorkbenchProvider')
  }
  return ctx
}
