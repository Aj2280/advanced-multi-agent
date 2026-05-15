import { useEffect, useRef } from 'react'
import { Eraser, Sparkles } from 'lucide-react'

export function PromptEditor({
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled,
  minRows = 6,
  label,
  hint,
  onClear,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit?: () => void
  placeholder: string
  disabled?: boolean
  minRows?: number
  label: string
  hint?: string
  onClear?: () => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, minRows * 22)}px`
  }, [value, minRows])

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-zinc-300">{label}</label>
        <div className="flex items-center gap-2">
          {hint && <span className="text-[10px] text-zinc-600 hidden sm:inline">{hint}</span>}
          {onClear && value.length > 0 && (
            <button
              type="button"
              disabled={disabled}
              onClick={onClear}
              className="inline-flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 disabled:opacity-40"
            >
              <Eraser className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
      </div>
      <div
        className={[
          'rounded-xl border bg-canvas/80 overflow-hidden transition-shadow',
          'border-border focus-within:border-violet-500/50 focus-within:ring-2 focus-within:ring-violet-500/25',
        ].join(' ')}
      >
        <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-border/60 bg-surface-elevated/40">
          <Sparkles className="w-3.5 h-3.5 text-violet-400 shrink-0" />
          <span className="text-[10px] text-zinc-500">
            Describe what to generate — be specific about stack and UI
          </span>
        </div>
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          rows={minRows}
          onKeyDown={(e) => {
            if (onSubmit && (e.metaKey || e.ctrlKey) && e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              onSubmit()
            }
          }}
          className="w-full resize-none bg-transparent px-3 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none disabled:opacity-50 leading-relaxed"
          aria-label={label}
        />
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-border/50 text-[10px] text-zinc-600">
          <span>{value.length} chars</span>
          {onSubmit && (
            <span className="text-zinc-500">
              <kbd className="px-1 rounded bg-surface-elevated border border-border">⌘</kbd>
              <kbd className="px-1 rounded bg-surface-elevated border border-border ml-0.5">Enter</kbd>
              <span className="ml-1">to run swarm</span>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
