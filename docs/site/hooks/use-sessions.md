# useSessions

List the account's active sessions ("devices") and revoke them. Requires
`allauth.usersessions` in the backend's `INSTALLED_APPS`.

## Result

```ts
interface UseSessionsResult {
  /** Active sessions for the authenticated user. */
  sessions: UserSession[]
  loading: boolean
  error: Error | null
  /** Refetch the session list. */
  reload(): Promise<void>
  revoke(session: UserSession): Promise<void>
}
```

## Example

```tsx
import { useSessions } from 'react-allauth'

function Devices() {
  const { sessions, loading, revoke } = useSessions()
  if (loading) return <Spinner />

  return (
    <ul>
      {sessions.map((session) => (
        <li key={session.id}>
          {session.user_agent} — {session.ip}
          {session.is_current ? (
            ' (this device)'
          ) : (
            <button onClick={() => revoke(session)}>Revoke</button>
          )}
        </li>
      ))}
    </ul>
  )}
```

## Notes

- `sessions` is empty (no request made) while anonymous.
- `revoke` is a mutation: it throws `AllauthRequestError` on failure and
  replaces the list with the server's response on success.
- Revoking the current session is equivalent to logging out that device;
  prefer `useAuth().logout()` for the current one.
