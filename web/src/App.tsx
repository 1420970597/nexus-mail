import { useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { AdminRoute, ProtectedRoute, SupplierRoute } from './components/ProtectedRoute'
import { ConsoleLayout } from './layouts/ConsoleLayout'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { ProfilePage } from './pages/ProfilePage'
import { ApiKeysPage } from './pages/ApiKeysPage'
import { SettingsPage } from './pages/SettingsPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { OrdersPage } from './pages/OrdersPage'
import { BalancePage } from './pages/BalancePage'
import { SupplierResourcesPage } from './pages/SupplierResourcesPage'
import { SupplierSettlementsPage } from './pages/SupplierSettlementsPage'
import { AdminProjectsPage } from './pages/AdminProjectsPage'
import { AdminUsersPage } from './pages/AdminUsersPage'
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
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/supplier/domains" element={<SupplierRoute><PlaceholderPage title="域名管理" description="供应商域名池、Catch-All 与 MX 策略将在此统一管理。" /></SupplierRoute>} />
        <Route path="/supplier/resources" element={<SupplierRoute><SupplierResourcesPage /></SupplierRoute>} />
        <Route path="/supplier/settlements" element={<SupplierRoute><SupplierSettlementsPage /></SupplierRoute>} />
        <Route path="/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
        <Route path="/admin/suppliers" element={<AdminRoute><PlaceholderPage title="供应商管理" description="管理员供应商审核、评级与启停控制将在此实现。" /></AdminRoute>} />
        <Route path="/admin/pricing" element={<AdminRoute><AdminProjectsPage /></AdminRoute>} />
        <Route path="/admin/risk" element={<AdminRoute><PlaceholderPage title="风控中心" description="Phase 5 将在此接入高频取消、高频超时与黑名单规则。" /></AdminRoute>} />
        <Route path="/admin/audit" element={<AdminRoute><PlaceholderPage title="审计日志" description="管理员审计日志、操作轨迹与异常事件将在此查看。" /></AdminRoute>} />
        <Route path="/docs" element={<PlaceholderPage title="API 文档" description="Phase 5 将用 OpenAPI + Redoc 在此接入正式 API 文档页面。" />} />
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
