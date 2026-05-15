import type { LucideIcon } from 'lucide-react'

export function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  active,
}: {
  icon: LucideIcon
  label: string
  onClick?: () => void
  disabled?: boolean
  active?: boolean
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={[
        'p-2 rounded-lg transition-colors',
        active
          ? 'bg-violet-500/20 text-violet-300'
          : 'text-zinc-500 hover:text-zinc-200 hover:bg-surface-hover',
        disabled ? 'opacity-40 pointer-events-none' : '',
      ].join(' ')}
    >
      <Icon className="w-4 h-4" />
    </button>
  )
}
