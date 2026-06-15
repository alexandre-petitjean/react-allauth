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
    <form
      onSubmit={(event) => void handleSubmit(event)}
      style={{ display: 'grid', gap: '0.5rem' }}
    >
      <h2>{title}</h2>
      <label style={{ display: 'grid', gap: '0.25rem' }}>
        Email
        <input
          type="email"
          value={email}
          required
          autoComplete="email"
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <label style={{ display: 'grid', gap: '0.25rem' }}>
        Password
        <input
          type="password"
          value={password}
          required
          autoComplete="current-password"
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <button type="submit" disabled={submitting}>
        {submitting ? '…' : submitLabel}
      </button>
      {errors.length > 0 && (
        <ul style={{ color: '#b00020', margin: 0 }}>
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
