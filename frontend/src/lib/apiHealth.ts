/** Resolve API base URL — prefer same-origin proxy in dev when env points at localhost. */
export function apiBase(): string {
  const env = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '')
  if (!env) return ''
  if (typeof window === 'undefined') return env
  const pageLocal = /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname)
  const envLocal = /localhost|127\.0\.0\.1/.test(env)
  if (envLocal && !pageLocal) return ''
  return env
}

export type ApiHealthState = 'checking' | 'ok' | 'offline'

const HEALTH_TIMEOUT_MS = 4_000

export async function checkApiHealth(signal?: AbortSignal): Promise<boolean> {
  const ctrl = new AbortController()
  const t = window.setTimeout(() => ctrl.abort(), HEALTH_TIMEOUT_MS)
  const onAbort = () => {
    window.clearTimeout(t)
    ctrl.abort()
  }
  signal?.addEventListener('abort', onAbort)
  try {
    const r = await fetch(`${apiBase()}/health`, {
      signal: ctrl.signal,
      cache: 'no-store',
    })
    if (!r.ok) return false
    const data = (await r.json()) as { status?: string }
    return data.status === 'ok'
  } catch {
    return false
  } finally {
    window.clearTimeout(t)
    signal?.removeEventListener('abort', onAbort)
  }
}

export function clearAppLoadingScreen(): void {
  document.getElementById('app-loading')?.remove()
  const w = window as Window & { __clearAppLoadingTimeout?: () => void }
  w.__clearAppLoadingTimeout?.()
}
