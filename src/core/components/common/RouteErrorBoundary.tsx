import React from 'react'

type Props = {
  children: React.ReactNode
  resetKey?: string
}

type State = {
  hasError: boolean
  message?: string
}

export default class RouteErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'The page could not be rendered.'
    }
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('Route rendering failed', error, info)
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, message: undefined })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] w-full px-4 py-8 sm:px-8">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900 shadow-sm dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100">
            <h1 className="mb-2 text-lg font-semibold">This page could not be displayed</h1>
            <p className="text-sm">
              Please reload the page. If the problem persists, check the browser console and backend permissions.
            </p>
            {this.state.message && (
              <pre className="mt-4 max-w-full overflow-auto rounded-lg bg-white/70 p-3 text-xs text-red-900 dark:bg-black/20 dark:text-red-100">
                {this.state.message}
              </pre>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
