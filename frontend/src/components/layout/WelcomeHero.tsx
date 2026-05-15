import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '../ui/Button'

export function WelcomeHero({ onStart, busy }: { onStart: () => void; busy: boolean }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8 relative">
      <div className="max-w-lg text-center relative z-10">
        <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-500 flex items-center justify-center shadow-glow mb-8">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-semibold text-zinc-100 tracking-tight">
          Build anything with your swarm
        </h2>
        <p className="mt-4 text-sm text-zinc-500 leading-relaxed">
          Describe an app in plain language. We generate a real project tree, run safe npm commands,
          and debate the best solution across specialist agents.
        </p>
        <Button
          variant="primary"
          className="mt-10 px-8 py-3 text-base gap-2"
          onClick={onStart}
          disabled={busy}
        >
          Create workspace
          <ArrowRight className="w-4 h-4" />
        </Button>
        <p className="mt-6 text-[11px] text-zinc-600 font-mono">
          ./scripts/dev.sh · http://127.0.0.1:5173/
        </p>
      </div>
    </div>
  )
}
