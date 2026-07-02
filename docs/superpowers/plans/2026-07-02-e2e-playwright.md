# End-to-End Tests (Playwright) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement phase 3 of the road-to-1.0 spec: a Playwright e2e suite driving the playground UI against the real Dockerized django-allauth backend, wired into CI.

**Architecture:** Playwright starts the Vite playground (`npm run dev`, :5173) via its `webServer` option; the Django backend (:8000) and Mailpit (:8025) come from `playground/backend/docker-compose.yml` and must be up before the suite runs (CI boots them; locally the developer does). Verification codes are read from Mailpit's REST API. The playground UI is extended with two small panels (verify-email code form, sessions list) so the scenarios exercise the library's hooks end to end.

**Tech Stack:** @playwright/test (chromium only), Mailpit REST API, existing Vite playground + Django backend.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-02-road-to-1.0-design.md`.
- Scope deviation from the spec, recorded here: TOTP challenge e2e is DEFERRED — the library cannot complete an `mfa_authenticate` flow yet (no `/auth/2fa/authenticate` client method; see `playground/components/AuthDemo.tsx` notice). Password-reset-by-key e2e is DEFERRED to keep this increment small. Both become phase 4 follow-ups.
- Commit messages: single line, imperative, no tool references. `pre-commit run -a` before each commit.
- Comments in English, no emoji.
- The playground stays a single-page app (no router): flow-dependent panels render conditionally from `useAuth().flow`.
- e2e tests must be independent of run order and idempotent across runs against a persistent SQLite volume: signup tests generate unique emails (`e2e-<timestamp>@example.com`).

---

### Task 1: Seed a verified regular user

**Files:**
- Modify: `playground/backend/seed_superuser.py`
- Modify: `playground/backend/docker-compose.yml` (env vars for the new user)

**Interfaces:**
- Produces: login `user@example.com` / `playground-e2e-pass` usable by e2e login/logout/sessions scenarios (email verified, so `mandatory` verification does not block login).

- [ ] **Step 1: Extend the seed script**

Append to `playground/backend/seed_superuser.py` (it runs inside `manage.py shell`):

```python
# Also seed a verified regular user for e2e scenarios: login must not be
# blocked by ACCOUNT_EMAIL_VERIFICATION="mandatory".
from allauth.account.models import EmailAddress

e2e_email = os.environ.get("PLAYGROUND_USER_EMAIL", "user@example.com")
e2e_password = os.environ.get("PLAYGROUND_USER_PASSWORD", "playground-e2e-pass")

user = User.objects.filter(username="user").first()
if user is None:
    user = User.objects.create_user("user", e2e_email, e2e_password)
    print("Created playground user 'user'.")
else:
    print("Playground user 'user' already exists, skipping.")

EmailAddress.objects.update_or_create(
    user=user,
    email=e2e_email,
    defaults={"verified": True, "primary": True},
)
```

- [ ] **Step 2: Declare the env vars in docker-compose.yml**

Add to the `backend` service `environment` block:

```yaml
      PLAYGROUND_USER_EMAIL: user@example.com
      PLAYGROUND_USER_PASSWORD: playground-e2e-pass
```

- [ ] **Step 3: Verify against the running backend**

Run: `cd playground/backend && docker compose up -d --build && sleep 5 && docker compose logs backend | tail -5`
Expected: log line about the playground user (created or skipping); backend serving on :8000.

- [ ] **Step 4: Pre-commit and commit**

```bash
pre-commit run -a
git add playground/backend/seed_superuser.py playground/backend/docker-compose.yml
git commit -m "Seed a verified playground user for e2e scenarios"
```

### Task 2: Playground verify-email panel

**Files:**
- Create: `playground/components/VerifyEmailForm.tsx`
- Modify: `playground/components/AuthDemo.tsx`

**Interfaces:**
- Consumes: `useAuth().flow` (`flow.current.id === 'verify_email'`), `useEmails().verify(key)` which applies the auth response (signup completes on success).
- Produces: a form with `<h2>Verify your email</h2>`, one text input labelled `Code`, submit button `Verify`; errors in `ul.form-errors` (same convention as CredentialsForm).

- [ ] **Step 1: Write the component**

```tsx
import { useState, type FormEvent } from 'react'
import { useEmails } from 'react-allauth'
import type { AllauthError } from 'react-allauth'

