import { Navigate } from 'react-router-dom'
import { Role, useAuthStore } from '../store/authStore'

export function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { token } = useAuthStore()
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return children
}

function RoleRoute({ children, allowedRoles }: { children: JSX.Element; allowedRoles: Role[] }) {
  const { token, user } = useAuthStore()
  if (!token) {
    return <Navigate to="/login" replace />
  }
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }
  return children
}

export function SupplierRoute({ children }: { children: JSX.Element }) {
  return <RoleRoute allowedRoles={['supplier', 'admin']}>{children}</RoleRoute>
}

export function AdminRoute({ children }: { children: JSX.Element }) {
  return <RoleRoute allowedRoles={['admin']}>{children}</RoleRoute>
}
