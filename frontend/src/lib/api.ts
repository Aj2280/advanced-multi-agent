const apiBase = () => (import.meta.env.VITE_API_BASE_URL as string | undefined) || ''

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  if (!r.ok) {
    const t = await r.text()
    throw new Error(`${r.status} ${r.statusText}: ${t}`)
  }
  return (await r.json()) as T
}

export function formatCommandOutput(res: {
  argv?: string[]
  exit_code?: number
  stdout?: string
  stderr?: string
}): string {
  const argv = res.argv?.join(' ') ?? 'command'
  const code = res.exit_code ?? -1
  const out = [
    `$ ${argv}`,
    res.stdout ? res.stdout.trimEnd() : '',
    res.stderr ? `[stderr]\n${res.stderr.trimEnd()}` : '',
    `exit ${code}`,
  ].filter(Boolean)
  return out.join('\n')
}
