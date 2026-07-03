# useEmails

Manage the account's email addresses: list, add, remove, mark primary,
request verification, and verify (which also completes a pending signup).

## Result

```ts
interface UseEmailsResult {
  /** Email addresses on the account. */
  emails: EmailAddress[]
  loading: boolean
  error: Error | null
  /** Refetch the email list. */
  reload(): Promise<void>
  add(email: string): Promise<void>
  remove(email: string): Promise<void>
  markPrimary(email: string): Promise<void>
  requestVerification(email: string): Promise<void>
  verify(key: string): Promise<AuthFlowResponse>
  /** Resend the pending signup verification email (no session required). */
  resendVerification(): Promise<void>
}
```

## Example

```tsx
import { useAuth, useEmails } from 'react-allauth'

function VerifyEmail() {
  const { flow } = useAuth()
  const { verify } = useEmails()

  if (flow?.current?.id !== 'verify_email') return null

  async function submit(code: string) {
    const response = await verify(code)
    if (response.errors?.length) {
      // wrong or expired code
    }
    // on success the user is signed in; useAuth() updates automatically
  }
  // ...
}
```

## Notes

- `emails` is empty (no request made) while the session is anonymous.
- `add`, `remove`, `markPrimary`, `requestVerification` are mutations: they
  throw `AllauthRequestError` on failure and keep the list in sync on success.
- `verify` accepts either an emailed key (link flow) or a code
  (`ACCOUNT_EMAIL_VERIFICATION_BY_CODE_ENABLED`). It is a flow method: it
  returns the envelope and applies any session change (completing signup).
- `resendVerification` targets the *pending signup* flow and needs no session;
  the backend must set `ACCOUNT_EMAIL_VERIFICATION_SUPPORTS_RESEND = True`.
  It throws `AllauthRequestError` (409) when nothing is pending and (429) when
  rate limited.
