import { useState, type FormEvent } from 'react'
import { useEmails } from 'react-allauth'
import type { AllauthError } from 'react-allauth'

/** Enter the verification code emailed after signup (verification by code). */
export function VerifyEmailForm() {
  const { verify, resendVerification } = useEmails()
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

  async function handleResend() {
    setErrors([])
    try {
      await resendVerification()
    } catch {
      setErrors([{ message: 'Could not resend the code.', code: 'resend_failed' }])
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
      <button
        className="button"
        type="button"
        onClick={() => void handleResend()}
      >
        Resend code
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
