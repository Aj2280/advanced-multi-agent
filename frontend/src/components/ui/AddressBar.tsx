import { Globe, Search, X } from 'lucide-react'

/** Chrome-style address bar row for the built-in browser. */
export function AddressBar({
  value,
  onChange,
  onSubmit,
  disabled,
  prefix,
  className = '',
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  disabled?: boolean
  prefix?: string
  className?: string
}) {
  return (
    <form
      className={[
        'flex w-full min-w-0 items-center gap-2 rounded-lg border border-border bg-canvas/90 px-2.5 py-1.5',
        'focus-within:ring-2 focus-within:ring-violet-500/30 focus-within:border-violet-500/40',
        className,
      ].join(' ')}
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <Globe className="w-3.5 h-3.5 shrink-0 text-zinc-500" aria-hidden />
      {prefix && (
        <span className="shrink-0 text-[11px] font-mono text-zinc-600 select-none">{prefix}</span>
      )}
      <input
        type="text"
        className="flex-1 min-w-0 bg-transparent text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none disabled:opacity-50"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="index.html"
        spellCheck={false}
        disabled={disabled}
        aria-label="Preview file path"
      />
      <button
        type="submit"
        disabled={disabled}
        className="shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium text-violet-200 bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 disabled:opacity-40"
      >
        Go
      </button>
    </form>
  )
}

/** Compact filter input for file lists and panels. */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search files…',
  disabled,
  onClear,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
  onClear?: () => void
}) {
  const showClear = Boolean(value) && onClear

  return (
    <div className="shrink-0 px-2 pt-2 pb-1.5">
      <div className="relative flex items-center">
        <Search
          className="absolute left-2.5 w-3.5 h-3.5 text-zinc-500 pointer-events-none"
          aria-hidden
        />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={placeholder}
          className={[
            'w-full rounded-lg border border-border bg-canvas/90 py-2 text-xs text-zinc-200',
            'placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/40',
            showClear ? 'pl-8 pr-8' : 'pl-8 pr-3',
          ].join(' ')}
        />
        {showClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2 p-0.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-surface-hover"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
