import { useEffect } from 'react'
import { useWorkbench } from './hooks/useWorkbench'
import { TopBar } from './components/layout/TopBar'
import { WelcomeHero } from './components/layout/WelcomeHero'
import { BottomDock } from './components/layout/BottomDock'
import { FileExplorer } from './components/files/FileExplorer'
import { CodeEditor } from './components/editor/CodeEditor'
import { BuildComposer } from './components/build/BuildComposer'

export default function WorkbenchApp() {
  const wb = useWorkbench()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        void wb.saveFile()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [wb.saveFile])

  return (
    <div className="h-screen flex flex-col bg-canvas text-zinc-100 overflow-hidden">
      <TopBar
        sessionId={wb.sessionId}
        busy={wb.busy}
        onNewSession={() => void wb.newSession()}
        onScaffold={() => void wb.scaffold()}
        onBuild={() => void wb.runBuild()}
        onSwarm={() => void wb.runSwarm()}
      />

      {!wb.sessionId ? (
        <WelcomeHero onStart={() => void wb.newSession()} busy={wb.busy} />
      ) : (
        <>
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 min-h-0 overflow-hidden">
            <div className="lg:col-span-2 min-h-[280px] lg:min-h-0 h-full">
              <FileExplorer
                files={wb.files}
                activePath={wb.path}
                onSelect={(p) => void wb.loadFile(p)}
                onRefresh={() => wb.refreshFiles()}
                disabled={wb.busy}
              />
            </div>
            <div className="lg:col-span-5 min-h-[320px] lg:min-h-0 h-full">
              <CodeEditor
                path={wb.path}
                content={wb.content}
                onPathChange={wb.setPath}
                onContentChange={wb.setContent}
                onSave={() => void wb.saveFile()}
                disabled={wb.busy}
              />
            </div>
            <div className="lg:col-span-5 min-h-[320px] lg:min-h-0 h-full">
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
          </div>

          <BottomDock
            tab={wb.bottomTab}
            onTab={wb.setBottomTab}
            logs={wb.logs}
            agents={wb.agentStatuses}
            swarmResult={wb.swarmResult}
            activeAgent={wb.activeAgentView}
            onSelectAgent={wb.setActiveAgentView}
          />
        </>
      )}

      {wb.busy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none">
          <div className="flex items-center gap-3 rounded-xl bg-surface border border-border px-6 py-4 shadow-2xl">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-sm text-zinc-300">Agents working…</span>
          </div>
        </div>
      )}
    </div>
  )
}
