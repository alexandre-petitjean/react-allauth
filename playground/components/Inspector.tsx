import { useAuth } from 'react-allauth'
import { clearCalls, useApiLog } from '../lib/apiLog'
import { JsonBlock } from './JsonBlock'

function methodClass(method: string): string {
  return `badge method method--${method.toLowerCase()}`
}

function statusClass(status: number): string {
  if (status < 300) return 'badge status--ok'
  if (status < 500) return 'badge status--warn'
  return 'badge status--error'
}

function authStatusClass(status: string): string {
  return status === 'authenticated' ? 'badge status--ok' : 'badge badge--state'
}

/** Right pane: live auth state plus a log of allauth API calls. */
export function Inspector() {
  const { status, user, flow } = useAuth()
  const calls = useApiLog()

  return (
    <div className="inspector">
      <section>
        <h2>State</h2>
        <dl className="state">
          <dt>status</dt>
          <dd>
            <span className={authStatusClass(status)}>{status}</span>
          </dd>
          <dt>user</dt>
          <dd>{user?.display ?? user?.email ?? '—'}</dd>
          <dt>pending flow</dt>
          <dd>{flow?.current?.id ?? '—'}</dd>
        </dl>
      </section>

      <section>
        <div className="inspector-head">
          <h2>API calls</h2>
          <button
            className="button button--ghost"
            type="button"
            onClick={clearCalls}
            disabled={calls.length === 0}
          >
            Clear
          </button>
        </div>
        {calls.length === 0 ? (
          <p className="muted">No calls yet.</p>
        ) : (
          <ol className="call-list">
            {calls.map((call) => (
              <li key={call.id} className="call">
                <div className="call-head">
                  <span className={methodClass(call.method)}>{call.method}</span>
                  <span className="endpoint">{call.endpoint}</span>
                  <span className={statusClass(call.status)}>{call.status}</span>
                </div>
                <JsonBlock value={call.response} />
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
