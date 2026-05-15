import { FolderPlus, Hammer, Sparkles, Users } from 'lucide-react'
import { Button } from '../ui/Button'
import { SearchField } from '../ui/SearchField'
import { ShortcutsHintInline } from './ShortcutsHint'

export function TopBar({
  sessionId,
  busy,
  workspaceSearch,
  onWorkspaceSearch,
  onNewSession,
  onScaffold,
  onBuild,
  onSwarm,
}: {
  sessionId: string | null
  busy: boolean
  workspaceSearch: string
  onWorkspaceSearch: (v: string) => void
  onNewSession: () => void
  onScaffold: () => void
  onBuild: () => void
  onSwarm: () => void
}) {
  return (
    <div
      role="banner"
      className="shrink-0 border-b border-border bg-canvas/90 backdrop-blur-md z-20"
    >
      <div className="flex flex-nowrap items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 h-14 overflow-hidden">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xs sm:text-sm font-bold shadow-glow">
            SF
          </div>
          <div className="min-w-0 hidden md:block">
            <h1 className="text-sm font-semibold tracking-tight text-zinc-100 truncate">Swarm Forge</h1>
          </div>
        </div>

        {sessionId ? (
          <div className="flex-1 min-w-0 max-w-2xl mx-1 sm:mx-3">
            <SearchField
              id="top-workspace-search"
              value={workspaceSearch}
              onChange={onWorkspaceSearch}
              disabled={busy}
              placeholder="Search files and prompts…"
              className="!gap-0"
            />
          </div>
        ) : (
          <div className="flex-1 min-w-0" />
        )}

        <div className="flex items-center gap-1 sm:gap-2 flex-nowrap justify-end shrink-0">
          {sessionId && <ShortcutsHintInline />}
          <Button variant="ghost" className="!py-1.5 !px-2 text-xs gap-1.5" onClick={onNewSession} disabled={busy}>
            <FolderPlus className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">New</span>
          </Button>
          <Button variant="primary" className="!py-1.5 gap-1.5 text-xs sm:text-sm" onClick={onScaffold} disabled={!sessionId || busy}>
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">Generate</span>
          </Button>
          <Button variant="secondary" className="!py-1.5 gap-1.5 text-xs sm:text-sm" onClick={onBuild} disabled={!sessionId || busy}>
            <Hammer className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">Build</span>
          </Button>
          <Button variant="success" className="!py-1.5 gap-1.5 text-xs sm:text-sm" onClick={onSwarm} disabled={!sessionId || busy}>
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">Swarm</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
