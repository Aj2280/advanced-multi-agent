import { Globe, Search } from 'lucide-react'

/** Chrome-style address bar row for the built-in browser. */
export function AddressBar({
  value,
  onChange,
  onSubmit,
  disabled,
  prefix,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  disabled?: boolean
  /** Shown before path, e.g. /preview/ */
  prefix?: string
}) {
  return (
    <form
      className="flex flex-1 min-w-0 items-center gap-2 rounded-lg border border-border bg-canvas/90 px-2 py-1 focus-within:ring-2 focus-within:ring-violet-500/30 focus-within:border-violet-500/40"
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
        className="shrink-0 rounded-md px-2.5 py-0.5 text-[11px] font-medium text-violet-200 bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 disabled:opacity-40"
      >
        Go
      </button>
    </form>
  )
}

/** Compact filter input for file lists. */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search files…',
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <div className="relative shrink-0 px-2 pt-2 pb-1">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-lg border border-border bg-canvas/90 py-1.5 pl-8 pr-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/40"
      />
    </div>
  )
}
