import React from 'react'

type Tone = 'default' | 'success' | 'warning' | 'danger' | 'accent'

const tones: Record<Tone, string> = {
  default: 'bg-zinc-800 text-zinc-400',
  success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
  warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
  danger: 'bg-rose-500/15 text-rose-400 border border-rose-500/25',
  accent: 'bg-violet-500/15 text-violet-300 border border-violet-500/30',
}

export function Badge({
  children,
  tone = 'default',
  className = '',
}: {
  children: React.ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        tones[tone],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  )
}
