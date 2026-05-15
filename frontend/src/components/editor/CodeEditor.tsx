import { useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { oneDark } from '@codemirror/theme-one-dark'
import { Save } from 'lucide-react'
import { langFromPath } from '../../lib/files'
import { Panel } from '../ui/Panel'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'

function extensionsFor(path: string) {
  const lang = langFromPath(path)
  switch (lang) {
    case 'typescript':
    case 'javascript':
      return [javascript({ typescript: lang === 'typescript' })]
    case 'json':
      return [json()]
    case 'markdown':
      return [markdown()]
    case 'css':
      return [css()]
    case 'html':
      return [html()]
    default:
      return []
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
  const exts = useMemo(() => extensionsFor(path), [path])

  return (
    <Panel
      title="Editor"
      action={
        <div className="flex items-center gap-2">
          {isDirty && <Badge tone="warning">Unsaved</Badge>}
          <Button
            variant="ghost"
            className="!py-1 !px-2 text-[10px]"
            onClick={onSave}
            disabled={disabled || !path}
          >
            <Save className="w-3.5 h-3.5" />
            Save
          </Button>
        </div>
      }
      className="h-full"
    >
      <div className="flex flex-col flex-1 min-h-0 p-2 gap-2">
        <input
          className="shrink-0 w-full rounded-lg bg-canvas border border-border px-3 py-1.5 text-xs font-mono text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
          value={path}
          onChange={(e) => onPathChange(e.target.value)}
          placeholder="path/to/file.tsx"
          spellCheck={false}
        />
        <div className="flex-1 min-h-[200px] rounded-lg border border-border overflow-hidden bg-[#0d0d0f]">
          <CodeMirror
            value={content}
            height="100%"
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
    </Panel>
  )
}
