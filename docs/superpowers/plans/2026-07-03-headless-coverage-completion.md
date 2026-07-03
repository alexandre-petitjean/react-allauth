# Headless Coverage Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the four endpoint gaps found by the OpenAPI diff: login by code, resend of the signup verification email, WebAuthn authenticator management (rename/delete), and passkey signup.

**Architecture:** Same layering as every existing feature: `AllauthClient` methods → hook methods following the two established conventions — *flow methods* return the envelope through `applyResponse` without throwing on API errors; *mutations* `ensureOk`/`ensureData` and throw `AllauthRequestError`. Critical nuance from the audit: the two `resend` endpoints return a bare 200 `APIResponse` with no session payload — running them through `applyResponse` would clobber the pending-flow session state, so they are mutations.

**Contracts (verified against allauth 65.x source in the playground container):**
- `POST /auth/code/request` body `{email}` → 401 envelope with pending `login_by_code` flow.
- `POST /auth/code/confirm` body `{code}` → auth response.
- `POST /auth/code/resend` no body → 200/409/429.
- `PUT /account/authenticators/webauthn` body `{id, name}` → updated authenticator in `data`.
- `DELETE /account/authenticators/webauthn` body `{authenticators: [ids]}` → 200.
- `POST /auth/email/verify/resend` no body → 200/409/429.
- `POST /auth/webauthn/signup` body: signup data (email) → pending `mfa_signup_webauthn`.
- `GET /auth/webauthn/signup` → `{creation_options: {publicKey}}`.
- `PUT /auth/webauthn/signup` body `{name?, credential}` → auth response.

## Global Constraints

- Commit messages: single line, imperative. `pre-commit run -a` (with nvm PATH) before each commit.
- TDD per task: failing tests first, then implementation. Rejected promises are never wrapped in `act()`.
- Types: `FlowId` already contains `login_by_code` and `mfa_signup_webauthn`; no type changes expected beyond result interfaces.
- Playground/e2e only for the flows Mailpit can drive (login by code, resend); passkey UI needs a virtual authenticator — recorded as follow-up, not in this plan.

---

### Task 1: Login by code

**Files:** `src/client.ts`, `src/hooks/useAuth.ts`, `src/hooks/useAuth.test.tsx`.

**Interfaces produced:**
- `client.requestLoginCode(email): Promise<AuthFlowResponse>`, `client.confirmLoginCode(code): Promise<AuthFlowResponse>`, `client.resendLoginCode(): Promise<AllauthResponse>`.
- `useAuth()`: `requestLoginCode(email)` / `confirmLoginCode(code)` (flow methods via `applyResponse`), `resendLoginCode(): Promise<void>` (mutation, `ensureOk`).

Tests (append to useAuth.test.tsx, reusing its fixtures): (1) request → MSW returns 401 `{data:{flows:[{id:'login_by_code',is_pending:true}]}, meta:{is_authenticated:false}}` → `flow.current.id === 'login_by_code'`; confirm → 200 authenticated → `status === 'authenticated'`. (2) resend on 429 envelope rejects with `AllauthRequestError` and does not change `status`/`flow`.

### Task 2: Resend signup verification email

**Files:** `src/client.ts`, `src/hooks/useEmails.ts`, `src/hooks/useEmails.test.tsx`.

**Interfaces produced:**
- `client.resendVerificationEmail(): Promise<AllauthResponse>`.
- `useEmails().resendVerification(): Promise<void>` — mutation (`ensureOk`); distinct from `requestVerification(email)` which targets a specific address on an authenticated account.

Tests: (1) resolves on 200 and hits the endpoint; (2) rejects `AllauthRequestError` on 409 (no pending verification stage).

### Task 3: WebAuthn authenticator management

**Files:** `src/client.ts`, `src/hooks/useWebAuthn.ts`, `src/hooks/useWebAuthn.test.tsx`.

**Interfaces produced:**
- `client.renameWebAuthn(id: number, name: string): Promise<AllauthResponse<WebAuthnAuthenticator>>`, `client.removeWebAuthn(ids: number[]): Promise<AllauthResponse>`.
- `useWebAuthn().rename(id: number, name: string): Promise<WebAuthnAuthenticator>` (`ensureData`), `useWebAuthn().remove(ids: number[]): Promise<void>` (`ensureOk`). Callers refresh the list via `useMFA().reload()`.

Tests: (1) rename posts `{id, name}` via PUT and returns the updated authenticator; (2) remove sends `{authenticators: ids}` via DELETE; (3) remove rejects with `AllauthRequestError` on 400 (raw promise, no act).

### Task 4: Passkey signup

**Files:** `src/client.ts`, `src/hooks/useWebAuthn.ts`, `src/hooks/useWebAuthn.test.tsx`.

**Interfaces produced:**
- `client.signupWebAuthn(data: SignupData)`, `client.getWebAuthnSignupOptions()`, `client.completeWebAuthnSignup(name: string | undefined, credential: RegistrationResponseJSON)`.
- `useWebAuthn().signup(data: SignupData, name?: string): Promise<AuthFlowResponse>` — full ceremony: POST data → GET creation options (missing `publicKey` throws `AllauthRequestError`) → `startRegistration` → PUT credential → `applyResponse`.

Tests: (1) happy path — the three endpoints hit in order, mocked `startRegistration` credential forwarded in the PUT body, returns the auth envelope; (2) missing creation options → rejects `AllauthRequestError` (raw promise).

### Task 5: Playground, e2e and docs

**Files:** `playground/components/LoginByCodeForm.tsx` (new), `playground/components/AuthDemo.tsx`, `playground/components/VerifyEmailForm.tsx` (resend button), `e2e/auth.spec.ts`, `CHANGELOG.md`, `README.md`, `docs/site/hooks/use-auth.md`, `use-emails.md`, `use-webauthn.md`.

- `LoginByCodeForm`: email field + "Send code" (`requestLoginCode`); when `flow.current.id === 'login_by_code'`, code field + "Confirm" (`confirmLoginCode`) + "Resend" button. Rendered in the unauthenticated branch of AuthDemo under the login form. Same `form`/`form-errors` markup conventions.
- `VerifyEmailForm`: add a secondary "Resend code" button calling `resendVerification()` (errors surfaced in the same list).
- e2e: (1) login by code with the seeded user — request, fetch code from Mailpit (`latestCodeFor`), confirm, expect "Signed in as"; (2) in the signup scenario, click "Resend code" and assert a second Mailpit message arrives before verifying (extend the helper if needed to count messages).
- CHANGELOG `[Unreleased]` Added entries; also reword the 0.2.0 line "the last gap in the headless API contract" → "completing the 2FA login flow". README hooks table rows for `useAuth`/`useWebAuthn`. Docs pages updated with the new methods.
- Full gate: lint, typecheck, coverage, build, docs:build, e2e.
