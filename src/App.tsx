import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DashboardPage } from './admin/dashboard/pages/DashboardPage'
import { FaqListPage } from './admin/faq/pages/FaqListPage'
import { AdminLayout } from './admin/layout/AdminLayout'
import { RequireAdmin } from './admin/routes/RequireAdmin'
import { AuthProvider } from './auth/context/AuthProvider'
import { LoginPage } from './auth/pages/LoginPage'
import { UserSignupPage } from './user/auth/pages/UserSignupPage'
import { UserHomePage } from './user/pages/UserHomePage'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/signup" element={<UserSignupPage />} />
          <Route path="/user" element={<UserHomePage />} />
          <Route element={<RequireAdmin />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate replace to="dashboard" />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="faqs" element={<FaqListPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate replace to="/admin" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
