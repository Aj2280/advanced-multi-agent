import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

export type ToastTone = 'info' | 'success' | 'error'

export interface ToastItem {
  id: string
  tone: ToastTone
  title: string
  message?: string
}

interface ToastContextValue {
  toast: (item: Omit<ToastItem, 'id'>) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const toneStyles: Record<ToastTone, string> = {
  info: 'border-sky-500/30 bg-surface-elevated',
  success: 'border-emerald-500/30 bg-surface-elevated',
  error: 'border-rose-500/30 bg-surface-elevated',
}

const icons = {
  info: Info,
  success: CheckCircle2,
  error: AlertCircle,
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const toast = useCallback((item: Omit<ToastItem, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    setItems((prev) => [...prev, { ...item, id }])
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-20 left-4 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none">
        {items.map((t) => {
          const Icon = icons[t.tone]
          return (
            <div
              key={t.id}
              className={[
                'pointer-events-auto flex gap-3 rounded-xl border px-4 py-3 shadow-panel backdrop-blur-md',
                toneStyles[t.tone],
              ].join(' ')}
            >
              <Icon className="w-5 h-5 shrink-0 text-zinc-400 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-100">{t.title}</p>
                {t.message && (
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{t.message}</p>
                )}
              </div>
              <button
                type="button"
                className="text-zinc-600 hover:text-zinc-300 shrink-0"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
