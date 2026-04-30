import { lazy, Suspense, useEffect, useRef } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
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
  resolvePostAuthLandingRoute,
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

function Shell() {
  const navigate = useNavigate()
  const redirectedOnceRef = useRef(false)
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
        if (!redirectedOnceRef.current && menu.role === currentUser.user.role) {
          const preferredRoute = resolvePostAuthLandingRoute(menu.items, currentUser.user.role)
          redirectedOnceRef.current = true
          if (preferredRoute !== DEFAULT_SHARED_ROUTE) {
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
  }, [logout, navigate, setMenu, setUser, token])

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
