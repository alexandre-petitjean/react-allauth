# Hygiene and Unit-Test Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement phases 1-2 of the road-to-1.0 spec: coverage enforcement, Dependabot, CONTRIBUTING.md, and error-path unit tests for the client, `useResource` and the thin hooks.

**Architecture:** No production-code changes expected — this plan adds tests and tooling around the existing `AllauthClient` → `AllauthProvider` → hooks structure. Tests follow the established pattern: Vitest + Testing Library `renderHook` + MSW handlers overridden per test with `server.use(...)`.

**Tech Stack:** Vitest 3 (happy-dom), MSW 2, @testing-library/react 16, @vitest/coverage-v8.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-02-road-to-1.0-design.md`.
- Coverage target: 85% lines/statements on `src/` (final task raises thresholds after tests land; Task 1 sets a provisional floor at the then-current level).
- Commit messages: single line, imperative, no tool references (repo convention).
- After every code change, run `pre-commit run -a` before committing.
- Comments in English, no emoji.
- Test files live next to the code under test (`src/hooks/useX.test.tsx`, `src/client.test.ts`).
- In every test, override MSW handlers with `server.use(...)` from `src/test/setup.ts`; never edit the default handlers for one test.

---

### Task 1: Coverage tooling and test-script cleanup

**Files:**
- Modify: `package.json` (scripts + devDependencies)
- Modify: `vitest.config.ts`
- Modify: `.github/workflows/ci.yml:24`

**Interfaces:**
- Produces: `npm run test` (no `--passWithNoTests`), `npm run test:coverage` used by CI and by Task 10 to raise thresholds.

- [ ] **Step 1: Install the coverage provider**

Run: `npm install --save-dev @vitest/coverage-v8`
Expected: adds the package to `devDependencies` matching the installed Vitest 3 major.

- [ ] **Step 2: Update the scripts**

In `package.json`, replace:

```json
    "test": "vitest run --passWithNoTests",
```

with:

```json
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
```

- [ ] **Step 3: Configure coverage in `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Test config is kept separate from the library build (vite.config.ts) so the
// dts plugin and library bundling never run during tests.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/test/**'],
      thresholds: {
        lines: 80,
        statements: 80,
      },
    },
  },
})
```

Note: run `npm run test:coverage` first WITHOUT thresholds to measure the
current level, then set the provisional floor ~2 points below the measured
lines/statements value (80 is the expected ballpark — adjust to what you
measure). Task 10 raises it to the spec's 85 after the new tests land.

- [ ] **Step 4: Run the coverage gate**

Run: `npm run test:coverage`
Expected: all 28 existing tests pass; coverage table printed; thresholds met (exit 0).

- [ ] **Step 5: Point CI at the coverage run**

In `.github/workflows/ci.yml`, replace the `- run: npm test` step with `- run: npm run test:coverage`.

- [ ] **Step 6: Pre-commit and commit**

```bash
pre-commit run -a
git add package.json package-lock.json vitest.config.ts .github/workflows/ci.yml
git commit -m "Enforce test coverage thresholds in CI"
```

### Task 2: Dependabot configuration

**Files:**
- Create: `.github/dependabot.yml`

**Interfaces:**
- Produces: weekly dependency PRs for npm and GitHub Actions; nothing consumed by later tasks.

- [ ] **Step 1: Write the config**

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    groups:
      dev-dependencies:
        dependency-type: development
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
```

- [ ] **Step 2: Validate and commit**

Run: `pre-commit run -a` (the `check yaml` hook validates the file).

```bash
git add .github/dependabot.yml
git commit -m "Add Dependabot for npm and GitHub Actions"
```

### Task 3: CONTRIBUTING.md

**Files:**
- Create: `CONTRIBUTING.md`
- Modify: `README.md` (Contributing section — add a link to the new file)

**Interfaces:**
- Produces: contributor documentation; nothing consumed by later tasks.

- [ ] **Step 1: Write `CONTRIBUTING.md`**

Content requirements (write real prose, keep it under ~80 lines): prerequisites
(Node 20+, Docker for the playground backend); clone + `npm install`;
`pre-commit install`; the six npm scripts from README's table; how to run the
playground (`npm run dev` + `docker compose up` in `playground/backend/`);
test conventions (Vitest + MSW, tests colocated with source, override handlers
with `server.use`); PR expectations (CI green: lint, typecheck, coverage,
build; single-line imperative commit messages; CHANGELOG entry for
user-visible changes per Keep a Changelog).

