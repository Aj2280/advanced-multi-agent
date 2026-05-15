import { Group, Panel, Separator } from 'react-resizable-panels'
import { useWorkbenchContext } from '../../context/WorkbenchContext'
import { TopBar } from './TopBar'
import { WelcomeHero } from './WelcomeHero'
import { BottomDock } from './BottomDock'
import { FileExplorer } from '../files/FileExplorer'
import { CodeEditor } from '../editor/CodeEditor'
import { BuildComposer } from '../build/BuildComposer'
import { PreviewPanel } from '../preview/PreviewPanel'
import type { CenterTab } from '../../types/workbench'

export function WorkbenchLayout({
  apiOk,
  apiChecking,
}: {
  apiOk: boolean
  apiChecking: boolean
}) {
  const wb = useWorkbenchContext()
  const shell = 'flex-1 min-h-0 flex flex-col mesh-bg relative overflow-hidden'

  if (!wb.sessionId) {
    return (
      <div className={`${shell} noise-overlay`}>
        <TopBar
          sessionId={null}
          busy={wb.busy}
          onNewSession={() => void wb.newSession()}
          onScaffold={() => void wb.scaffold()}
          onBuild={() => void wb.runBuild()}
          onSwarm={() => void wb.runSwarm()}
        />
        <WelcomeHero
          onStart={() => void wb.newSession()}
          busy={wb.busy}
          apiOk={apiOk}
          apiChecking={apiChecking}
        />
      </div>
    )
  }

  return (
    <div className={shell}>
      <TopBar
        sessionId={wb.sessionId}
        busy={wb.busy}
        onNewSession={() => void wb.newSession()}
        onScaffold={() => void wb.scaffold()}
        onBuild={() => void wb.runBuild()}
        onSwarm={() => void wb.runSwarm()}
      />
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <Group orientation="vertical" className="flex-1 min-h-0 w-full">
        <Panel defaultSize={72} minSize={35}>
          <Group orientation="horizontal" className="h-full">
            <Panel defaultSize={18} minSize={12} maxSize={30}>
              <div className="h-full p-2 pr-0">
                <FileExplorer
                  files={wb.files}
                  activePath={wb.path}
                  loading={wb.filesLoading}
                  onSelect={(p) => void wb.loadFile(p)}
                  onRefresh={() => wb.refreshFiles()}
                  disabled={wb.busy}
                />
              </div>
            </Panel>
            <Separator className="w-1 bg-border/50 hover:bg-violet-500/40 transition-colors" />

            <Panel defaultSize={52} minSize={28}>
              <div className="h-full flex flex-col p-2 min-h-0">
                <CenterTabs tab={wb.centerTab} onTab={wb.setCenterTab} />
                <div className="flex-1 min-h-0 mt-2">
                  {wb.centerTab === 'editor' ? (
                    <CodeEditor
                      path={wb.path}
                      content={wb.content}
                      isDirty={wb.isDirty}
                      onPathChange={wb.setPath}
                      onContentChange={wb.setContent}
                      onSave={() => void wb.saveFile()}
                      disabled={wb.busy}
                    />
                  ) : (
                    <PreviewPanel
                      sessionId={wb.sessionId}
                      hasIndex={wb.hasIndex}
                      refreshKey={wb.previewKey}
                      onRefresh={wb.bumpPreview}
                    />
                  )}
                </div>
              </div>
            </Panel>
            <Separator className="w-1 bg-border/50 hover:bg-violet-500/40 transition-colors" />

            <Panel defaultSize={30} minSize={18} maxSize={42}>
              <div className="h-full p-2 pl-0">
                <BuildComposer
                  buildPrompt={wb.buildPrompt}
                  swarmPrompt={wb.swarmPrompt}
                  pattern={wb.pattern}
                  selectedAgents={wb.selectedAgents}
                  onBuildPrompt={wb.setBuildPrompt}
                  onSwarmPrompt={wb.setSwarmPrompt}
                  onPattern={wb.setPattern}
                  onToggleAgent={wb.toggleAgent}
                  disabled={wb.busy}
                />
              </div>
            </Panel>
          </Group>
        </Panel>

        <Separator className="h-1 bg-border/50 hover:bg-violet-500/40 transition-colors" />

        <Panel defaultSize={28} minSize={14}>
          <BottomDock
            tab={wb.bottomTab}
            onTab={wb.setBottomTab}
            logs={wb.logs}
            agents={wb.agentStatuses}
            swarmResult={wb.swarmResult}
            activeAgent={wb.activeAgentView}
            onSelectAgent={wb.setActiveAgentView}
          />
        </Panel>
      </Group>
      </div>

      {wb.busy && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-[2px] pointer-events-none"
          aria-busy="true"
        >
          <div className="pointer-events-none flex items-center gap-3 rounded-xl bg-surface-elevated border border-border px-6 py-4 shadow-glow">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse-slow" />
            <span className="text-sm text-zinc-300">Agents working…</span>
          </div>
        </div>
      )}
    </div>
  )
}

function CenterTabs({ tab, onTab }: { tab: CenterTab; onTab: (t: CenterTab) => void }) {
  return (
    <div className="flex gap-1 shrink-0 pt-1 relative z-10">
      {(['editor', 'preview'] as CenterTab[]).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onTab(t)}
          className={[
            'px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors',
            tab === t
              ? 'bg-violet-500/20 text-violet-200 border border-violet-500/30'
              : 'text-zinc-500 hover:text-zinc-300 border border-transparent',
          ].join(' ')}
        >
          {t}
        </button>
      ))}
    </div>
  )
}
