import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/hooks/useAuth'

export function RequireAdmin() {
  const location = useLocation()
  const { isInitializing, user } = useAuth()

  if (isInitializing) return <main className="login-page">로그인 상태를 확인하는 중입니다.</main>
  if (user?.role !== 'ADMIN') return <Navigate replace state={{ from: location }} to="/auth/login" />

  return <Outlet />
}
