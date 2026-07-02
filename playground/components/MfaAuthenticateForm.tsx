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
