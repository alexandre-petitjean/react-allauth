import { useState, type FormEvent } from 'react'
import { useAuth } from 'react-allauth'
import type { AllauthError } from 'react-allauth'

/** Passwordless login: request a one-time code by email, then confirm it. */
export function LoginByCodeForm() {
  const { flow, requestLoginCode, confirmLoginCode, resendLoginCode } = useAuth()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [errors, setErrors] = useState<AllauthError[]>([])
  const [submitting, setSubmitting] = useState(false)

  const pending = flow?.current?.id === 'login_by_code'

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setErrors([])
    try {
      const response = pending
        ? await confirmLoginCode(code)
        : await requestLoginCode(email)
      setErrors(response.errors ?? [])
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend() {
    setErrors([])
    try {
      await resendLoginCode()
    } catch {
      setErrors([{ message: 'Could not resend the code.', code: 'resend_failed' }])
    }
  }

  return (
    <form className="form" onSubmit={(event) => void handleSubmit(event)}>
      <h2>Log in by code</h2>
      {pending ? (
        <>
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
            {submitting ? '…' : 'Confirm code'}
          </button>
          <button
            className="button"
            type="button"
            onClick={() => void handleResend()}
          >
            Resend code
          </button>
        </>
      ) : (
        <>
          <label className="field">
            Email
            <input
              type="email"
              value={email}
              required
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <button className="button" type="submit" disabled={submitting}>
            {submitting ? '…' : 'Send code'}
          </button>
        </>
      )}
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
