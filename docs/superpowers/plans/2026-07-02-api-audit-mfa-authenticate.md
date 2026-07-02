# API Audit and MFA Authenticate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement phase 4 of the road-to-1.0 spec: record the API-consistency audit, close the one contract gap it found (completing an `mfa_authenticate` flow with a TOTP/recovery code), and prepare the changelog for the next release.

**Architecture:** Two new `AllauthClient` methods (`mfaAuthenticate`, `mfaReauthenticate` → `POST /auth/2fa/authenticate|reauthenticate`, verified against the backend's OpenAPI spec), surfaced on `useMFA` as `authenticate(code)` / `reauthenticate(code)` via the provider's `applyResponse` so session state updates like every other auth flow. The playground's "not supported yet" MFA notice becomes a working code form.

**Tech Stack:** existing stack; no new dependencies.

## Audit findings (recorded, no action needed unless listed as a task)

- Data hooks (`useConfig`, `useEmails`, `useMFA`, `useSessions`, `useSocialAuth`) uniformly expose `{ …data, loading, error, reload }` backed by `useResource`; anonymous state short-circuits to empty data without a request. Consistent.
- Action methods uniformly throw `AllauthRequestError` (well-formed API error) or `AllauthTransportError` (transport failure) and return `AuthFlowResponse` through `applyResponse` when they affect the session (`login`, `signup`, `logout`, `reauthenticate`, `verify`, `confirmReset`, WebAuthn ceremonies, `authenticateByToken`, `providerSignup`). Consistent.
- Naming is coherent (`reload`, `revoke`, `requestReset`/`confirmReset`, `getTOTPSetup`/`activateTOTP`/`deactivateTOTP`). No renames warranted — renaming for taste would break 0.1.0 users without benefit.
- **Gap (Task 1): the `mfa_authenticate` flow cannot be completed** for TOTP/recovery codes: the client has no `/auth/2fa/authenticate` or `/auth/2fa/reauthenticate` method (WebAuthn has its own ceremony methods). README claims full headless coverage; the playground shows "Completing the 2FA flow is not supported by the library yet."
- Deferred (post-1.0 backlog, not this plan): TOTP e2e scenario (needs an enrollment panel in the playground), trust-based `sensitive` reauth handling, login-by-code flow.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-02-road-to-1.0-design.md`.
- Commit messages: single line, imperative, no tool references. `pre-commit run -a` before each commit.
- Comments in English, no emoji. Tests colocated, MSW overrides via `server.use(...)`.

---

### Task 1: mfaAuthenticate / mfaReauthenticate in client and useMFA

**Files:**
- Modify: `src/client.ts` (two methods, after `regenerateRecoveryCodes`)
- Modify: `src/hooks/useMFA.ts` (destructure `applyResponse`; add `authenticate`, `reauthenticate`)
- Modify: `src/hooks/useMFA.test.tsx` (two new tests)

**Interfaces:**
- Produces: `client.mfaAuthenticate(code: string): Promise<AuthFlowResponse>`; `client.mfaReauthenticate(code: string): Promise<AuthFlowResponse>`; `useMFA().authenticate(code)` / `.reauthenticate(code)` returning `Promise<AuthFlowResponse>`.

- [ ] **Step 1: Write the failing tests** (append to `useMFA.test.tsx`, reusing its fixtures)

```tsx
  it('completes an mfa_authenticate flow with a code', async () => {
    let posted: unknown
    server.use(
      http.post(`${v1}/auth/2fa/authenticate`, async ({ request }) => {
        posted = await request.json()
        return HttpResponse.json(
          { status: 200, meta: { is_authenticated: true }, data: {} },
          { status: 200 },
        )
      }),
    )

    const { result } = renderHook(() => useMFA(), { wrapper })

    const response = await act(() => result.current.authenticate('123456'))
    expect(response.status).toBe(200)
    expect(posted).toMatchObject({ code: '123456' })
  })

  it('returns the error envelope on a wrong mfa code', async () => {
    server.use(
      http.post(`${v1}/auth/2fa/authenticate`, () =>
        HttpResponse.json(
          {
            status: 400,
            errors: [{ message: 'Incorrect code.', code: 'incorrect_code', param: 'code' }],
          },
          { status: 400 },
        ),
      ),
    )

    const { result } = renderHook(() => useMFA(), { wrapper })

    const response = await act(() => result.current.authenticate('000000'))
    expect(response.status).toBe(400)
    expect(response.errors?.[0]?.code).toBe('incorrect_code')
  })
```

Convention note: flow methods (`login`, `signup`, `verify`, `confirmReset`,
WebAuthn ceremonies) return the envelope WITHOUT throwing on API error
statuses — the caller reads `response.errors`. `authenticate` follows suit:
no `ensureOk`.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/hooks/useMFA.test.tsx`
Expected: FAIL — `result.current.authenticate is not a function`.

- [ ] **Step 3: Implement**

`src/client.ts`, after `regenerateRecoveryCodes`:

```ts
  mfaAuthenticate(code: string): Promise<AuthFlowResponse> {
    return this.request('POST', '/auth/2fa/authenticate', { code })
  }

  mfaReauthenticate(code: string): Promise<AuthFlowResponse> {
    return this.request('POST', '/auth/2fa/reauthenticate', { code })
  }
```

`src/hooks/useMFA.ts` — destructure `applyResponse` from the context, add to
the interface:

```ts
  /** Complete a pending mfa_authenticate flow with a TOTP or recovery code. */
  authenticate(code: string): Promise<AuthFlowResponse>
  /** Re-authenticate with a TOTP or recovery code. */
  reauthenticate(code: string): Promise<AuthFlowResponse>
```

and implement (mirroring the other flow methods — envelope returned, no throw
on API error statuses):

```ts
  const authenticate = useCallback(
    async (code: string) => applyResponse(await client.mfaAuthenticate(code)),
    [client, applyResponse],
  )

  const reauthenticate = useCallback(
    async (code: string) => applyResponse(await client.mfaReauthenticate(code)),
    [client, applyResponse],
  )
```

Add `AuthFlowResponse` to the type imports and both methods to the returned
object.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/hooks/useMFA.test.tsx`
Expected: 6 tests PASS. Then `npm run test:coverage` — full suite green.

- [ ] **Step 5: Pre-commit and commit**

```bash
pre-commit run -a
git add src/client.ts src/hooks/useMFA.ts src/hooks/useMFA.test.tsx
git commit -m "Add MFA authenticate and reauthenticate to client and useMFA"
```

### Task 2: Playground MFA code panel

**Files:**
- Create: `playground/components/MfaAuthenticateForm.tsx`
- Modify: `playground/components/AuthDemo.tsx` (replace the "not supported" notice)

**Interfaces:**
- Consumes: `useMFA().authenticate(code)`; `useAuth().flow` (`mfa_authenticate` pending).
- Produces: form `<h2>Two-factor authentication</h2>`, input labelled `Code`, button `Authenticate`, errors in `ul.form-errors`.

- [ ] **Step 1: Write the component** (same shape as `VerifyEmailForm`: read `response.errors` from the returned envelope)

```tsx
import { useState, type FormEvent } from 'react'
import { useMFA } from 'react-allauth'
import type { AllauthError } from 'react-allauth'

/** Complete a pending mfa_authenticate flow with a TOTP or recovery code. */
export function MfaAuthenticateForm() {
  const { authenticate } = useMFA()
  const [code, setCode] = useState('')
  const [errors, setErrors] = useState<AllauthError[]>([])
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setErrors([])
    try {
      const response = await authenticate(code)
      setErrors(response.errors ?? [])
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="form" onSubmit={(event) => void handleSubmit(event)}>
      <h2>Two-factor authentication</h2>
      <label className="field">
        Code
        <input
          type="text"
          value={code}
          required
          autoComplete="one-time-code"
          onChange={(event) => setCode(event.target.value)}
        />
      </label>
      <button className="button" type="submit" disabled={submitting}>
        {submitting ? '…' : 'Authenticate'}
      </button>
      {errors.length > 0 && (
        <ul className="form-errors">
          {errors.map((error, index) => (
            <li key={`${error.code}-${index}`}>
              {error.param ? `${error.param}: ` : ''}
              {error.message}
            </li>
          ))}
        </ul>
      )}
    </form>
  )
}
```

- [ ] **Step 2: Replace the notice in AuthDemo**

The `pendingMfa` block's paragraph ("Completing the 2FA flow is not supported…")
becomes:

```tsx
      {pendingMfa && (
        <>
          <p className="muted" role="status">
            MFA required ({pendingMfa.types?.join(', ') ?? 'authenticator'}).
          </p>
          <MfaAuthenticateForm />
        </>
      )}
```

(import `MfaAuthenticateForm`).

- [ ] **Step 3: Typecheck via pre-commit, run the unit suite once more, commit**

```bash
pre-commit run -a
npm run test:coverage
git add playground/components/MfaAuthenticateForm.tsx playground/components/AuthDemo.tsx
git commit -m "Complete the 2FA login flow in the playground"
```

### Task 3: Changelog and README claims

**Files:**
- Modify: `CHANGELOG.md` (new `[Unreleased]` section)
- Modify: `README.md` (hooks table row for `useMFA`)

**Interfaces:** none downstream.

- [ ] **Step 1: Prepend to CHANGELOG.md under the header**

```markdown
## [Unreleased]

### Added

- `useMFA().authenticate(code)` and `useMFA().reauthenticate(code)` — complete an `mfa_authenticate` flow (TOTP or recovery code); the last gap in the headless API contract.
- Playwright e2e suite driving the playground against the real django-allauth backend in CI (login, signup + email verification by code, session revocation).
- Coverage thresholds enforced in CI; Dependabot; contributing guide.
```

- [ ] **Step 2: README hooks table**

Change the `useMFA` row description to: `TOTP, recovery codes and completing 2FA login`.

- [ ] **Step 3: Pre-commit and commit**

```bash
pre-commit run -a
git add CHANGELOG.md README.md
git commit -m "Document MFA authenticate and the e2e suite"
```
