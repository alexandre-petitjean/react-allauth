import { useAuth } from 'react-allauth'
import { clearCalls, useApiLog } from '../lib/apiLog'

/** Right pane: live auth state plus a log of allauth API calls. */
export function Inspector() {
  const { status, user, flow } = useAuth()
  const calls = useApiLog()

  return (
    <div style={{ display: 'grid', gap: '1.5rem', alignContent: 'start' }}>
      <section>
        <h2 style={{ marginTop: 0 }}>State</h2>
        <dl
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '0.25rem 1rem',
            margin: 0,
          }}
        >
          <dt>status</dt>
          <dd style={{ margin: 0 }}>
            <code>{status}</code>
          </dd>
          <dt>user</dt>
          <dd style={{ margin: 0 }}>{user?.display ?? user?.email ?? '—'}</dd>
          <dt>pending flow</dt>
          <dd style={{ margin: 0 }}>{flow?.current?.id ?? '—'}</dd>
        </dl>
      </section>

      <section>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ margin: 0 }}>API calls</h2>
          <button
            type="button"
            onClick={clearCalls}
            disabled={calls.length === 0}
          >
            Clear
          </button>
        </div>
        {calls.length === 0 ? (
          <p>
            <em>No calls yet.</em>
          </p>
        ) : (
          <ol style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '0.75rem' }}>
            {calls.map((call) => (
              <li
                key={call.id}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  padding: '0.5rem',
                  background: '#fff',
                }}
              >
                <code style={{ fontWeight: 600 }}>
                  {call.method} {call.endpoint} → {call.status}
                </code>
                <pre
                  style={{
                    margin: '0.5rem 0 0',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontSize: '0.8rem',
                  }}
                >
                  {JSON.stringify(call.response, null, 2)}
                </pre>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