- [ ] **Step 2: Link it from README**

In `README.md`, in the `## Contributing` section, add as the first line:
`Contributions are welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md).`
(replacing the bare `Contributions are welcome.` sentence).

- [ ] **Step 3: Pre-commit and commit**

```bash
pre-commit run -a
git add CONTRIBUTING.md README.md
git commit -m "Add contributing guide"
```

### Task 4: Direct tests for AllauthClient

**Files:**
- Create: `src/client.test.ts`

**Interfaces:**
- Consumes: `AllauthClient`, `allauthV1Url` from `src/client.ts`; `AllauthTransportError` from `src/errors.ts`; `server` from `src/test/setup.ts`; `TEST_BASE_URL`, `v1` from `src/test/handlers.ts`.
- Produces: nothing consumed later; raises `client.ts` branch coverage.

- [ ] **Step 1: Write the failing tests**

```ts
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import { server } from './test/setup'
import { TEST_BASE_URL, v1 } from './test/handlers'
import { AllauthClient, allauthV1Url } from './client'
import { AllauthTransportError } from './errors'

const client = new AllauthClient({ baseUrl: TEST_BASE_URL })

function clearCsrfCookie() {
  document.cookie = 'csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
}

afterEach(clearCsrfCookie)

describe('allauthV1Url', () => {
  it('builds the versioned endpoint prefix', () => {
    expect(allauthV1Url('https://api.example.com')).toBe(
      'https://api.example.com/_allauth/browser/v1',
    )
  })
})

describe('AllauthClient.request', () => {
  it('sends the CSRF cookie as X-CSRFToken on mutating requests only', async () => {
    document.cookie = 'csrftoken=tok-123'
    const seen: Record<string, string | null> = {}
    server.use(
      http.get(`${v1}/config`, ({ request }) => {
        seen.get = request.headers.get('X-CSRFToken')
        return HttpResponse.json({ status: 200, data: {} })
      }),
      http.post(`${v1}/auth/login`, ({ request }) => {
        seen.post = request.headers.get('X-CSRFToken')
        return HttpResponse.json({ status: 200, data: {} })
      }),
    )

    await client.request('GET', '/config')
    await client.request('POST', '/auth/login', { email: 'a@b.c' })

    expect(seen.get).toBeNull()
    expect(seen.post).toBe('tok-123')
  })

  it('only sets Content-Type when a body is sent', async () => {
    const seen: Record<string, string | null> = {}
    server.use(
      http.delete(`${v1}/auth/session`, ({ request }) => {
        seen.noBody = request.headers.get('Content-Type')
        return HttpResponse.json({ status: 200, data: {} })
      }),
      http.post(`${v1}/auth/login`, ({ request }) => {
        seen.body = request.headers.get('Content-Type')
        return HttpResponse.json({ status: 200, data: {} })
      }),
    )

    await client.request('DELETE', '/auth/session')
    await client.request('POST', '/auth/login', {})

    expect(seen.noBody).toBeNull()
    expect(seen.body).toBe('application/json')
  })

  it('wraps network failures in AllauthTransportError', async () => {
    server.use(http.get(`${v1}/config`, () => HttpResponse.error()))

    const failure = client.request('GET', '/config')
    await expect(failure).rejects.toBeInstanceOf(AllauthTransportError)
    await expect(failure).rejects.toMatchObject({ status: undefined })
  })

  it('wraps non-JSON replies in AllauthTransportError with the HTTP status', async () => {
    server.use(
      http.get(`${v1}/config`, () =>
        HttpResponse.text('<html>Bad gateway</html>', { status: 502 }),
      ),
    )

    await expect(client.request('GET', '/config')).rejects.toMatchObject({
      name: 'AllauthTransportError',
      status: 502,
    })
  })

  it('rejects JSON replies that are not an allauth envelope', async () => {
    server.use(
      http.get(`${v1}/config`, () =>
        HttpResponse.json({ detail: 'not allauth' }, { status: 200 }),
      ),
    )

    await expect(client.request('GET', '/config')).rejects.toMatchObject({
      name: 'AllauthTransportError',
      status: 200,
    })
  })

  it('returns well-formed envelopes untouched, even for error statuses', async () => {
    server.use(
      http.get(`${v1}/config`, () =>
        HttpResponse.json(
          { status: 400, errors: [{ message: 'bad', code: 'invalid' }] },
          { status: 400 },
        ),
      ),
    )

    const response = await client.request('GET', '/config')
    expect(response.status).toBe(400)
    expect(response.errors?.[0]?.code).toBe('invalid')
  })
})
```

