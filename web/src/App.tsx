import { lazy, Suspense, useEffect, useRef } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AdminRoute, ProtectedRoute, SupplierRoute } from './components/ProtectedRoute'
import { ConsoleLayout } from './layouts/ConsoleLayout'
import { getCurrentUser, getMenu, logoutSession } from './services/auth'
import { useAuthStore } from './store/authStore'
import {
  ADMIN_AUDIT_ROUTE,
  ADMIN_PRICING_ROUTE,
  ADMIN_RISK_ROUTE,
  ADMIN_SUPPLIERS_ROUTE,
  ADMIN_USERS_ROUTE,
  API_KEYS_ROUTE,
  BALANCE_ROUTE,
  DASHBOARD_ROUTE,
  DEFAULT_LOGIN_ROUTE,
  DEFAULT_SHARED_ROUTE,
  DOCS_ROUTE,
  ORDERS_ROUTE,
  PROFILE_ROUTE,
  PROJECTS_ROUTE,
  SETTINGS_ROUTE,
  SUPPLIER_DOMAINS_ROUTE,
  SUPPLIER_OFFERINGS_ROUTE,
  SUPPLIER_RESOURCES_ROUTE,
  SUPPLIER_SETTLEMENTS_ROUTE,
  WEBHOOKS_ROUTE,
  resolveBootstrapConsoleRoute,
} from './utils/consoleNavigation'

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const LoginPage = lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((module) => ({ default: module.ProfilePage })))
const ApiKeysPage = lazy(() => import('./pages/ApiKeysPage').then((module) => ({ default: module.ApiKeysPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })))
const WebhooksPage = lazy(() => import('./pages/WebhooksPage').then((module) => ({ default: module.WebhooksPage })))
const ProjectsPage = lazy(() => import('./pages/ProjectsPage').then((module) => ({ default: module.ProjectsPage })))
const OrdersPage = lazy(() => import('./pages/OrdersPage').then((module) => ({ default: module.OrdersPage })))
const BalancePage = lazy(() => import('./pages/BalancePage').then((module) => ({ default: module.BalancePage })))
const SupplierResourcesPage = lazy(() => import('./pages/SupplierResourcesPage').then((module) => ({ default: module.SupplierResourcesPage })))
const SupplierOfferingsPage = lazy(() => import('./pages/SupplierOfferingsPage').then((module) => ({ default: module.SupplierOfferingsPage })))
const SupplierSettlementsPage = lazy(() => import('./pages/SupplierSettlementsPage').then((module) => ({ default: module.SupplierSettlementsPage })))
const SupplierDomainsPage = lazy(() => import('./pages/SupplierDomainsPage').then((module) => ({ default: module.SupplierDomainsPage })))
const AdminProjectsPage = lazy(() => import('./pages/AdminProjectsPage').then((module) => ({ default: module.AdminProjectsPage })))
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage').then((module) => ({ default: module.AdminUsersPage })))
const AdminSuppliersPage = lazy(() => import('./pages/AdminSuppliersPage').then((module) => ({ default: module.AdminSuppliersPage })))
const ApiDocsPage = lazy(() => import('./pages/ApiDocsPage').then((module) => ({ default: module.ApiDocsPage })))
const AdminRiskPage = lazy(() => import('./pages/AdminRiskPage').then((module) => ({ default: module.AdminRiskPage })))
const AdminAuditPage = lazy(() => import('./pages/AdminAuditPage').then((module) => ({ default: module.AdminAuditPage })))

function RouteFallback() {
  return <div aria-label="route-loading" />
}

