export type MenuRoute = {
  key: string
  label: string
  path: string
}

export const DEFAULT_SHARED_ROUTE = '/'
export const DEFAULT_LOGIN_ROUTE = '/login'
export const DASHBOARD_ROUTE = '/'

const userPreferredRoutes = ['/', '/projects', '/orders', '/api-keys', '/webhooks', '/settings', '/profile', '/balance', '/docs']
const supplierPreferredRoutes = ['/supplier/domains', '/supplier/resources', '/supplier/offerings', '/supplier/settlements', '/', '/settings', '/profile']
const adminPreferredRoutes = ['/admin/risk', '/admin/audit', '/admin/suppliers', '/admin/users', '/admin/pricing', '/', '/settings', '/profile', '/docs']

function unique(items: string[]) {
  return Array.from(new Set(items))
}

function preferredRoutesForRole(role?: string) {
  switch (role) {
    case 'admin':
      return adminPreferredRoutes
    case 'supplier':
      return supplierPreferredRoutes
    default:
      return userPreferredRoutes
  }
}

export function firstMenuPath(menu: MenuRoute[]) {
  return menu[0]?.path ?? DEFAULT_SHARED_ROUTE
}

export function resolvePreferredConsoleRoute(menu: MenuRoute[], role?: string) {
  const allowed = new Set(menu.map((item) => item.path))
  for (const path of unique(preferredRoutesForRole(role))) {
    if (allowed.has(path)) {
      return path
    }
  }
  return firstMenuPath(menu)
}

export function resolvePostAuthLandingRoute(menu: MenuRoute[], role?: string) {
  return resolvePreferredConsoleRoute(menu, role)
}

export function hasMenuPath(menu: MenuRoute[], path: string) {
  return menu.some((item) => item.path === path)
}
