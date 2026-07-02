# usePassword

Password change for signed-in users and the reset-by-key flow for everyone
else.

## Result

```ts
interface UsePasswordResult {
  change(input: ChangePasswordInput): Promise<void>
  requestReset(email: string): Promise<void>
  confirmReset(input: ConfirmPasswordResetInput): Promise<AuthFlowResponse>
}
```

## Example

```tsx
import { usePassword } from 'react-allauth'

function ResetPassword({ resetKey }: { resetKey: string }) {
  const { confirmReset } = usePassword()

  async function submit(password: string) {
    const response = await confirmReset({ key: resetKey, password })
    if (response.errors?.length) {
      // show field errors
    }
  }
  // ...
}
```

## Notes

- `change` and `requestReset` are mutations: they throw `AllauthRequestError`
  on failure. `requestReset` intentionally does not reveal whether the email
  exists.
- `confirmReset` is a flow method: it returns the envelope (the user may be
  signed in directly depending on backend settings) — read `response.errors`.
- The reset key arrives by email at the URL configured in
  `HEADLESS_FRONTEND_URLS["account_reset_password_from_key"]`; route it to
  your form.
