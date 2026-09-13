import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="state" style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💥</div>
            <h2>Something went wrong</h2>
            <p className="muted" style={{ margin: '8px 0 16px' }}>
              An unexpected error occurred. Please refresh the page.
            </p>
            <button className="btn btn--primary" onClick={() => window.location.reload()}>
              Refresh
            </button>
          </div>
        )
      )
    }
    return this.props.children
  }
}
