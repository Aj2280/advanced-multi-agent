export type TabItem<T extends string> = { id: T; label: string; badge?: number }

export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
  className = '',
}: {
  tabs: TabItem<T>[]
  active: T
  onChange: (id: T) => void
  className?: string
}) {
  return (
    <div
      role="tablist"
      className={['flex items-center gap-0.5 p-0.5 rounded-lg bg-canvas/60 border border-border/80', className].join(
        ' ',
      )}
    >
      {tabs.map((t) => {
        const selected = active === t.id
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(t.id)}
            className={[
              'px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
              selected
                ? 'bg-violet-500/20 text-violet-100 border border-violet-500/30 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300 border border-transparent',
            ].join(' ')}
          >
            {t.label}
            {t.badge != null && t.badge > 0 && (
              <span className="ml-1.5 text-[10px] tabular-nums text-violet-400">{t.badge}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