function AuthBootstrapShell() {
  return (
    <div
      data-testid="auth-bootstrap-shell"
      style={{
        minHeight: 'calc(100vh - 156px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
      }}
    >
      <section
        role="region"
        aria-labelledby="auth-bootstrap-shell-heading"
        style={{
          width: 'min(520px, 100%)',
          borderRadius: 28,
          background: 'linear-gradient(180deg, rgba(15,16,17,0.94) 0%, rgba(25,26,27,0.92) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: 'rgba(0,0,0,0.28) 0px 16px 48px',
          padding: 28,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span
            style={{
              alignSelf: 'flex-start',
              borderRadius: 9999,
              background: 'rgba(94,106,210,0.18)',
              border: '1px solid rgba(113,112,255,0.26)',
              color: '#d0d6e0',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.02em',
              padding: '6px 12px',
            }}
          >
            共享控制台引导
          </span>
          <h2 id="auth-bootstrap-shell-heading" style={{ margin: 0, color: '#f7f8f8', fontSize: 24, lineHeight: 1.2 }}>
            正在恢复共享控制台
          </h2>
          <p style={{ margin: 0, color: 'rgba(208,214,224,0.78)', lineHeight: 1.7 }}>
            正在同步当前账号、角色菜单与深链落点，确保刷新页面后仍停留在同一套登录后工作台，而不是回退到错误角色页。
          </p>
        </div>
      </section>
    </div>
  )
}

function Shell() {
  const navigate = useNavigate()
  const location = useLocation()
  const initialPathRef = useRef(location.pathname)
  const redirectedOnceRef = useRef(false)
  const { token, refreshToken, bootstrapStatus, logout, setBootstrapStatus, setMenu, setUser } = useAuthStore()

  useEffect(() => {
    if (!token) {
      return
    }

    let active = true
    setBootstrapStatus('loading')

    Promise.all([getCurrentUser(), getMenu()])
      .then(([currentUser, menu]) => {
        if (!active) {
          return
        }
        setUser(currentUser.user)
        setMenu(menu.items)
        setBootstrapStatus('ready')
        if (!redirectedOnceRef.current && menu.role === currentUser.user.role) {
          const preferredRoute = resolveBootstrapConsoleRoute(initialPathRef.current, menu.items, currentUser.user.role)
          redirectedOnceRef.current = true
          if (preferredRoute !== initialPathRef.current) {
            navigate(preferredRoute, { replace: true })
          }
        }
      })
      .catch(() => {
        if (!active) {
          return
        }
        logout()
        navigate(DEFAULT_LOGIN_ROUTE, { replace: true })
      })

    return () => {
      active = false
    }
  }, [logout, navigate, setBootstrapStatus, setMenu, setUser, token])

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await logoutSession(refreshToken)
      }
    } catch {
      // ignore network failures during local sign-out
    }
    logout()
    navigate(DEFAULT_LOGIN_ROUTE)
  }

  return (
    <ConsoleLayout onLogout={handleLogout}>
      {bootstrapStatus !== 'ready' ? (
        <AuthBootstrapShell />
      ) : (
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path={DASHBOARD_ROUTE} element={<DashboardPage />} />
            <Route path={PROJECTS_ROUTE} element={<ProjectsPage />} />
            <Route path={ORDERS_ROUTE} element={<OrdersPage />} />
            <Route path={BALANCE_ROUTE} element={<BalancePage />} />
            <Route path={PROFILE_ROUTE} element={<ProfilePage />} />
            <Route path={API_KEYS_ROUTE} element={<ApiKeysPage />} />
            <Route path={WEBHOOKS_ROUTE} element={<WebhooksPage />} />
            <Route path={SETTINGS_ROUTE} element={<SettingsPage />} />
            <Route path={SUPPLIER_DOMAINS_ROUTE} element={<SupplierRoute><SupplierDomainsPage /></SupplierRoute>} />
            <Route path={SUPPLIER_RESOURCES_ROUTE} element={<SupplierRoute><SupplierResourcesPage /></SupplierRoute>} />
            <Route path={SUPPLIER_OFFERINGS_ROUTE} element={<SupplierRoute><SupplierOfferingsPage /></SupplierRoute>} />
            <Route path={SUPPLIER_SETTLEMENTS_ROUTE} element={<SupplierRoute><SupplierSettlementsPage /></SupplierRoute>} />
            <Route path={ADMIN_USERS_ROUTE} element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
            <Route path={ADMIN_SUPPLIERS_ROUTE} element={<AdminRoute><AdminSuppliersPage /></AdminRoute>} />
            <Route path={ADMIN_PRICING_ROUTE} element={<AdminRoute><AdminProjectsPage /></AdminRoute>} />
            <Route path={ADMIN_RISK_ROUTE} element={<AdminRoute><AdminRiskPage /></AdminRoute>} />
            <Route path={ADMIN_AUDIT_ROUTE} element={<AdminRoute><AdminAuditPage /></AdminRoute>} />
            <Route path={DOCS_ROUTE} element={<ApiDocsPage />} />
            <Route path="*" element={<Navigate to={DASHBOARD_ROUTE} replace />} />
          </Routes>
        </Suspense>
      )}
    </ConsoleLayout>
  )
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path={DEFAULT_LOGIN_ROUTE} element={<LoginPage />} />
        <Route path="/*" element={<ProtectedRoute><Shell /></ProtectedRoute>} />
      </Routes>
    </Suspense>
  )
}
