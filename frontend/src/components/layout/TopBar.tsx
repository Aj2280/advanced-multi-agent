import { FolderPlus, Hammer, Sparkles, Users } from 'lucide-react'
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
    <header className="h-14 shrink-0 flex items-center justify-between gap-4 px-4 border-b border-border bg-canvas/90 backdrop-blur-md z-10">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-sm font-bold shadow-glow">
          SF
        </div>
        <div className="min-w-0 hidden sm:block">
          <h1 className="text-base font-semibold tracking-tight text-zinc-100 truncate">
            Swarm Forge
          </h1>
          <p className="text-[11px] text-zinc-500 truncate">
            Multi-agent builder · scaffold · debate
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <Button variant="ghost" className="!py-1.5 !px-2 text-xs gap-1.5" onClick={onNewSession} disabled={busy}>
          <FolderPlus className="w-3.5 h-3.5" />
          <span className="hidden md:inline">New</span>
        </Button>
        <Button variant="primary" className="gap-1.5" onClick={onScaffold} disabled={!sessionId || busy}>
          <Sparkles className="w-3.5 h-3.5" />
          Generate
        </Button>
        <Button variant="secondary" className="gap-1.5" onClick={onBuild} disabled={!sessionId || busy}>
          <Hammer className="w-3.5 h-3.5" />
          Build
        </Button>
        <Button variant="success" className="gap-1.5" onClick={onSwarm} disabled={!sessionId || busy}>
          <Users className="w-3.5 h-3.5" />
          Swarm
        </Button>
      </div>
    </header>
  )
}
