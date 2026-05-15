import React from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'success' | 'danger'

const styles: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-900/30',
  secondary: 'bg-surface-elevated hover:bg-surface-hover border border-border text-zinc-200',
  ghost: 'hover:bg-surface-hover text-zinc-400 hover:text-zinc-100',
  success: 'bg-emerald-600/90 hover:bg-emerald-500 text-white',
  danger: 'bg-rose-600/90 hover:bg-rose-500 text-white',
}

export function Button({
  variant = 'secondary',
  className = '',
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={[
        'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
        'transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none',
        styles[variant],
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  )
}
