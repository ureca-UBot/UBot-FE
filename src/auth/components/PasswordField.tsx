import { useId, useState, type ChangeEventHandler } from 'react'

interface PasswordFieldProps {
  label: string
  name: string
  value: string
  onChange: ChangeEventHandler<HTMLInputElement>
  autoComplete: 'current-password' | 'new-password'
  placeholder: string
  minLength?: number
  maxLength?: number
  validation?: {
    status: 'valid' | 'invalid'
    message: string
  }
}

export function PasswordField({ label, validation, ...inputProps }: PasswordFieldProps) {
  const inputId = useId()
  const [visible, setVisible] = useState(false)
  const [touched, setTouched] = useState(false)
  const feedback =
    validation && (touched || (inputProps.value.length > 0 && validation.status === 'valid'))
      ? validation
      : undefined
  const feedbackId = `${inputId}-feedback`

  return (
    <div className="auth-field">
      <label htmlFor={inputId}>{label}</label>
      <div
        className={`auth-password${validation ? ' auth-password--validated' : ''}${feedback ? ` auth-password--${feedback.status}` : ''}`}
      >
        <input
          {...inputProps}
          id={inputId}
          required
          type={visible ? 'text' : 'password'}
          onBlur={() => setTouched(true)}
          onInvalid={() => setTouched(true)}
          aria-invalid={feedback?.status === 'invalid' || undefined}
          aria-describedby={feedback ? feedbackId : undefined}
        />
        {feedback && (
          <span
            id={feedbackId}
            className={`auth-password-status auth-password-status--${feedback.status}`}
            title={feedback.message}
            aria-live="polite"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {feedback.status === 'valid' ? (
                <path d="m5 12 4 4L19 6" />
              ) : (
                <path d="m6 6 12 12M18 6 6 18" />
              )}
            </svg>
            <span className="auth-password-status-text">{feedback.message}</span>
          </span>
        )}
        <button
          className="auth-password-toggle"
          type="button"
          aria-label={`${label} 표시`}
          aria-pressed={visible}
          aria-controls={inputId}
          onClick={() => setVisible((current) => !current)}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
            {visible && <path d="m3 3 18 18" />}
          </svg>
        </button>
      </div>
    </div>
  )
}
