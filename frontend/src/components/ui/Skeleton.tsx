export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={['animate-pulse rounded-md bg-surface-hover/80', className].join(' ')}
      aria-hidden
    />
  )
}
