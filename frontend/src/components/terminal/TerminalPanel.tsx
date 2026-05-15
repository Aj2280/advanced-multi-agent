import type { LogEntry } from '../../types/workbench'

const kindColor: Record<LogEntry['kind'], string> = {
  info: 'text-sky-400',
  success: 'text-emerald-400',
  error: 'text-rose-400',
  command: 'text-zinc-300',
  scaffold: 'text-violet-400',
  swarm: 'text-cyan-400',
}

export function TerminalPanel({ logs, fallback }: { logs: LogEntry[]; fallback?: string }) {
  if (logs.length === 0) {
    return (
      <pre className="p-4 text-xs font-mono text-zinc-600 custom-scroll h-full">
        {fallback ?? 'Terminal ready. Generate an app or run a command.'}
      </pre>
    )
  }
  return (
    <div className="p-3 space-y-3 overflow-auto h-full custom-scroll font-mono text-xs">
      {logs.map((l) => (
        <div key={l.id} className="border-l-2 border-zinc-800 pl-3">
          <div className="flex gap-2 items-baseline">
            <span className={kindColor[l.kind]}>[{l.kind}]</span>
            <span className="text-zinc-500">{l.title}</span>
            <span className="text-[10px] text-zinc-700 ml-auto">
              {new Date(l.ts).toLocaleTimeString()}
            </span>
          </div>
          <pre className="mt-1 text-zinc-400 whitespace-pre-wrap leading-relaxed">{l.body}</pre>
        </div>
      ))}
    </div>
  )
}
