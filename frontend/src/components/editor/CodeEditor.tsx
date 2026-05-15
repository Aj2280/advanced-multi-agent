import { Panel } from '../ui/Panel'
import { Button } from '../ui/Button'

export function CodeEditor({
  path,
  content,
  onPathChange,
  onContentChange,
  onSave,
  disabled,
}: {
  path: string
  content: string
  onPathChange: (p: string) => void
  onContentChange: (c: string) => void
  onSave: () => void
  disabled?: boolean
}) {
  return (
    <Panel
      title="Editor"
      action={
        <Button variant="ghost" className="!py-1 !px-2 text-[10px]" onClick={onSave} disabled={disabled || !path}>
          Save ⌘S
        </Button>
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
        <textarea
          className="flex-1 min-h-[240px] w-full rounded-lg bg-canvas border border-border p-3 text-xs font-mono text-zinc-300 leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-violet-500/50 custom-scroll"
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          spellCheck={false}
          placeholder="Select a file or generate a project…"
        />
      </div>
    </Panel>
  )
}
