import { useEffect } from 'react'
import { WorkbenchProvider, useWorkbenchContext } from './context/WorkbenchContext'
import { WorkbenchLayout } from './components/layout/WorkbenchLayout'

function WorkbenchRoot() {
  const wb = useWorkbenchContext()

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

  return <WorkbenchLayout />
}

export default function WorkbenchApp() {
  return (
    <WorkbenchProvider>
      <WorkbenchRoot />
    </WorkbenchProvider>
  )
}
