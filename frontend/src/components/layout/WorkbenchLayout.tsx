import { Group, Panel } from 'react-resizable-panels'
import { useDefaultLayout } from 'react-resizable-panels'
import { useWorkbenchContext } from '../../context/WorkbenchContext'
import { TopBar } from './TopBar'
import { WelcomeHero } from './WelcomeHero'
import { BottomDock } from './BottomDock'
import { FileExplorer } from '../files/FileExplorer'
import { CodeEditor } from '../editor/CodeEditor'
import { BuildComposer } from '../build/BuildComposer'
import { BrowserPanel } from '../preview/BrowserPanel'
import { CenterPanel } from './CenterPanel'
import { ResizeHandle } from './ResizeHandle'

const MAIN_LAYOUT_KEY = 'swarm-forge-main-layout'
const ROW_LAYOUT_KEY = 'swarm-forge-row-layout'

export function WorkbenchLayout({
  apiOk,
  apiChecking,
}: {
  apiOk: boolean
  apiChecking: boolean
}) {
  const wb = useWorkbenchContext()
  const shell = 'flex-1 min-h-0 flex flex-col mesh-bg relative overflow-hidden'

  const mainLayout = useDefaultLayout({
    id: MAIN_LAYOUT_KEY,
    storage: localStorage,
    panelIds: ['workbench-top', 'workbench-bottom'],
  })

  const rowLayout = useDefaultLayout({
    id: ROW_LAYOUT_KEY,
    storage: localStorage,
    panelIds: ['panel-explorer', 'panel-editor', 'panel-prompt'],
  })

  if (!wb.sessionId) {
    return (
      <div className={`${shell} noise-overlay`}>
        <TopBar
          sessionId={null}
          busy={wb.busy}
          workspaceSearch=""
          onWorkspaceSearch={() => {}}
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
        workspaceSearch={wb.workspaceSearch}
        onWorkspaceSearch={wb.setWorkspaceSearch}
        onNewSession={() => void wb.newSession()}
        onScaffold={() => void wb.scaffold()}
        onBuild={() => void wb.runBuild()}
        onSwarm={() => void wb.runSwarm()}
      />
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <Group
          id="workbench-vertical"
          orientation="vertical"
          className="flex-1 min-h-0 w-full h-full"
          defaultLayout={mainLayout.defaultLayout}
          onLayoutChanged={mainLayout.onLayoutChanged}
          resizeTargetMinimumSize={{ coarse: 28, fine: 10 }}
        >
          <Panel id="workbench-top" defaultSize={72} minSize={30}>
            <Group
              id="workbench-horizontal"
              orientation="horizontal"
              className="h-full min-h-0 w-full"
              defaultLayout={rowLayout.defaultLayout}
              onLayoutChanged={rowLayout.onLayoutChanged}
              resizeTargetMinimumSize={{ coarse: 28, fine: 10 }}
            >
              <Panel id="panel-explorer" defaultSize={18} minSize={14} maxSize={35}>
                <div className="h-full min-h-0 p-2 pr-1 overflow-hidden">
                  <FileExplorer
                    files={wb.files}
                    activePath={wb.path}
                    loading={wb.filesLoading}
                    search={wb.workspaceSearch}
                    onSearch={wb.setWorkspaceSearch}
                    onSelect={(p) => void wb.loadFile(p)}
                    onRefresh={() => wb.refreshFiles()}
                    disabled={wb.busy}
                  />
                </div>
              </Panel>

              <ResizeHandle id="sep-explorer-editor" orientation="horizontal" />

              <Panel id="panel-editor" defaultSize={52} minSize={25}>
                <div className="h-full min-h-0 p-2 overflow-hidden">
                  <CenterPanel tab={wb.centerTab} onTab={wb.setCenterTab}>
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
                      <BrowserPanel
                        sessionId={wb.sessionId}
                        files={wb.files}
                        refreshKey={wb.previewKey}
                        onRefresh={wb.bumpPreview}
                      />
                    )}
                  </CenterPanel>
                </div>
              </Panel>

              <ResizeHandle id="sep-editor-prompt" orientation="horizontal" />

              <Panel id="panel-prompt" defaultSize={30} minSize={22} maxSize={45}>
                <div className="h-full min-h-0 p-2 pl-1 overflow-hidden">
                  <BuildComposer
                    buildPrompt={wb.buildPrompt}
                    swarmPrompt={wb.swarmPrompt}
                    pattern={wb.pattern}
                    selectedAgents={wb.selectedAgents}
                    templateSearch={wb.workspaceSearch}
                    onTemplateSearch={wb.setWorkspaceSearch}
                    onBuildPrompt={wb.setBuildPrompt}
                    onSwarmPrompt={wb.setSwarmPrompt}
                    onPattern={wb.setPattern}
                    onToggleAgent={wb.toggleAgent}
                    onRunBuild={() => void wb.scaffold()}
                    onRunSwarm={() => void wb.runSwarm()}
                    disabled={wb.busy}
                  />
                </div>
              </Panel>
            </Group>
          </Panel>

          <ResizeHandle id="sep-main-terminal" orientation="vertical" />

          <Panel id="workbench-bottom" defaultSize={28} minSize={12}>
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
