/** Keyboard hints shown in the top bar when a session is active. */
export function ShortcutsHintInline() {
  return (
    <div className="hidden 2xl:flex items-center gap-3 text-[10px] text-zinc-600 pointer-events-none select-none shrink-0">
      <span>
        <kbd className="px-1 rounded bg-surface-elevated border border-border">⌘S</kbd> save
      </span>
      <span>
        <kbd className="px-1 rounded bg-surface-elevated border border-border">⌘↵</kbd> swarm
      </span>
    </div>
  )
}
