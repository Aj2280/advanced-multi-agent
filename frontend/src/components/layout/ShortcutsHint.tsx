export function ShortcutsHint() {
  return (
    <div className="hidden lg:flex items-center justify-center gap-4 py-1 text-[10px] text-zinc-600 border-b border-border/50 bg-canvas/50">
      <span>
        <kbd className="px-1 rounded bg-surface-elevated border border-border">⌘S</kbd> save
      </span>
      <span>
        <kbd className="px-1 rounded bg-surface-elevated border border-border">⌘↵</kbd> run swarm
      </span>
    </div>
  )
}
