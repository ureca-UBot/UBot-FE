import type { ReactNode } from 'react'
import '../styles/auth.css'

interface AuthLayoutProps {
  mode: 'login' | 'signup'
  children: ReactNode
}

export function AuthLayout({ mode, children }: AuthLayoutProps) {
  const isSignup = mode === 'signup'
  const titleId = `${mode}-title`

  return (
    <div className="auth-page">
      <main
        className={`auth-main${isSignup ? ' auth-main--signup' : ''}`}
        aria-labelledby={titleId}
      >
        <div className="auth-heading">
          <h1 id={titleId}>{isSignup ? '회원가입' : '로그인'}</h1>
          <p>
            {isSignup ? '가입에 필요한 정보를 입력해 주세요.' : 'U봇 계정으로 로그인해 주세요.'}
          </p>
        </div>
        {children}
      </main>
    </div>
  )
}
