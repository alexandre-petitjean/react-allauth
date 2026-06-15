// Interactive playground for the auth hooks, consuming `react-allauth` through
// its package name (aliased to `../src/index.ts`) against the local backend in
// `playground/backend`. The showcase is wrapped in an error boundary so a
// missing backend degrades gracefully.
import { Component, type ReactNode } from 'react'
import { AllauthProvider } from 'react-allauth'
import { AuthDemo } from './components/AuthDemo'

class ErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}

export function App() {
  return (
    <AllauthProvider baseUrl="http://localhost:8000">
      <main
        style={{
          fontFamily: 'system-ui, sans-serif',
          padding: '2rem',
          maxWidth: 480,
          margin: '0 auto',
        }}
      >
        <h1>react-allauth playground</h1>
        <p>Interactive demo of the auth hooks against the local backend.</p>
        <ErrorBoundary
          fallback={
            <p>
              <em>Could not reach the allauth backend (see playground/backend).</em>
            </p>
          }
        >
          <AuthDemo />
        </ErrorBoundary>
      </main>
    </AllauthProvider>
  )
}
