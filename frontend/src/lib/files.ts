export interface FileTreeNode {
  name: string
  path: string
  isDir: boolean
  children: FileTreeNode[]
}

export function fileIconName(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'react',
    js: 'javascript',
    jsx: 'react',
    json: 'json',
    md: 'markdown',
    css: 'css',
    html: 'html',
    py: 'python',
  }
  return map[ext] ?? 'file'
}

/** Build nested tree from flat relative paths. */
export function pathsToTree(paths: string[]): FileTreeNode[] {
  const root: FileTreeNode = { name: '', path: '', isDir: true, children: [] }

  for (const rel of [...paths].sort()) {
    const parts = rel.split('/').filter(Boolean)
    let current = root
    let built = ''
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!
      built = built ? `${built}/${part}` : part
      const isLast = i === parts.length - 1
      let child = current.children.find((c) => c.name === part)
      if (!child) {
        child = {
          name: part,
          path: built,
          isDir: !isLast,
          children: [],
        }
        current.children.push(child)
      }
      current = child
    }
  }

  const sortNodes = (nodes: FileTreeNode[]): FileTreeNode[] =>
    [...nodes]
      .sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
        return a.name.localeCompare(b.name)
      })
      .map((n) => ({ ...n, children: sortNodes(n.children) }))

  return sortNodes(root.children)
}

export function langFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    md: 'markdown',
    css: 'css',
    html: 'html',
    py: 'python',
  }
  return map[ext] ?? ''
}
