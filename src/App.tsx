import { lazy, Suspense } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { RequireAdmin } from './admin/routes/RequireAdmin'
import './App.css'
import { AuthProvider } from './auth/context/AuthProvider'
import { LoginPage } from './auth/pages/LoginPage'
import { ChatProvider } from './user/ai/context/ChatProvider'
import { UserSignupPage } from './user/auth/pages/UserSignupPage'
import { MyProfileProvider } from './user/my/context/MyProfileProvider'
import { NotificationUnreadProvider } from './user/notification/context/NotificationUnreadProvider'

const AdminApp = lazy(() => import('./admin/AdminApp'))
const UserApp = lazy(() => import('./user/UserApp'))

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <ChatProvider>
          <Suspense fallback={null}>
            <Routes>
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/signup" element={<UserSignupPage />} />
              <Route element={<RequireAdmin />}>
                <Route path="/admin/*" element={<AdminApp />} />
              </Route>
              <Route
                path="/*"
                element={
                  <MyProfileProvider>
                    <NotificationUnreadProvider>
                      <UserApp />
                    </NotificationUnreadProvider>
                  </MyProfileProvider>
                }
              />
            </Routes>
          </Suspense>
        </ChatProvider>
      </AuthProvider>
    </HashRouter>
  )
}

export default App
