import { useSessions } from 'react-allauth'

/** List the account's active sessions and revoke the non-current ones. */
export function SessionsPanel() {
  const { sessions, loading, error, revoke } = useSessions()

  if (loading) return <p className="muted">Loading sessions…</p>
  if (error) return <p className="muted">Could not load sessions.</p>

  return (
    <section>
      <h2>Sessions</h2>
      <ul className="sessions-list">
        {sessions.map((session) => (
          <li key={session.id}>
            {session.user_agent || 'unknown agent'}{' '}
            {session.is_current ? (
              <em>(current)</em>
            ) : (
              <button
                className="button"
                type="button"
                onClick={() => void revoke(session)}
              >
                Revoke
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
