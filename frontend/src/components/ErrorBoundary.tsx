import React from 'react'

type Props = { children: React.ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-canvas text-zinc-200">
          <div className="max-w-md text-center space-y-4">
            <h1 className="text-lg font-semibold text-rose-300">Something went wrong</h1>
            <p className="text-sm text-zinc-500 font-mono break-all">{this.state.error.message}</p>
            <button
              type="button"
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
