export type SwarmPattern = 'debate' | 'competitive' | 'pipeline'

export type AgentId = 'researcher' | 'coder' | 'analyst' | 'writer' | 'builder'

export type LogKind = 'info' | 'success' | 'error' | 'command' | 'scaffold' | 'swarm'

export interface LogEntry {
  id: string
  kind: LogKind
  title: string
  body: string
  ts: number
}

export interface AgentStatus {
  id: AgentId
  label: string
  state: 'idle' | 'running' | 'done' | 'error'
  excerpt?: string
}

export interface SwarmResponse {
  final_output: string
  by_agent: Record<string, string>
  judge_report: string | null
  events: Array<{
    type: string
    agent?: string
    winner?: string
    score?: number
    reasons?: string[]
  }>
}

export interface CommandResponse {
  argv: string[]
  exit_code: number
  stdout: string
  stderr: string
}

export interface ScaffoldResponse {
  parse_error: string | null
  written_paths: string[]
  file_count: number
  commands: Array<CommandResponse & { step?: string }>
  model_excerpt?: string
}

export type BottomTab = 'terminal' | 'agents' | 'build'

export type CenterTab = 'editor' | 'preview'
