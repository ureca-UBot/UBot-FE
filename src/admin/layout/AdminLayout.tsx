import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { AdminHeader } from './AdminHeader'
import { AdminSidebar } from './AdminSidebar'

export function AdminLayout() {
  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <AdminHeader />
        <main className="admin-content">
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
