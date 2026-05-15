import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, File, Folder } from 'lucide-react'
import { pathsToTree, type FileTreeNode } from '../../lib/files'
import { Panel } from '../ui/Panel'
import { SearchField } from '../ui/SearchField'
import { Skeleton } from '../ui/Skeleton'

function filterPaths(files: string[], query: string): string[] {
  const q = query.trim().toLowerCase()
  if (!q) return files
  return files.filter((f) => f.toLowerCase().includes(q))
}

function filterTree(nodes: FileTreeNode[], query: string): FileTreeNode[] {
  const q = query.trim().toLowerCase()
  if (!q) return nodes
  const walk = (n: FileTreeNode): FileTreeNode | null => {
    if (n.isDir) {
      const kids = n.children.map(walk).filter((c): c is FileTreeNode => c !== null)
      if (kids.length > 0) return { ...n, children: kids }
      return null
    }
    return n.path.toLowerCase().includes(q) || n.name.toLowerCase().includes(q) ? n : null
  }
  return nodes.map(walk).filter((n): n is FileTreeNode => n !== null)
}

function TreeNode({
  node,
  depth,
  activePath,
  onSelect,
  defaultOpen,
}: {
  node: FileTreeNode
  depth: number
  activePath: string
  onSelect: (path: string) => void
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen ?? depth < 2)
  const isActive = !node.isDir && node.path === activePath

  if (node.isDir) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center gap-1 rounded-md px-1 py-1 text-left text-xs text-zinc-400 hover:bg-surface-hover hover:text-zinc-200"
          style={{ paddingLeft: `${depth * 10 + 4}px` }}
        >
          {open ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
          <Folder className="w-3.5 h-3.5 shrink-0 text-amber-500/80" />
          <span className="truncate font-medium">{node.name}</span>
        </button>
        {open &&
          node.children.map((c) => (
            <TreeNode
              key={c.path}
              node={c}
              depth={depth + 1}
              activePath={activePath}
              onSelect={onSelect}
            />
          ))}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(node.path)}
      className={[
        'w-full flex items-center gap-1.5 rounded-md py-1 text-left text-xs font-mono transition-colors',
        isActive
          ? 'bg-violet-500/20 text-violet-200 border border-violet-500/25'
          : 'text-zinc-500 hover:bg-surface-hover hover:text-zinc-300 border border-transparent',
      ].join(' ')}
      style={{ paddingLeft: `${depth * 10 + 20}px` }}
    >
      <File className="w-3.5 h-3.5 shrink-0 text-zinc-600" />
      <span className="truncate">{node.name}</span>
    </button>
  )
}

export function FileExplorer({
  files,
  activePath,
  loading,
  search,
  onSearch,
  onSelect,
  onRefresh,
  disabled,
}: {
  files: string[]
  activePath: string
  loading?: boolean
  search: string
  onSearch: (q: string) => void
  onSelect: (path: string) => void
  onRefresh: () => void
  disabled?: boolean
}) {
  const filtered = useMemo(() => filterPaths(files, search), [files, search])
  const tree = useMemo(() => filterTree(pathsToTree(filtered), search), [filtered, search])

  return (
    <Panel
      title="Explorer"
      action={
        <button
          type="button"
          className="text-[10px] text-zinc-500 hover:text-zinc-300"
          onClick={onRefresh}
          disabled={disabled}
        >
          Refresh
        </button>
      }
      className="h-full"
    >
      <div className="shrink-0 px-2 pt-2 pb-2 border-b border-border/50 bg-violet-500/5">
        <SearchField
          id="explorer-file-search"
          label="Search files"
          value={search}
          onChange={onSearch}
          disabled={disabled}
          placeholder="Filter by name or path…"
          hint={search ? `${filtered.length} match${filtered.length === 1 ? '' : 'es'}` : undefined}
        />
      </div>
      <div className="flex-1 overflow-auto p-1 custom-scroll min-h-0">
        {loading ? (
          <div className="space-y-2 p-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : tree.length === 0 ? (
          <p className="text-xs text-zinc-600 px-3 py-4 leading-relaxed">
            {search.trim()
              ? 'No files match your search.'
              : (
                  <>
                    No files yet. Run <span className="text-violet-400">Generate app</span>.
                  </>
                )}
          </p>
        ) : (
          tree.map((n) => (
            <TreeNode key={n.path || n.name} node={n} depth={0} activePath={activePath} onSelect={onSelect} />
          ))
        )}
      </div>
    </Panel>
  )
}
