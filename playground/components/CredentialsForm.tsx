import { useState, type FormEvent } from 'react'
import type { AllauthError, AuthFlowResponse } from 'react-allauth'

interface CredentialsFormProps {
  title: string
  submitLabel: string
  onSubmit: (credentials: {
    email: string
    password: string
  }) => Promise<AuthFlowResponse>
}

/** Reusable email/password form used for both login and signup. */
export function CredentialsForm({
  title,
  submitLabel,
  onSubmit,
}: CredentialsFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<AllauthError[]>([])
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setErrors([])
    try {
      const response = await onSubmit({ email, password })
      setErrors(response.errors ?? [])
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="form" onSubmit={(event) => void handleSubmit(event)}>
      <h2>{title}</h2>
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
      <label className="field">
        Password
        <input
          type="password"
          value={password}
          required
          autoComplete="current-password"
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <button className="button" type="submit" disabled={submitting}>
        {submitting ? '…' : submitLabel}
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
