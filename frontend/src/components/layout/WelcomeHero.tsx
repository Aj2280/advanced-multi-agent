import { Button } from '../ui/Button'

export function WelcomeHero({ onStart, busy }: { onStart: () => void; busy: boolean }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-lg text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-500 flex items-center justify-center text-2xl font-bold shadow-2xl shadow-violet-900/50 mb-6">
          SF
        </div>
        <h2 className="text-2xl font-semibold text-zinc-100 tracking-tight">
          Build with a multi-agent swarm
        </h2>
        <p className="mt-3 text-sm text-zinc-500 leading-relaxed">
          Describe what you want. We scaffold a real project tree, run safe npm commands, and
          debate the best answer across researcher, coder, and writer agents.
        </p>
        <Button variant="primary" className="mt-8 px-8 py-3 text-base" onClick={onStart} disabled={busy}>
          Create workspace
        </Button>
        <p className="mt-4 text-[11px] text-zinc-600">
          Requires API keys in <code className="text-zinc-500">.env</code> · start backend with{' '}
          <code className="text-zinc-500">./scripts/dev.sh</code>
        </p>
      </div>
    </div>
  )
}
