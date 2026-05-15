import { Button } from '../ui/Button'

export function TopBar({
  sessionId,
  busy,
  onNewSession,
  onScaffold,
  onBuild,
  onSwarm,
}: {
  sessionId: string | null
  busy: boolean
  onNewSession: () => void
  onScaffold: () => void
  onBuild: () => void
  onSwarm: () => void
}) {
  return (
    <header className="h-14 shrink-0 flex items-center justify-between gap-4 px-4 border-b border-border bg-canvas/90 backdrop-blur-md">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-sm font-bold shadow-lg shadow-violet-900/40">
          S
        </div>
        <div className="min-w-0">
          <h1 className="text-base font-semibold tracking-tight text-zinc-100 truncate">
            Swarm Forge
          </h1>
          <p className="text-[11px] text-zinc-500 truncate">
            Multi-agent builder · scaffold · debate · ship
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <Button variant="ghost" className="!py-1.5 !px-2 text-xs" onClick={onNewSession} disabled={busy}>
          New workspace
        </Button>
        <Button variant="primary" onClick={onScaffold} disabled={!sessionId || busy}>
          Generate app
        </Button>
        <Button variant="secondary" onClick={onBuild} disabled={!sessionId || busy}>
          npm build
        </Button>
        <Button variant="success" onClick={onSwarm} disabled={!sessionId || busy}>
          Run swarm
        </Button>
      </div>
    </header>
  )
}
