import { Separator } from 'react-resizable-panels'

/** Draggable gutter between resizable panels — wide enough to grab easily. */
export function ResizeHandle({
  id,
  orientation,
}: {
  /** Must be unique within the parent Group. */
  id: string
  orientation: 'horizontal' | 'vertical'
}) {
  const isVertical = orientation === 'vertical'
  return (
    <Separator
      id={id}
      className={[
        'group relative shrink-0 z-30',
        'bg-border/40 hover:bg-violet-500/50 active:bg-violet-500/70',
        'transition-colors touch-none select-none',
        isVertical
          ? 'h-2 w-full cursor-row-resize'
          : 'w-2 h-full cursor-col-resize',
      ].join(' ')}
    >
      <div
        className={[
          'absolute rounded-full bg-zinc-600/80 group-hover:bg-violet-400/90 group-active:bg-violet-300',
          isVertical
            ? 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-1 w-10'
            : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-10',
        ].join(' ')}
        aria-hidden
      />
    </Separator>
  )
}
