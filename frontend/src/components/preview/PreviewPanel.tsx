import { ExternalLink, RefreshCw } from 'lucide-react'
import { previewUrl } from '../../lib/api'
import { Panel } from '../ui/Panel'
import { Button } from '../ui/Button'

export function PreviewPanel({
  sessionId,
  hasIndex,
  refreshKey,
  onRefresh,
}: {
  sessionId: string
  hasIndex: boolean
  refreshKey: number
  onRefresh: () => void
}) {
  const base = previewUrl(sessionId, 'index.html')
  const url = hasIndex ? `${base}&_=${refreshKey}` : ''

  return (
    <Panel
      title="Preview"
      action={
        <div className="flex gap-1">
          <Button variant="ghost" className="!p-1.5" onClick={onRefresh} disabled={!hasIndex}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          {hasIndex && (
            <a href={previewUrl(sessionId)} target="_blank" rel="noreferrer">
              <Button variant="ghost" className="!p-1.5">
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </a>
          )}
        </div>
      }
      className="h-full"
    >
      <div className="flex-1 min-h-[200px] bg-[#0a0a0c] relative">
        {!hasIndex ? (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
            <p className="text-xs text-zinc-600 leading-relaxed max-w-xs">
              Generate a project with an <code className="text-zinc-500">index.html</code> to see a
              live preview here.
            </p>
          </div>
        ) : (
          <iframe
            key={refreshKey}
            title="App preview"
            src={url}
            className="w-full h-full border-0 bg-white"
            sandbox="allow-scripts allow-same-origin"
          />
        )}
      </div>
    </Panel>
  )
}
