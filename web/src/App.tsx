import { useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { AdminRoute, ProtectedRoute, SupplierRoute } from './components/ProtectedRoute'
import { ConsoleLayout } from './layouts/ConsoleLayout'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { ProfilePage } from './pages/ProfilePage'
import { ApiKeysPage } from './pages/ApiKeysPage'
import { SettingsPage } from './pages/SettingsPage'
import { WebhooksPage } from './pages/WebhooksPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { OrdersPage } from './pages/OrdersPage'
import { BalancePage } from './pages/BalancePage'
import { SupplierResourcesPage } from './pages/SupplierResourcesPage'
import { SupplierOfferingsPage } from './pages/SupplierOfferingsPage'
import { SupplierSettlementsPage } from './pages/SupplierSettlementsPage'
import { SupplierDomainsPage } from './pages/SupplierDomainsPage'
import { AdminProjectsPage } from './pages/AdminProjectsPage'
import { AdminUsersPage } from './pages/AdminUsersPage'
import { AdminSuppliersPage } from './pages/AdminSuppliersPage'
import { ApiDocsPage } from './pages/ApiDocsPage'
import { AdminRiskPage } from './pages/AdminRiskPage'
import { AdminAuditPage } from './pages/AdminAuditPage'
import { getCurrentUser, getMenu, logoutSession } from './services/auth'
import { useAuthStore } from './store/authStore'

function Shell() {
  const navigate = useNavigate()
  const { token, refreshToken, logout, setMenu, setUser } = useAuthStore()

  useEffect(() => {
    if (!token) {
      return
    }

    let active = true

    Promise.all([getCurrentUser(), getMenu()])
      .then(([currentUser, menu]) => {
        if (!active) {
          return
        }
        setUser(currentUser.user)
        setMenu(menu.items)
      })
      .catch(async () => {
        if (!active) {
          return
        }
        try {
          if (refreshToken) {
            await logoutSession(refreshToken)
          }
        } catch {
          // ignore bootstrap logout failures
        }
        logout()
        navigate('/login', { replace: true })
      })

    return () => {
      active = false
    }
  }, [logout, navigate, refreshToken, setMenu, setUser, token])

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await logoutSession(refreshToken)
      }
    } catch {
      // ignore network failures during local sign-out
    }
    logout()
    navigate('/login')
  }

  return (
    <ConsoleLayout onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/balance" element={<BalancePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/api-keys" element={<ApiKeysPage />} />
        <Route path="/webhooks" element={<AdminRoute><WebhooksPage /></AdminRoute>} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/supplier/domains" element={<SupplierRoute><SupplierDomainsPage /></SupplierRoute>} />
        <Route path="/supplier/resources" element={<SupplierRoute><SupplierResourcesPage /></SupplierRoute>} />
        <Route path="/supplier/offerings" element={<SupplierRoute><SupplierOfferingsPage /></SupplierRoute>} />
        <Route path="/supplier/settlements" element={<SupplierRoute><SupplierSettlementsPage /></SupplierRoute>} />
        <Route path="/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
        <Route path="/admin/suppliers" element={<AdminRoute><AdminSuppliersPage /></AdminRoute>} />
        <Route path="/admin/pricing" element={<AdminRoute><AdminProjectsPage /></AdminRoute>} />
        <Route path="/admin/risk" element={<AdminRoute><AdminRiskPage /></AdminRoute>} />
        <Route path="/admin/audit" element={<AdminRoute><AdminAuditPage /></AdminRoute>} />
        <Route path="/docs" element={<ApiDocsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ConsoleLayout>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={<ProtectedRoute><Shell /></ProtectedRoute>} />
    </Routes>
  )
}
