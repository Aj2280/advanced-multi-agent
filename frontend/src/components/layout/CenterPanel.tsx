import type { ReactNode } from 'react'
import type { CenterTab } from '../../types/workbench'
import { TabBar } from '../ui/TabBar'

const CENTER_TABS = [
  { id: 'editor' as CenterTab, label: 'Editor' },
  { id: 'preview' as CenterTab, label: 'Browser' },
]

export function CenterPanel({
  tab,
  onTab,
  children,
}: {
  tab: CenterTab
  onTab: (t: CenterTab) => void
  children: ReactNode
}) {
  return (
    <section className="flex flex-col h-full min-h-0 rounded-xl border border-border bg-surface/80 backdrop-blur-sm overflow-hidden">
      <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-surface-elevated/50">
        <TabBar tabs={CENTER_TABS} active={tab} onChange={onTab} />
        <p className="text-[10px] text-zinc-600 hidden md:block shrink-0">
          Drag panel edges to resize
        </p>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <div key={tab} className="absolute inset-0 overflow-hidden opacity-0 animate-[fadeIn_0.15s_ease-out_forwards]">
          {children}
        </div>
      </div>
    </section>
  )
}
