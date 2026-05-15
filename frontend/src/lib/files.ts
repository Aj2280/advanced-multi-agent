export function fileIcon(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    ts: 'TS',
    tsx: '⚛',
    js: 'JS',
    jsx: '⚛',
    json: '{}',
    md: 'Md',
    css: '#',
    html: '<>',
    py: 'Py',
    yml: 'Y',
    yaml: 'Y',
  }
  return map[ext] ?? '·'
}

export function buildFileTree(paths: string[]): Map<string, string[]> {
  const root = new Map<string, string[]>()
  const sorted = [...paths].sort()
  for (const p of sorted) {
    const parts = p.split('/')
    if (parts.length === 1) {
      const list = root.get('') ?? []
      list.push(p)
      root.set('', list)
    } else {
      const dir = parts.slice(0, -1).join('/')
      const list = root.get(dir) ?? []
      list.push(parts[parts.length - 1]!)
      root.set(dir, list)
    }
  }
  return root
}
