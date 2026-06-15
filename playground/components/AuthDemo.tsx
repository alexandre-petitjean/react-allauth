import { useAuth } from 'react-allauth'
import { CredentialsForm } from './CredentialsForm'

/** Interactive auth demo: login, signup, logout and current state. */
export function AuthDemo() {
  const { status, user, flow, login, signup, logout } = useAuth()

  if (status === 'loading') {
    return <p>Loading…</p>
  }

  if (status === 'authenticated') {
    return (
      <section style={{ display: 'grid', gap: '1rem' }}>
        <p>
          Signed in as{' '}
          <strong>{user?.display ?? user?.email ?? 'unknown user'}</strong>
        </p>
        <button type="button" onClick={() => void logout()}>
          Log out
        </button>
      </section>
    )
  }

  const pendingMfa =
    flow?.current?.id === 'mfa_authenticate' ? flow.current : null

  return (
    <section style={{ display: 'grid', gap: '2rem' }}>
      {pendingMfa && (
        <p
          role="status"
          style={{ background: '#fff3cd', padding: '0.75rem', borderRadius: 4 }}
        >
          MFA required ({pendingMfa.types?.join(', ') ?? 'authenticator'}).
          Completing the 2FA flow is not supported by the library yet.
        </p>
      )}
      <CredentialsForm title="Log in" submitLabel="Log in" onSubmit={login} />
      <CredentialsForm title="Sign up" submitLabel="Sign up" onSubmit={signup} />
    </section>
  )
}
