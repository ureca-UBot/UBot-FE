import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function getDestination(role: 'USER' | 'ADMIN') {
  return role === 'ADMIN' ? '/admin/dashboard' : '/user'
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
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <h1 id="login-title">UBot 로그인</h1>
        {didSignupSucceed && <p className="login-success" role="status">회원가입이 완료되었습니다. 로그인해 주세요.</p>}
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            이메일
            <input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
          </label>
          <label>
            비밀번호
            <input autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
          </label>
          {errorMessage && <p className="login-error" role="alert">{errorMessage}</p>}
          <button className="primary-button" disabled={isSubmitting || isInitializing} type="submit">
            {isSubmitting ? '로그인 중...' : '로그인'}
          </button>
        </form>
        <p className="auth-page-link">계정이 없으신가요? <Link to="/auth/signup">회원가입</Link></p>
      </section>
    </main>
  )
}
