// Exercises the public API contract exactly like a real consumer: through the
// package name `react-allauth` (aliased to `../src/index.ts`). The hooks are
// typed but still throw `not implemented`, so the showcase is rendered inside an
// error boundary — the point is that this file *compiles* with full autocomplete.
import { Component, type ReactNode } from 'react'
import {
  AllauthProvider,
  useAuth,
  useConfig,
  useEmails,
  useMFA,
  usePassword,
  useSessions,
  useSocialAuth,
  useWebAuthn,
} from 'react-allauth'

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

function HookShowcase() {
  const auth = useAuth()
  const { config } = useConfig()
  const emails = useEmails()
  const mfa = useMFA()
  const password = usePassword()
  const sessions = useSessions()
  const social = useSocialAuth()
  const webauthn = useWebAuthn()

  // Referencing the typed members proves the contract gives real autocomplete.
  return (
    <ul>
      <li>status: {auth.status}</li>
      <li>user: {auth.user?.display ?? 'none'}</li>
      <li>pending flow: {auth.flow?.current?.id ?? 'none'}</li>
      <li>open for signup: {String(config?.account.is_open_for_signup)}</li>
      <li>emails: {emails.emails.length}</li>
      <li>authenticators: {mfa.authenticators.length}</li>
      <li>sessions: {sessions.sessions.length}</li>
      <li>connections: {social.connections.length}</li>
      <li>can change password: {String(typeof password.change === 'function')}</li>
      <li>can register passkey: {String(typeof webauthn.register === 'function')}</li>
    </ul>
  )
}

export function App() {
  return (
    <AllauthProvider baseUrl="http://localhost:8000" client="browser">
      <main
        style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: 640 }}
      >
        <h1>react-allauth playground</h1>
        <p>
          This app consumes <code>react-allauth</code> through its public API.
          Editing <code>src/*</code> hot-reloads this view.
        </p>
        <h2>Hooks</h2>
        <ErrorBoundary
          fallback={
            <p>
              <em>Hooks are typed but not implemented yet.</em>
            </p>
          }
        >
          <HookShowcase />
        </ErrorBoundary>
      </main>
    </AllauthProvider>
  )
}