/** Enter the verification code emailed after signup (verification by code). */
export function VerifyEmailForm() {
  const { verify } = useEmails()
  const [code, setCode] = useState('')
  const [errors, setErrors] = useState<AllauthError[]>([])
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setErrors([])
    try {
      const response = await verify(code)
      setErrors(response.errors ?? [])
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="form" onSubmit={(event) => void handleSubmit(event)}>
      <h2>Verify your email</h2>
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
        {submitting ? '…' : 'Verify'}
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

- [ ] **Step 2: Render it from AuthDemo on a pending verify_email flow**

In `AuthDemo.tsx`, next to the existing `pendingMfa` derivation add:

```tsx
  const pendingVerification = flow?.current?.id === 'verify_email'
```

and in the unauthenticated return, before the two `CredentialsForm`s:

```tsx
      {pendingVerification && <VerifyEmailForm />}
```

(import `VerifyEmailForm` at the top). Keep the login/signup forms rendered so the page still works when the flow is abandoned.

- [ ] **Step 3: Verify by hand against the running stack**

With the backend up, run `npm run dev`; sign up with a fresh email, confirm the Verify panel appears; fetch the code from http://localhost:8025 and confirm entering it signs the user in.

- [ ] **Step 4: Pre-commit and commit**

```bash
pre-commit run -a
git add playground/components/VerifyEmailForm.tsx playground/components/AuthDemo.tsx
git commit -m "Add verify-email code panel to the playground"
```

### Task 3: Playground sessions panel

**Files:**
- Create: `playground/components/SessionsPanel.tsx`
- Modify: `playground/components/AuthDemo.tsx` (render inside the signed-in section)

**Interfaces:**
- Consumes: `useSessions()` (`sessions: UserSession[]` with `id`, `ip`, `user_agent`, `is_current`; `revoke(session)`).
- Produces: `<section>` with `<h2>Sessions</h2>`, a `ul.sessions-list` with one `li` per session showing the user agent, the marker `(current)` for the current one, and a `Revoke` button on the others.

- [ ] **Step 1: Write the component**

```tsx
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
```

- [ ] **Step 2: Render it when signed in**

In `AuthDemo.tsx`'s authenticated branch, after the logout button add `<SessionsPanel />` (and the import).

- [ ] **Step 3: Verify by hand**

Signed in, the panel lists at least the current session marked `(current)`.

- [ ] **Step 4: Pre-commit and commit**

```bash
pre-commit run -a
git add playground/components/SessionsPanel.tsx playground/components/AuthDemo.tsx
git commit -m "Add sessions panel to the playground"
```

### Task 4: Playwright scaffolding

**Files:**
- Modify: `package.json` (devDependency @playwright/test, script `test:e2e`)
- Create: `playwright.config.ts`
- Create: `e2e/helpers/mailpit.ts`
- Modify: `.gitignore` (playwright artifacts)

**Interfaces:**
- Produces: `npm run test:e2e`; `latestCodeFor(email): Promise<string>` mailpit helper used by Task 5; config `testDir: 'e2e'`, baseURL `http://localhost:5173`.

- [ ] **Step 1: Install and script**

Run: `npm install --save-dev @playwright/test && npx playwright install chromium`
Add script: `"test:e2e": "playwright test"`.

- [ ] **Step 2: Write `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test'

// The Django backend (:8000) and Mailpit (:8025) must already be running:
// `cd playground/backend && docker compose up -d`. Playwright starts the
// Vite playground itself.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
```

`workers: 1`: scenarios share one backend user's session table; parallel runs
would make the sessions assertions racy.

- [ ] **Step 3: Write the Mailpit helper**

```ts
const MAILPIT_URL = 'http://localhost:8025'

interface MailpitMessageSummary {
  ID: string
  To: { Address: string }[]
}

/**
 * Return the verification code from the most recent Mailpit message sent to
 * `email`. Polls because delivery is asynchronous relative to the signup call.
 */
export async function latestCodeFor(email: string): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const search = await fetch(
      `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
    )
    const { messages } = (await search.json()) as {
      messages: MailpitMessageSummary[]
    }
    if (messages.length > 0) {
      const detail = await fetch(`${MAILPIT_URL}/api/v1/message/${messages[0].ID}`)
      const body = ((await detail.json()) as { Text: string }).Text
      const match = body.match(/^\s*([A-Z0-9]{6,8})\s*$/m)
      if (match) return match[1]
      throw new Error(`No verification code found in message:\n${body}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`No Mailpit message for ${email}`)
}
```

(The code regex targets allauth's by-code email, which puts the code on its own
line. Verify against a real message during Task 5 and adjust if needed.)

- [ ] **Step 4: Ignore Playwright artifacts**

Append to `.gitignore`:

```
test-results/
playwright-report/
```

- [ ] **Step 5: Pre-commit and commit**

```bash
pre-commit run -a
git add package.json package-lock.json playwright.config.ts e2e/helpers/mailpit.ts .gitignore
git commit -m "Add Playwright scaffolding for e2e tests"
```

### Task 5: e2e scenarios

**Files:**
- Create: `e2e/auth.spec.ts`

**Interfaces:**
- Consumes: seeded `user@example.com` / `playground-e2e-pass` (Task 1), verify-email panel (Task 2), sessions panel (Task 3), `latestCodeFor` (Task 4).

- [ ] **Step 1: Write the scenarios**

```ts
import { expect, test, type Page } from '@playwright/test'
import { latestCodeFor } from './helpers/mailpit'

const SEEDED_EMAIL = 'user@example.com'
const SEEDED_PASSWORD = 'playground-e2e-pass'

async function logIn(page: Page, email: string, password: string) {
  const form = page.locator('form', { has: page.getByRole('heading', { name: 'Log in' }) })
  await form.getByLabel('Email').fill(email)
  await form.getByLabel('Password').fill(password)
  await form.getByRole('button', { name: 'Log in' }).click()
}

test('logs in and out with the seeded user', async ({ page }) => {
  await page.goto('/')
  await logIn(page, SEEDED_EMAIL, SEEDED_PASSWORD)

  await expect(page.getByText(/Signed in as/)).toBeVisible()

  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible()
})

test('shows the API error on a wrong password', async ({ page }) => {
  await page.goto('/')
  await logIn(page, SEEDED_EMAIL, 'wrong-password')

  await expect(page.locator('.form-errors').first()).toBeVisible()
  await expect(page.getByText(/Signed in as/)).not.toBeVisible()
})

test('signs up and verifies the email by code', async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`
  await page.goto('/')

  const form = page.locator('form', { has: page.getByRole('heading', { name: 'Sign up' }) })
  await form.getByLabel('Email').fill(email)
  await form.getByLabel('Password').fill('e2e-signup-pass-123')
  await form.getByRole('button', { name: 'Sign up' }).click()

  const verifyForm = page.locator('form', {
    has: page.getByRole('heading', { name: 'Verify your email' }),
  })
  await expect(verifyForm).toBeVisible()

  const code = await latestCodeFor(email)
  await verifyForm.getByLabel('Code').fill(code)
  await verifyForm.getByRole('button', { name: 'Verify' }).click()

  await expect(page.getByText(/Signed in as/)).toBeVisible()
})

test('lists sessions and revokes another device', async ({ browser, page }) => {
  // First device signs in.
  await page.goto('/')
  await logIn(page, SEEDED_EMAIL, SEEDED_PASSWORD)
  await expect(page.getByText(/Signed in as/)).toBeVisible()

  // Second device signs in with the same account.
  const otherContext = await browser.newContext()
  const otherPage = await otherContext.newPage()
  await otherPage.goto('/')
  await logIn(otherPage, SEEDED_EMAIL, SEEDED_PASSWORD)
  await expect(otherPage.getByText(/Signed in as/)).toBeVisible()

  // The first device now sees two sessions and revokes the other one.
  await page.reload()
  const items = page.locator('.sessions-list li')
  await expect(items).toHaveCount(2)
  await page.getByRole('button', { name: 'Revoke' }).first().click()
  await expect(items).toHaveCount(1)
  await expect(items.first()).toContainText('(current)')

  await otherContext.close()
})
```

- [ ] **Step 2: Run the suite locally**

Backend up (`cd playground/backend && docker compose up -d`), then:
Run: `npm run test:e2e`
Expected: 4 passed. If the signup test fails on code extraction, open the
captured email in Mailpit (http://localhost:8025), fix the regex in
`e2e/helpers/mailpit.ts`, re-run.

- [ ] **Step 3: Pre-commit and commit**

```bash
pre-commit run -a
git add e2e/auth.spec.ts
git commit -m "Add e2e scenarios for login, signup verification and sessions"
```

### Task 6: CI job

**Files:**
- Modify: `.github/workflows/ci.yml` (new `e2e` job)
- Modify: `CONTRIBUTING.md` (document `npm run test:e2e`)

**Interfaces:**
- Consumes: everything above; the compose file `playground/backend/docker-compose.yml`.

- [ ] **Step 1: Add the job**

```yaml
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - name: Start the playground backend
        run: docker compose up -d --build
        working-directory: playground/backend
      - run: npx playwright install --with-deps chromium
      - name: Wait for the backend
        run: |
          for i in $(seq 1 30); do
            curl -sf http://localhost:8000/_allauth/browser/v1/config > /dev/null && exit 0
            sleep 2
          done
          echo "Backend did not come up" >&2
          docker compose -f playground/backend/docker-compose.yml logs
          exit 1
      - run: npm run test:e2e
        env:
          CI: 'true'
      - name: Backend logs on failure
        if: failure()
        run: docker compose -f playground/backend/docker-compose.yml logs
```

- [ ] **Step 2: Document the local workflow**

In `CONTRIBUTING.md`, add a `npm run test:e2e` row to the scripts table and a
short paragraph in the Playground section: backend must be up via docker
compose; Playwright starts the Vite server itself.

- [ ] **Step 3: Pre-commit and commit**

```bash
pre-commit run -a
git add .github/workflows/ci.yml CONTRIBUTING.md
git commit -m "Run the e2e suite in CI against the Dockerized backend"
```