- [ ] **Step 2: Run and verify the new tests pass**

Run: `npx vitest run src/client.test.ts`
Expected: PASS (the client already implements all of this — these tests lock the behavior; if one fails, the test found a real bug: stop and investigate before touching the client).

- [ ] **Step 3: Pre-commit and commit**

```bash
pre-commit run -a
git add src/client.test.ts
git commit -m "Add direct tests for AllauthClient transport behavior"
```

### Task 5: Direct tests for useResource

**Files:**
- Create: `src/hooks/useResource.test.tsx`

**Interfaces:**
- Consumes: `useResource` from `src/hooks/useResource.ts` (`Resource<T>`: `{ data, loading, error, reload, setData }`).
- Produces: nothing consumed later; locks the stale-response contract.

- [ ] **Step 1: Write the tests**

```tsx
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useResource } from './useResource'

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason: Error) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useResource', () => {
  it('loads on mount and exposes the data', async () => {
    const { result } = renderHook(() => useResource(() => Promise.resolve('v1')))

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toBe('v1')
    expect(result.current.error).toBeNull()
  })

  it('surfaces a failed load as error and recovers on reload', async () => {
    let fail = true
    const { result } = renderHook(() =>
      useResource(() => (fail ? Promise.reject(new Error('boom')) : Promise.resolve('ok'))),
    )

    await waitFor(() => expect(result.current.error?.message).toBe('boom'))
    expect(result.current.data).toBeNull()

    fail = false
    await act(() => result.current.reload())
    expect(result.current.error).toBeNull()
    expect(result.current.data).toBe('ok')
  })

  it('ignores a stale reload resolving after a newer one', async () => {
    const calls: Deferred<string>[] = []
    const { result } = renderHook(() =>
      useResource(() => {
        const d = deferred<string>()
        calls.push(d)
        return d.promise
      }),
    )

    // Mount load resolves first so the hook settles.
    calls[0]!.resolve('mount')
    await waitFor(() => expect(result.current.data).toBe('mount'))

    // Two overlapping reloads: the older resolves LAST and must be ignored.
    let first: Promise<void>, second: Promise<void>
    act(() => {
      first = result.current.reload()
      second = result.current.reload()
    })
    calls[2]!.resolve('newer')
    await act(() => second)
    calls[1]!.resolve('older')
    await act(() => first)

    expect(result.current.data).toBe('newer')
  })

  it('ignores an in-flight load after the fetcher changes', async () => {
    const calls: Deferred<string>[] = []
    const fetcherA = () => {
      const d = deferred<string>()
      calls.push(d)
      return d.promise
    }
    const fetcherB = () => Promise.resolve('from-b')

    const { result, rerender } = renderHook(
      ({ fetcher }) => useResource(fetcher),
      { initialProps: { fetcher: fetcherA } },
    )

    rerender({ fetcher: fetcherB })
    await waitFor(() => expect(result.current.data).toBe('from-b'))

    // The abandoned fetcher-A load resolves late and must not win.
    calls[0]!.resolve('from-a')
    await act(async () => {})
    expect(result.current.data).toBe('from-b')
  })
})
```

- [ ] **Step 2: Run and verify**

Run: `npx vitest run src/hooks/useResource.test.tsx`
Expected: PASS (contract already implemented — a failure means a real bug; stop and investigate).

- [ ] **Step 3: Pre-commit and commit**

```bash
pre-commit run -a
git add src/hooks/useResource.test.tsx
git commit -m "Add direct tests for the useResource stale-response contract"
```

### Task 6: useSessions error paths

**Files:**
- Modify: `src/hooks/useSessions.test.tsx` (append tests to the existing `describe`)

**Interfaces:**
- Consumes: existing helpers in the file (`session(id, isCurrent)`), `authenticatedSession`, `v1`, `server`, `wrapper`.

- [ ] **Step 1: Append the tests**

Inside the existing `describe('useSessions', ...)` block add:

