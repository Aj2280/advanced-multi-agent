import { useCallback, useEffect, useState } from 'react'
import { type ApiHealthState, checkApiHealth, checkApiHealthWithRetries } from '../lib/apiHealth'

export function useApiHealth() {
  const [state, setState] = useState<ApiHealthState>('checking')

  const refresh = useCallback(async () => {
    setState('checking')
    const ok = await checkApiHealthWithRetries(4, 600)
    setState(ok ? 'ok' : 'offline')
    return ok
  }, [])

  useEffect(() => {
    const ac = new AbortController()
    const watchdog = window.setTimeout(() => {
      if (!ac.signal.aborted) setState((s) => (s === 'checking' ? 'offline' : s))
    }, 12_000)
    void (async () => {
      const ok = await checkApiHealthWithRetries(5, 700, ac.signal)
      if (!ac.signal.aborted) setState(ok ? 'ok' : 'offline')
    })()
    const id = window.setInterval(() => {
      void checkApiHealth(ac.signal).then((ok) => {
        if (!ac.signal.aborted) setState(ok ? 'ok' : 'offline')
      })
    }, 12_000)
    return () => {
      ac.abort()
      window.clearTimeout(watchdog)
      window.clearInterval(id)
    }
  }, [])

  return { state, refresh, apiOk: state === 'ok' }
}
