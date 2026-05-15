import React from 'react'

export function Panel({
  title,
  action,
  children,
  className = '',
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={[
        'flex flex-col min-h-0 rounded-xl border border-border bg-surface/80 backdrop-blur-sm overflow-hidden',
        className,
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border shrink-0">
        <h2 className="text-xs font-medium text-zinc-400">{title}</h2>
        {action}
      </div>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">{children}</div>
    </section>
  )
}