```tsx
  it('returns an empty list without calling the API when anonymous', async () => {
    let called = false
    server.use(
      http.get(`${v1}/auth/sessions`, () => {
        called = true
        return HttpResponse.json({ status: 200, data: [] })
      }),
    )

    const { result } = renderHook(() => useSessions(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.sessions).toEqual([])
    expect(called).toBe(false)
  })

  it('surfaces a failed list as error', async () => {
    server.use(
      authenticatedSession(),
      http.get(`${v1}/auth/sessions`, () =>
        HttpResponse.json(
          { status: 500, errors: [{ message: 'boom', code: 'server_error' }] },
          { status: 500 },
        ),
      ),
    )

    const { result } = renderHook(() => useSessions(), { wrapper })

    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.sessions).toEqual([])
    expect(result.current.loading).toBe(false)
  })

  it('throws from revoke and keeps the list on failure', async () => {
    server.use(
      authenticatedSession(),
      http.get(`${v1}/auth/sessions`, () =>
        HttpResponse.json({ status: 200, data: [session(1, true), session(2)] }),
      ),
      http.delete(`${v1}/auth/sessions`, () =>
        HttpResponse.json(
          { status: 400, errors: [{ message: 'cannot revoke', code: 'invalid' }] },
          { status: 400 },
        ),
      ),
    )

    const { result } = renderHook(() => useSessions(), { wrapper })
    await waitFor(() => expect(result.current.sessions).toHaveLength(2))

    await expect(
      act(() => result.current.revoke(result.current.sessions[1]!)),
    ).rejects.toMatchObject({ name: 'AllauthRequestError' })
    expect(result.current.sessions).toHaveLength(2)
  })
```

- [ ] **Step 2: Run and verify**

Run: `npx vitest run src/hooks/useSessions.test.tsx`
Expected: 4 tests PASS.

- [ ] **Step 3: Pre-commit and commit**

```bash
pre-commit run -a
git add src/hooks/useSessions.test.tsx
git commit -m "Cover useSessions error paths and anonymous state"
```

### Task 7: useWebAuthn error paths

**Files:**
- Modify: `src/hooks/useWebAuthn.test.tsx` (append tests; reuse the existing `vi.mock` and `publicKey` fixtures)

**Interfaces:**
- Consumes: existing `fakeCredential`, `publicKey`, mocked `@simplewebauthn/browser`.

- [ ] **Step 1: Append the tests**

```tsx
  it('throws AllauthRequestError when creation options are missing', async () => {
    server.use(
      http.get(`${v1}/account/authenticators/webauthn`, () =>
        HttpResponse.json(
          { status: 401, errors: [{ message: 'reauth required', code: 'reauthentication_required' }] },
          { status: 401 },
        ),
      ),
    )

    const { result } = renderHook(() => useWebAuthn(), { wrapper })

    await expect(act(() => result.current.register('Key'))).rejects.toMatchObject({
      name: 'AllauthRequestError',
      status: 401,
    })
  })

  it('throws AllauthRequestError when request options are missing', async () => {
    server.use(
      http.get(`${v1}/auth/webauthn/login`, () =>
        HttpResponse.json({ status: 200, data: {} }),
      ),
    )

    const { result } = renderHook(() => useWebAuthn(), { wrapper })

    await expect(act(() => result.current.login())).rejects.toMatchObject({
      name: 'AllauthRequestError',
    })
  })

  it('surfaces a rejected registration ceremony', async () => {
    server.use(
      http.get(`${v1}/account/authenticators/webauthn`, () =>
        HttpResponse.json({ status: 200, data: { creation_options: { publicKey } } }),
      ),
      http.post(`${v1}/account/authenticators/webauthn`, () =>
        HttpResponse.json(
          { status: 400, errors: [{ message: 'invalid credential', code: 'invalid' }] },
          { status: 400 },
        ),
      ),
    )

    const { result } = renderHook(() => useWebAuthn(), { wrapper })

    await expect(act(() => result.current.register('Key'))).rejects.toMatchObject({
      name: 'AllauthRequestError',
      status: 400,
    })
  })
```

- [ ] **Step 2: Run and verify**

Run: `npx vitest run src/hooks/useWebAuthn.test.tsx`
Expected: 5 tests PASS.

- [ ] **Step 3: Pre-commit and commit**

```bash
pre-commit run -a
git add src/hooks/useWebAuthn.test.tsx
git commit -m "Cover useWebAuthn error paths"
```

### Task 8: useSocialAuth error paths

