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
import { AddressBar } from '../ui/AddressBar'
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

  const htmlFiles = useMemo(() => files.filter((f) => f.endsWith('.html')), [files])

  const hasPreview = htmlFiles.length > 0

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
    if (iframeRef.current && iframeSrc) iframeRef.current.src = iframeSrc
  }

  const goBack = () => {
    if (!canBack) return
    const next = historyIdx - 1
    const p = history[next]!
    setHistoryIdx(next)
    setPreviewPath(p)
    setUrlInput(p)
  }

  const goForward = () => {
    if (!canForward) return
    const next = historyIdx + 1
    const p = history[next]!
    setHistoryIdx(next)
    setPreviewPath(p)
    setUrlInput(p)
  }

  return (
    <section className="flex flex-col h-full min-h-0 rounded-xl border border-border bg-surface/80 backdrop-blur-sm overflow-hidden">
      {/* Single toolbar row — no wrap */}
      <div className="shrink-0 flex items-center gap-2 px-2 py-2 border-b border-border bg-surface-elevated/80">
        <div className="flex items-center gap-0.5 shrink-0">
          <IconButton icon={ArrowLeft} label="Back" disabled={!canBack || !hasPreview} onClick={goBack} />
          <IconButton
            icon={ArrowRight}
            label="Forward"
            disabled={!canForward || !hasPreview}
            onClick={goForward}
          />
          <IconButton icon={RefreshCw} label="Reload" disabled={!hasPreview} onClick={reload} />
        </div>

        <AddressBar
          value={urlInput}
          onChange={setUrlInput}
          onSubmit={() => navigate(urlInput)}
          disabled={!hasPreview}
        />

        <div className="flex items-center gap-0.5 shrink-0 rounded-lg border border-border bg-canvas/60 p-0.5">
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
          <a
            href={previewUrl(sessionId, previewPath)}
            target="_blank"
            rel="noreferrer"
            className="shrink-0"
            title="Open in new tab"
          >
            <IconButton icon={ExternalLink} label="Open in new tab" />
          </a>
        )}
      </div>

      {htmlFiles.length > 1 && (
        <div className="shrink-0 flex gap-1 px-2 py-1.5 border-b border-border/50 overflow-x-auto custom-scroll">
          {htmlFiles.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => navigate(f)}
              className={[
                'shrink-0 rounded-md px-2 py-0.5 text-[10px] font-mono transition-colors',
                previewPath === f
                  ? 'bg-violet-500/20 text-violet-200 border border-violet-500/30'
                  : 'text-zinc-500 hover:text-zinc-300 border border-transparent hover:bg-surface-hover',
              ].join(' ')}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 min-h-0 bg-[#141418] flex items-start justify-center overflow-auto p-4 custom-scroll">
        {!hasPreview ? (
          <p className="text-sm text-zinc-500 text-center max-w-sm m-auto leading-relaxed px-4">
            Generate a project with <code className="text-violet-400 font-mono text-xs">index.html</code>{' '}
            or run <span className="text-violet-400">Build</span>, then preview it here.
          </p>
        ) : (
          <div
            className="bg-white rounded-lg shadow-panel overflow-hidden border border-zinc-700/50 transition-[width] duration-200 flex flex-col"
            style={{
              width: vp.width,
              maxWidth: '100%',
              height: '100%',
              minHeight: 'min(100%, 640px)',
            }}
          >
            <iframe
              ref={iframeRef}
              key={`${previewPath}-${refreshKey}`}
              title="Project browser"
              src={iframeSrc}
              className="w-full flex-1 min-h-[400px] border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        )}
      </div>
    </section>
  )
}
