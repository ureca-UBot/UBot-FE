import { Navigate } from 'react-router-dom'
import { LogoutButton } from '../../auth/components/LogoutButton'
import { useAuth } from '../../auth/hooks/useAuth'

export function UserHomePage() {
  const { isInitializing, user } = useAuth()

  if (isInitializing) return <main className="login-page">로그인 상태를 확인하는 중입니다.</main>
  if (!user) return <Navigate replace to="/auth/login" />
  if (user.role === 'ADMIN') return <Navigate replace to="/admin/dashboard" />

  return (
    <main className="login-page">
      <section className="login-card">
        <h1>환영합니다</h1>
        <p>일반 사용자 화면은 다음 단계에서 구현할 수 있습니다.</p>
        <div className="user-home-actions">
          <LogoutButton />
        </div>
      </section>
    </main>
  )
}
