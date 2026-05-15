import { useEffect } from 'react'
import { ApiHealthProvider, useApiHealthContext } from './context/ApiHealthContext'
import { WorkbenchProvider, useWorkbenchContext } from './context/WorkbenchContext'
import { ConnectionBanner } from './components/layout/ConnectionBanner'
import { WorkbenchLayout } from './components/layout/WorkbenchLayout'

function WorkbenchRoot() {
  const wb = useWorkbenchContext()
  const health = useApiHealthContext()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        void wb.saveFile()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        if (wb.sessionId && !wb.busy) void wb.runSwarm()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [wb.busy, wb.runSwarm, wb.saveFile, wb.sessionId])

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <ConnectionBanner state={health.state} onRetry={() => void health.refresh()} />
      <WorkbenchLayout apiOk={health.apiOk} apiChecking={health.state === 'checking'} />
    </div>
  )
}

export default function WorkbenchApp() {
  return (
    <ApiHealthProvider>
      <WorkbenchProvider>
        <WorkbenchRoot />
      </WorkbenchProvider>
    </ApiHealthProvider>
  )
}
