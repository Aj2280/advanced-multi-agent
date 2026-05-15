import { useCallback, useEffect, useState } from 'react'
import { type ApiHealthState, checkApiHealth } from '../lib/apiHealth'

export function useApiHealth() {
  const [state, setState] = useState<ApiHealthState>('checking')

  const refresh = useCallback(async () => {
    setState('checking')
    const ok = await checkApiHealth()
    setState(ok ? 'ok' : 'offline')
    return ok
  }, [])

  useEffect(() => {
    const ac = new AbortController()
    void (async () => {
      const ok = await checkApiHealth(ac.signal)
      if (!ac.signal.aborted) setState(ok ? 'ok' : 'offline')
    })()
    const id = window.setInterval(() => {
      void checkApiHealth(ac.signal).then((ok) => {
        if (!ac.signal.aborted) setState(ok ? 'ok' : 'offline')
      })
    }, 12_000)
    return () => {
      ac.abort()
      window.clearInterval(id)
    }
  }, [])

  return { state, refresh, apiOk: state === 'ok' }
}
