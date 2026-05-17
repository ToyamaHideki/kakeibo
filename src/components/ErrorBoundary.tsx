import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
          <p className="text-lg font-semibold text-gray-700 mb-2">予期しないエラーが発生しました</p>
          <p className="text-sm text-gray-500 mb-6">{this.state.error.message}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm"
          >
            再試行
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
