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

export async function checkApiHealth(signal?: AbortSignal): Promise<boolean> {
  try {
    const r = await fetch(`${apiBase()}/health`, { signal, cache: 'no-store' })
    if (!r.ok) return false
    const data = (await r.json()) as { status?: string }
    return data.status === 'ok'
  } catch {
    return false
  }
}
