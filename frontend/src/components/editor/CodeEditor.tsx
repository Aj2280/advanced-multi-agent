import { useEffect, useMemo, useRef, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'
import { FileCode, Save } from 'lucide-react'
import { langFromPath } from '../../lib/files'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'

function extensionsFor(path: string) {
  const lang = langFromPath(path)
  const scroll = EditorView.theme({
    '&': { height: '100%' },
    '.cm-scroller': { overflow: 'auto', minHeight: '100%' },
  })
  switch (lang) {
    case 'typescript':
    case 'javascript':
      return [javascript({ typescript: lang === 'typescript' }), scroll]
    case 'json':
      return [json(), scroll]
    case 'markdown':
      return [markdown(), scroll]
    case 'css':
      return [css(), scroll]
    case 'html':
      return [html(), scroll]
    default:
      return [scroll]
  }
}

export function CodeEditor({
  path,
  content,
  isDirty,
  onPathChange,
  onContentChange,
  onSave,
  disabled,
}: {
  path: string
  content: string
  isDirty: boolean
  onPathChange: (p: string) => void
  onContentChange: (c: string) => void
  onSave: () => void
  disabled?: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [editorHeight, setEditorHeight] = useState(320)
  const exts = useMemo(() => extensionsFor(path), [path])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height
      if (h && h > 0) setEditorHeight(h)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-border/60 bg-canvas/40">
        <div className="flex flex-1 min-w-0 items-center gap-2 rounded-lg border border-border bg-canvas/90 px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-violet-500/30">
          <FileCode className="w-3.5 h-3.5 shrink-0 text-zinc-500" aria-hidden />
          <input
            className="flex-1 min-w-0 bg-transparent text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
            value={path}
            onChange={(e) => onPathChange(e.target.value)}
            placeholder="path/to/file.tsx"
            spellCheck={false}
            aria-label="File path"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isDirty && <Badge tone="warning">Unsaved</Badge>}
          <Button
            variant="ghost"
            className="!py-1.5 !px-2.5 text-xs gap-1.5"
            onClick={onSave}
            disabled={disabled || !path}
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save</span>
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0 p-2">
        <div
          ref={containerRef}
          className="h-full min-h-[120px] rounded-lg border border-border overflow-hidden bg-[#0d0d0f]"
        >
          <CodeMirror
            value={content}
            height={`${editorHeight}px`}
            theme={oneDark}
            extensions={exts}
            onChange={onContentChange}
            editable={!disabled}
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              highlightActiveLine: true,
            }}
          />
        </div>
      </div>
    </div>
  )
}
