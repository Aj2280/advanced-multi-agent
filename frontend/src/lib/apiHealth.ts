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

const HEALTH_TIMEOUT_MS = 5_000

function healthBases(): string[] {
  const bases: string[] = []
  const primary = apiBase()
  bases.push(primary)
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location
    const direct = `${protocol}//${hostname}:8800`
    if (!bases.includes(direct)) bases.push(direct)
    const loopback = `${protocol}//127.0.0.1:8800`
    if (!bases.includes(loopback)) bases.push(loopback)
  }
  return bases
}

async function pingHealth(base: string, signal?: AbortSignal): Promise<boolean> {
  const ctrl = new AbortController()
  const t = window.setTimeout(() => ctrl.abort(), HEALTH_TIMEOUT_MS)
  const onAbort = () => {
    window.clearTimeout(t)
    ctrl.abort()
  }
  signal?.addEventListener('abort', onAbort)
  const path = base ? `${base.replace(/\/$/, '')}/health` : '/health'
  try {
    const r = await fetch(path, { signal: ctrl.signal, cache: 'no-store' })
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

export async function checkApiHealth(signal?: AbortSignal): Promise<boolean> {
  for (const base of healthBases()) {
    if (await pingHealth(base, signal)) return true
  }
  return false
}

/** Retry health check (handles API still starting). */
export async function checkApiHealthWithRetries(
  attempts = 4,
  delayMs = 800,
  signal?: AbortSignal,
): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    if (signal?.aborted) return false
    if (await checkApiHealth(signal)) return true
    if (i < attempts - 1) {
      await new Promise((r) => window.setTimeout(r, delayMs))
    }
  }
  return false
}

export function clearAppLoadingScreen(): void {
  document.getElementById('app-loading')?.remove()
  const w = window as Window & { __clearAppLoadingTimeout?: () => void }
  w.__clearAppLoadingTimeout?.()
}
