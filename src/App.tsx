import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DashboardPage } from './admin/pages/dashboard/DashboardPage.tsx'
import { FaqDetailPage } from './admin/pages/faq/FaqDetailPage'
import { FaqLayout } from './admin/pages/faq/FaqLayout'
import { FaqListPage } from './admin/pages/faq/FaqListPage'
import { DeletedFaqListPage } from './admin/pages/faq/DeletedFaqListPage'
import { FaqCategoryListPage } from './admin/pages/faq/FaqCategoryListPage'
import { StoreListPage } from './admin/pages/store/StoreListPage'
import { AdminLayout } from './admin/layout/AdminLayout'
import { RequireAdmin } from './admin/routes/RequireAdmin'
import { AuthProvider } from './auth/context/AuthProvider'
import { LoginPage } from './auth/pages/LoginPage'
import { UserSignupPage } from './user/auth/pages/UserSignupPage'
import UserApp from './user/UserApp'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* 인증 */}
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/signup" element={<UserSignupPage />} />

          {/* 관리자 - 인증 필요 */}
          <Route element={<RequireAdmin />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate replace to="dashboard" />} />
              <Route path="dashboard" element={<DashboardPage />} />

              <Route path="faqs" element={<FaqLayout />}>
                <Route index element={<FaqListPage />} />
                <Route path="deleted" element={<DeletedFaqListPage />} />
                <Route path="categories" element={<FaqCategoryListPage />} />
                <Route path=":faqId" element={<FaqDetailPage />} />
              </Route>
              <Route path="stores" element={<StoreListPage />} />

              <Route path="*" element={<Navigate replace to="dashboard" />} />
            </Route>
          </Route>

          {/* 일반 사용자 - 공개 */}
          <Route path="/*" element={<UserApp />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