**Files:**
- Modify: `src/hooks/useSocialAuth.test.tsx` (append tests, following the file's existing fixtures — read it first)

**Interfaces:**
- Consumes: `useSocialAuth` (`connections`, `disconnect(account)`, `authenticateByToken(providerId, token, process?)`).

- [ ] **Step 1: Append the tests**

Adapt fixture names to the existing file when appending:

```tsx
  it('returns no connections without calling the API when anonymous', async () => {
    let called = false
    server.use(
      http.get(`${v1}/account/providers`, () => {
        called = true
        return HttpResponse.json({ status: 200, data: [] })
      }),
    )

    const { result } = renderHook(() => useSocialAuth(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.connections).toEqual([])
    expect(called).toBe(false)
  })

  it('throws from disconnect and keeps connections on failure', async () => {
    const account = {
      uid: 'uid-1',
      display: 'Alice',
      provider: { id: 'dummy', name: 'Dummy', flows: ['provider_redirect'] },
    }
    server.use(
      authenticatedSession(),
      http.get(`${v1}/account/providers`, () =>
        HttpResponse.json({ status: 200, data: [account] }),
      ),
      http.delete(`${v1}/account/providers`, () =>
        HttpResponse.json(
          { status: 400, errors: [{ message: 'last account', code: 'invalid' }] },
          { status: 400 },
        ),
      ),
    )

    const { result } = renderHook(() => useSocialAuth(), { wrapper })
    await waitFor(() => expect(result.current.connections).toHaveLength(1))

    await expect(
      act(() => result.current.disconnect(result.current.connections[0]!)),
    ).rejects.toMatchObject({ name: 'AllauthRequestError' })
    expect(result.current.connections).toHaveLength(1)
  })
```

- [ ] **Step 2: Run and verify**

Run: `npx vitest run src/hooks/useSocialAuth.test.tsx`
Expected: 5 tests PASS.

- [ ] **Step 3: Pre-commit and commit**

```bash
pre-commit run -a
git add src/hooks/useSocialAuth.test.tsx
git commit -m "Cover useSocialAuth anonymous and disconnect error paths"
```

### Task 9: useConfig transport error and reload

**Files:**
- Modify: `src/hooks/useConfig.test.tsx` (append tests)

**Interfaces:**
- Consumes: `useConfig` (`config`, `loading`, `error`, `reload`); `AllauthTransportError` from `src/errors.ts`.

- [ ] **Step 1: Append the tests**

```tsx
  it('surfaces non-JSON replies as AllauthTransportError', async () => {
    server.use(
      http.get(`${v1}/config`, () =>
        HttpResponse.text('<html>Bad gateway</html>', { status: 502 }),
      ),
    )

    const { result } = renderHook(() => useConfig(), { wrapper })

    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.error).toBeInstanceOf(AllauthTransportError)
    expect(result.current.config).toBeNull()
  })

  it('reload refetches the configuration', async () => {
    let signupOpen = false
    server.use(
      http.get(`${v1}/config`, () =>
        HttpResponse.json({
          status: 200,
          data: { account: { authentication_method: 'email', is_open_for_signup: signupOpen } },
        }),
      ),
    )

    const { result } = renderHook(() => useConfig(), { wrapper })
    await waitFor(() => expect(result.current.config).not.toBeNull())
    expect(result.current.config?.account.is_open_for_signup).toBe(false)

    signupOpen = true
    await act(() => result.current.reload())
    expect(result.current.config?.account.is_open_for_signup).toBe(true)
  })
```

Add the imports the file is missing: `act` from `@testing-library/react` and `AllauthTransportError` from `../errors`.

- [ ] **Step 2: Run and verify**

Run: `npx vitest run src/hooks/useConfig.test.tsx`
Expected: 4 tests PASS.

- [ ] **Step 3: Pre-commit and commit**

```bash
pre-commit run -a
git add src/hooks/useConfig.test.tsx
git commit -m "Cover useConfig transport errors and reload"
```

### Task 10: Raise the coverage thresholds

**Files:**
- Modify: `vitest.config.ts` (thresholds only)

**Interfaces:**
- Consumes: `npm run test:coverage` from Task 1 and all tests from Tasks 4-9.

- [ ] **Step 1: Measure**

Run: `npm run test:coverage`
Expected: all tests pass; note the `src/` lines/statements percentages.

- [ ] **Step 2: Raise the thresholds**

Set `thresholds.lines` and `thresholds.statements` to the spec floor of 85, or
to (measured - 2) if the measured value exceeds 87. Add `branches` and
`functions` at (measured - 5) as a regression floor.

- [ ] **Step 3: Verify the gate still passes**

Run: `npm run test:coverage`
Expected: exit 0 with thresholds enforced.

- [ ] **Step 4: Full local CI parity check**

Run: `npm run lint && npm run typecheck && npm run build && pre-commit run -a`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts
git commit -m "Raise coverage thresholds after test hardening"
```
