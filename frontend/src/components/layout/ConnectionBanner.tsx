import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '../ui/Button'
import type { ApiHealthState } from '../../lib/apiHealth'

export function ConnectionBanner({
  state,
  onRetry,
}: {
  state: ApiHealthState
  onRetry: () => void
}) {
  if (state === 'ok' || state === 'checking') return null

  return (
    <div
      className="shrink-0 border-b border-amber-500/40 bg-amber-950/40 px-4 py-3 flex flex-wrap items-center justify-between gap-3"
      role="alert"
    >
      <div className="flex items-start gap-2 min-w-0">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-sm min-w-0">
          <p className="font-medium text-amber-100">Backend API is not running</p>
          <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
            The page loaded, but actions need the workbench API. From the repo root run:{' '}
            <code className="text-amber-100 font-mono">./scripts/dev.sh</code>
            {' '}(starts API + UI). Or in two terminals:{' '}
            <code className="font-mono text-amber-100">ama-api</code> then{' '}
            <code className="font-mono text-amber-100">cd frontend && npm run dev</code>.
          </p>
        </div>
      </div>
      <Button variant="secondary" className="shrink-0 gap-1.5" onClick={onRetry}>
        <RefreshCw className="w-3.5 h-3.5" />
        Retry
      </Button>
    </div>
  )
}
