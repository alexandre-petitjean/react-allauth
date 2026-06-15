// Two-pane playground for the auth hooks, consuming `react-allauth` through its
// package name (aliased to `../src/index.ts`) against the local backend in
// `playground/backend`. Left: interaction. Right: live state + API call log.
import { Component, type ReactNode } from 'react'
import { AllauthProvider } from 'react-allauth'
import { AuthDemo } from './components/AuthDemo'
import { Inspector } from './components/Inspector'
import { BASE_URL } from './config'

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
    <AllauthProvider baseUrl={BASE_URL}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          height: '100vh',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <section style={{ padding: '1.5rem', overflow: 'auto' }}>
          <h1 style={{ marginTop: 0 }}>react-allauth playground</h1>
          <p>Interact on the left; watch the API flow on the right.</p>
          <ErrorBoundary
            fallback={
              <p>
                <em>Could not reach the allauth backend (see playground/backend).</em>
              </p>
            }
          >
            <AuthDemo />
          </ErrorBoundary>
        </section>
        <aside
          style={{
            padding: '1.5rem',
            overflow: 'auto',
            borderLeft: '1px solid #ddd',
            background: '#fafafa',
          }}
        >
          <Inspector />
        </aside>
      </div>
    </AllauthProvider>
  )
}
