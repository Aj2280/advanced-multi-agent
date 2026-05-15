import { fileIcon } from '../../lib/files'
import { Panel } from '../ui/Panel'

export function FileExplorer({
  files,
  activePath,
  onSelect,
  onRefresh,
  disabled,
}: {
  files: string[]
  activePath: string
  onSelect: (path: string) => void
  onRefresh: () => void
  disabled?: boolean
}) {
  return (
    <Panel
      title="Explorer"
      action={
        <button
          type="button"
          className="text-[10px] text-zinc-500 hover:text-zinc-300 uppercase tracking-wide"
          onClick={onRefresh}
          disabled={disabled}
        >
          Refresh
        </button>
      }
      className="h-full"
    >
      <div className="flex-1 overflow-auto p-2 space-y-0.5 custom-scroll">
        {files.length === 0 ? (
          <p className="text-xs text-zinc-600 px-2 py-4 leading-relaxed">
            No files yet. Create a workspace and run <span className="text-violet-400">Generate app</span>.
          </p>
        ) : (
          files.map((f) => {
            const active = f === activePath
            return (
              <button
                key={f}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(f)}
                className={[
                  'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-mono transition-colors',
                  active
                    ? 'bg-violet-500/20 text-violet-200 border border-violet-500/30'
                    : 'text-zinc-400 hover:bg-surface-hover hover:text-zinc-200 border border-transparent',
                ].join(' ')}
              >
                <span className="w-5 text-center text-[10px] text-zinc-600 shrink-0">
                  {fileIcon(f)}
                </span>
                <span className="truncate">{f}</span>
              </button>
            )
          })
        )}
      </div>
    </Panel>
  )
}
