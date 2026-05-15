import { Search, X } from 'lucide-react'

/** Prominent search input — always visible with strong contrast. */
export function SearchField({
  value,
  onChange,
  placeholder,
  disabled,
  label,
  hint,
  id,
  className = '',
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  disabled?: boolean
  label?: string
  hint?: string
  id?: string
  className?: string
}) {
  const inputId = id ?? 'workspace-search'

  return (
    <div className={['flex flex-col gap-1', className].join(' ')}>
      {label && (
        <label htmlFor={inputId} className="text-[11px] font-medium text-zinc-400 px-0.5">
          {label}
        </label>
      )}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400 pointer-events-none"
          aria-hidden
        />
        <input
          id={inputId}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={label ?? placeholder}
          className={[
            'w-full rounded-xl border-2 border-violet-500/25 bg-canvas py-2.5 pl-10 pr-10',
            'text-sm text-zinc-100 placeholder:text-zinc-500',
            'shadow-inner shadow-black/20',
            'focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/35',
            'disabled:opacity-50',
          ].join(' ')}
        />
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => onChange('')}
            disabled={disabled}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-surface-hover disabled:opacity-40"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {hint && <p className="text-[10px] text-zinc-600 px-0.5">{hint}</p>}
    </div>
  )
}
