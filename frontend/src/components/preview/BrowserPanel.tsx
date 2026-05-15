import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Monitor,
  RefreshCw,
  Smartphone,
  Tablet,
} from 'lucide-react'
import { previewUrl } from '../../lib/api'
import { Panel } from '../ui/Panel'
import { IconButton } from '../ui/IconButton'

type ViewportPreset = 'desktop' | 'tablet' | 'mobile'

const VIEWPORTS: { id: ViewportPreset; label: string; width: string; icon: typeof Monitor }[] = [
  { id: 'desktop', label: 'Desktop', width: '100%', icon: Monitor },
  { id: 'tablet', label: 'Tablet', width: '768px', icon: Tablet },
  { id: 'mobile', label: 'Mobile', width: '390px', icon: Smartphone },
]

function defaultPreviewPath(files: string[]): string {
  const candidates = ['index.html', 'dist/index.html', 'public/index.html']
  for (const c of candidates) {
    if (files.includes(c)) return c
  }
  const html = files.find((f) => f.endsWith('.html'))
  return html ?? 'index.html'
}

export function BrowserPanel({
  sessionId,
  files,
  refreshKey,
  onRefresh,
}: {
  sessionId: string
  files: string[]
  refreshKey: number
  onRefresh: () => void
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [previewPath, setPreviewPath] = useState(() => defaultPreviewPath(files))
  const [history, setHistory] = useState<string[]>([previewPath])
  const [historyIdx, setHistoryIdx] = useState(0)
  const [viewport, setViewport] = useState<ViewportPreset>('desktop')
  const [urlInput, setUrlInput] = useState(previewPath)

  const hasPreview = files.some(
    (f) => f.endsWith('.html') || f === 'index.html' || f.endsWith('/index.html'),
  )

  const navigate = useCallback((path: string) => {
    const clean = path.trim().replace(/^\//, '') || 'index.html'
    setPreviewPath(clean)
    setUrlInput(clean)
    setHistoryIdx((idx) => {
      setHistory((h) => [...h.slice(0, idx + 1), clean])
      return idx + 1
    })
  }, [])

  useEffect(() => {
    const next = defaultPreviewPath(files)
    setPreviewPath(next)
    setUrlInput(next)
    setHistory([next])
    setHistoryIdx(0)
  }, [sessionId])

  useEffect(() => {
    if (!files.length) return
    const next = defaultPreviewPath(files)
    setPreviewPath((p) => (files.includes(p) ? p : next))
    setUrlInput((u) => (files.includes(u) ? u : next))
  }, [files])

  const iframeSrc = useMemo(() => {
    if (!hasPreview) return ''
    return `${previewUrl(sessionId, previewPath)}?_=${refreshKey}`
  }, [hasPreview, previewPath, refreshKey, sessionId])

  const canBack = historyIdx > 0
  const canForward = historyIdx < history.length - 1

  const vp = VIEWPORTS.find((v) => v.id === viewport) ?? VIEWPORTS[0]

  const reload = () => {
    onRefresh()
    if (iframeRef.current && iframeSrc) {
      iframeRef.current.src = iframeSrc
    }
  }

  return (
    <Panel title="Browser" className="h-full">
      <div className="flex flex-col flex-1 min-h-0 border-b border-border bg-canvas/80">
        <div className="flex items-center gap-1 px-2 py-1.5 shrink-0 flex-wrap">
          <IconButton
            icon={ArrowLeft}
            label="Back"
            disabled={!canBack || !hasPreview}
            onClick={() => {
              if (!canBack) return
              const next = historyIdx - 1
              setHistoryIdx(next)
              const p = history[next]!
              setPreviewPath(p)
              setUrlInput(p)
            }}
          />
          <IconButton
            icon={ArrowRight}
            label="Forward"
            disabled={!canForward || !hasPreview}
            onClick={() => {
              if (!canForward) return
              const next = historyIdx + 1
              setHistoryIdx(next)
              const p = history[next]!
              setPreviewPath(p)
              setUrlInput(p)
            }}
          />
          <IconButton icon={RefreshCw} label="Reload" disabled={!hasPreview} onClick={reload} />
          <form
            className="flex-1 min-w-[120px] flex"
            onSubmit={(e) => {
              e.preventDefault()
              navigate(urlInput)
            }}
          >
            <input
              className="w-full rounded-md bg-surface border border-border px-2 py-1 text-[11px] font-mono text-zinc-300 focus:outline-none focus:ring-1 focus:ring-violet-500/40"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="index.html"
              spellCheck={false}
              disabled={!hasPreview}
            />
          </form>
          <div className="flex gap-0.5 shrink-0">
            {VIEWPORTS.map((v) => (
              <button
                key={v.id}
                type="button"
                title={v.label}
                onClick={() => setViewport(v.id)}
                className={[
                  'p-1.5 rounded-md transition-colors',
                  viewport === v.id
                    ? 'bg-violet-500/25 text-violet-200'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-surface-hover',
                ].join(' ')}
              >
                <v.icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
          {hasPreview && (
            <a href={previewUrl(sessionId, previewPath)} target="_blank" rel="noreferrer">
              <IconButton icon={ExternalLink} label="Open in new tab" />
            </a>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-[200px] bg-[#1a1a1e] flex items-start justify-center overflow-auto p-3 custom-scroll">
        {!hasPreview ? (
          <p className="text-xs text-zinc-600 text-center max-w-xs m-auto leading-relaxed">
            Generate a project with an <code className="text-zinc-500">index.html</code> (or run{' '}
            <span className="text-violet-400">Build</span>) to test it in the built-in browser.
          </p>
        ) : (
          <div
            className="h-full bg-white rounded-lg shadow-panel overflow-hidden border border-border transition-[width] duration-200"
            style={{ width: vp.width, maxWidth: '100%', minHeight: 'min(100%, 720px)' }}
          >
            <iframe
              ref={iframeRef}
              key={`${previewPath}-${refreshKey}`}
              title="Project browser"
              src={iframeSrc}
              className="w-full h-full min-h-[480px] border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        )}
      </div>
    </Panel>
  )
}
