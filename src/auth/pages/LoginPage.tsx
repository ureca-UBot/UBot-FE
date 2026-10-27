import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AuthLayout } from '../components/AuthLayout'
import { PasswordField } from '../components/PasswordField'

function getDestination(role: 'USER' | 'ADMIN' | 'COUNSELOR') {
  return role === 'ADMIN' ? '/admin/dashboard' : role === 'COUNSELOR' ? '/counselor' : '/'
}

export function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isInitializing, login, user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const didSignupSucceed = new URLSearchParams(location.search).get('signup') === 'success'

  if (!isInitializing && user) return <Navigate replace to={getDestination(user.role)} />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const loggedInUser = await login({ email, password })
      navigate(getDestination(loggedInUser.role), { replace: true })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '로그인에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout mode="login">
      {didSignupSucceed && (
        <p className="auth-feedback auth-feedback--success" role="status">
          회원가입이 완료되었습니다. 로그인해 주세요.
        </p>
      )}
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          이메일
          <input
            autoComplete="email"
            name="email"
            placeholder="이메일 주소"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <PasswordField
          label="비밀번호"
          name="password"
          autoComplete="current-password"
          placeholder="비밀번호"
          onChange={(event) => setPassword(event.target.value)}
          value={password}
        />
        {errorMessage && (
          <p className="auth-feedback auth-feedback--error" role="alert">
            {errorMessage}
          </p>
        )}
        <button className="auth-submit" disabled={isSubmitting || isInitializing} type="submit">
          {isSubmitting ? '로그인 중...' : '로그인'}
        </button>
      </form>
      <div className="auth-switch">
        <span>아직 계정이 없으신가요?</span>
        <Link to="/auth/signup">
          회원가입 <span aria-hidden="true">›</span>
        </Link>
      </div>
    </AuthLayout>
  )
}
