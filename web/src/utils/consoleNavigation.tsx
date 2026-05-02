import { IconActivity, IconArticle, IconBolt, IconComponent, IconHome, IconHistogram, IconPriceTag, IconSafe, IconServer, IconSetting, IconUser } from '@douyinfe/semi-icons'
import type { JSX } from 'react'
import type { MenuItem, Role } from '../store/authStore'

export type ConsoleNavGroup = 'shared' | 'supplier' | 'admin'

export interface ConsoleRouteDefinition {
  key: string
  label: string
  path: string
  title: string
  group: ConsoleNavGroup
  icon: JSX.Element
  landingPriority: number
  quickActionPriority?: number
  allowedRoles: Role[]
}

export const DEFAULT_SHARED_ROUTE = '/'
export const DEFAULT_LOGIN_ROUTE = '/login'
export const DASHBOARD_ROUTE = '/'
export const PROJECTS_ROUTE = '/projects'
export const ORDERS_ROUTE = '/orders'
export const BALANCE_ROUTE = '/balance'
export const PROFILE_ROUTE = '/profile'
export const API_KEYS_ROUTE = '/api-keys'
export const WEBHOOKS_ROUTE = '/webhooks'
export const SETTINGS_ROUTE = '/settings'
export const SUPPLIER_DOMAINS_ROUTE = '/supplier/domains'
export const SUPPLIER_RESOURCES_ROUTE = '/supplier/resources'
export const SUPPLIER_OFFERINGS_ROUTE = '/supplier/offerings'
export const SUPPLIER_SETTLEMENTS_ROUTE = '/supplier/settlements'
export const ADMIN_USERS_ROUTE = '/admin/users'
export const ADMIN_SUPPLIERS_ROUTE = '/admin/suppliers'
export const ADMIN_PRICING_ROUTE = '/admin/pricing'
export const ADMIN_RISK_ROUTE = '/admin/risk'
export const ADMIN_AUDIT_ROUTE = '/admin/audit'
export const DOCS_ROUTE = '/docs'

function roleBasePriority(role?: string) {
  switch (role) {
    case 'admin':
      return 3000
    case 'supplier':
      return 2000
    default:
      return 100
  }
}

function routePriorityForRole(route: ConsoleRouteDefinition, role?: string) {
  const base = roleBasePriority(role)
  switch (route.group) {
    case 'admin':
    case 'supplier':
      return base + route.landingPriority
    default:
      return route.landingPriority
  }
}

export const consoleRoutes: ConsoleRouteDefinition[] = [
  {
    key: 'dashboard',
    label: '仪表盘',
    path: DASHBOARD_ROUTE,
    title: '控制台总览',
    group: 'shared',
    icon: <IconHome />,
    landingPriority: 0,
    allowedRoles: ['user', 'supplier', 'admin'],
  },
  {
    key: 'projects',
    label: '项目市场',
    path: PROJECTS_ROUTE,
    title: '项目市场',
    group: 'shared',
    icon: <IconComponent />,
    landingPriority: 10,
    quickActionPriority: 10,
    allowedRoles: ['user', 'supplier', 'admin'],
  },
  {
    key: 'orders',
    label: '订单中心',
    path: ORDERS_ROUTE,
    title: '订单中心',
    group: 'shared',
    icon: <IconHistogram />,
    landingPriority: 20,
    quickActionPriority: 70,
    allowedRoles: ['user', 'supplier', 'admin'],
  },
  {
    key: 'balance',
    label: '余额中心',
    path: BALANCE_ROUTE,
    title: '余额中心',
    group: 'shared',
    icon: <IconPriceTag />,
    landingPriority: 60,
    quickActionPriority: 20,
    allowedRoles: ['user', 'supplier', 'admin'],
  },
  {
    key: 'profile',
    label: '个人资料',
    path: PROFILE_ROUTE,
    title: '个人资料',
    group: 'shared',
    icon: <IconUser />,
    landingPriority: 50,
    allowedRoles: ['user', 'supplier', 'admin'],
  },
  {
    key: 'api-keys',
    label: 'API Keys',
    path: API_KEYS_ROUTE,
    title: 'API Keys',
    group: 'shared',
    icon: <IconSafe />,
    landingPriority: 30,
    quickActionPriority: 90,
    allowedRoles: ['user', 'supplier', 'admin'],
  },
  {
    key: 'webhooks',
    label: 'Webhook 设置',
    path: WEBHOOKS_ROUTE,
    title: 'Webhook 设置',
    group: 'shared',
    icon: <IconBolt />,
    landingPriority: 40,
    quickActionPriority: 100,
    allowedRoles: ['user', 'supplier', 'admin'],
  },
  {
    key: 'settings',
    label: '设置中心',
    path: SETTINGS_ROUTE,
    title: '设置中心',
    group: 'shared',
    icon: <IconSetting />,
    landingPriority: 45,
    allowedRoles: ['user', 'supplier', 'admin'],
  },
  {
    key: 'docs',
    label: 'API 文档',
    path: DOCS_ROUTE,
    title: 'API 文档',
    group: 'shared',
    icon: <IconArticle />,
    landingPriority: 80,
    quickActionPriority: 80,
    allowedRoles: ['user', 'supplier', 'admin'],
  },
  {
    key: 'supplier-domains',
    label: '域名管理',
    path: SUPPLIER_DOMAINS_ROUTE,
    title: '域名管理',
    group: 'supplier',
    icon: <IconServer />,
    landingPriority: 0,
    quickActionPriority: 60,
    allowedRoles: ['supplier', 'admin'],
  },
  {
    key: 'supplier-resources',
    label: '供应商资源',
    path: SUPPLIER_RESOURCES_ROUTE,
    title: '供应商资源',
    group: 'supplier',
    icon: <IconPriceTag />,
    landingPriority: 10,
    allowedRoles: ['supplier', 'admin'],
  },
  {
    key: 'supplier-offerings',
    label: '供货规则',
    path: SUPPLIER_OFFERINGS_ROUTE,
    title: '供货规则',
    group: 'supplier',
    icon: <IconBolt />,
    landingPriority: 20,
    allowedRoles: ['supplier', 'admin'],
  },
  {
    key: 'supplier-settlements',
    label: '供应商结算',
    path: SUPPLIER_SETTLEMENTS_ROUTE,
    title: '供应商结算',
    group: 'supplier',
    icon: <IconActivity />,
    landingPriority: 30,
    allowedRoles: ['supplier', 'admin'],
  },
  {
    key: 'admin-users',
    label: '用户管理',
    path: ADMIN_USERS_ROUTE,
    title: '用户管理',
    group: 'admin',
    icon: <IconUser />,
    landingPriority: 30,
    quickActionPriority: 40,
    allowedRoles: ['admin'],
  },
  {
    key: 'admin-suppliers',
    label: '供应商管理',
    path: ADMIN_SUPPLIERS_ROUTE,
    title: '供应商管理',
    group: 'admin',
    icon: <IconServer />,
    landingPriority: 20,
    allowedRoles: ['admin'],
  },
  {
    key: 'admin-pricing',
    label: '项目定价',
    path: ADMIN_PRICING_ROUTE,
    title: '项目定价',
    group: 'admin',
    icon: <IconPriceTag />,
    landingPriority: 10,
    allowedRoles: ['admin'],
  },
  {
    key: 'admin-risk',
    label: '风控中心',
    path: ADMIN_RISK_ROUTE,
    title: '风控中心',
    group: 'admin',
    icon: <IconSafe />,
    landingPriority: 40,
    quickActionPriority: 30,
    allowedRoles: ['admin'],
  },
  {
    key: 'admin-audit',
    label: '审计日志',
    path: ADMIN_AUDIT_ROUTE,
    title: '审计日志',
    group: 'admin',
    icon: <IconArticle />,
    landingPriority: 50,
    quickActionPriority: 50,
    allowedRoles: ['admin'],
  },
]

export function getConsoleRoutesForRole(role?: Role) {
  return consoleRoutes.filter((route) => route.allowedRoles.includes((role ?? 'user') as Role))
}

export function allowedLandingPathsForRole(role?: Role) {
  return [...getConsoleRoutesForRole(role)]
    .sort((left, right) => routePriorityForRole(left, role) - routePriorityForRole(right, role))
    .map((route) => route.path)
}

export function resolvePostAuthLandingRoute(menuItems: Array<{ path: string }> = [], role?: Role) {
  const allowed = getConsoleRoutesForRole(role)
  const allowedMap = new Map(allowed.map((route) => [route.path, route]))

  const fromMenu = menuItems
    .map((item) => allowedMap.get(item.path))
    .filter((route): route is ConsoleRouteDefinition => Boolean(route))
    .sort((left, right) => routePriorityForRole(left, role) - routePriorityForRole(right, role))

  if (fromMenu.length > 0) {
    return fromMenu[0].path
  }

  const fallback = [...allowed].sort((left, right) => routePriorityForRole(left, role) - routePriorityForRole(right, role))[0]
  return fallback?.path ?? DEFAULT_SHARED_ROUTE
}

export function resolvePreferredConsoleRoute(menuItems: Array<{ path: string }> = [], role?: Role) {
  return resolvePostAuthLandingRoute(menuItems, role)
}

export function getQuickActionRoutes(role?: Role) {
  return getConsoleRoutesForRole(role)
    .filter((route) => typeof route.quickActionPriority === 'number')
    .sort((left, right) => (left.quickActionPriority ?? Number.MAX_SAFE_INTEGER) - (right.quickActionPriority ?? Number.MAX_SAFE_INTEGER))
}

export function visibleQuickActionPaths(menuItems: Array<{ path: string }> = [], currentPath?: string, role?: Role) {
  const visibleMenuPaths = new Set(menuItems.map((item) => item.path))
  return getQuickActionRoutes(role)
    .map((route) => route.path)
    .filter((path) => path !== currentPath && visibleMenuPaths.has(path))
}

export function groupedConsolePaths() {
  return {
    shared: consoleRoutes.filter((route) => route.group === 'shared').map((route) => route.path),
    supplier: consoleRoutes.filter((route) => route.group === 'supplier').map((route) => route.path),
    admin: consoleRoutes.filter((route) => route.group === 'admin').map((route) => route.path),
  }
}

export function hasMenuPath(menuItems: MenuItem[] = [], path: string) {
  return menuItems.some((item) => item.path === path)
}

export function resolveRouteDefinition(path: string) {
  return consoleRoutes.find((route) => route.path === path)
}

export function resolveRouteTitle(path: string) {
  const route = resolveRouteDefinition(path)
  if (route) {
    return route.title
  }
  const segments = path.split('/').filter(Boolean)
  return segments[segments.length - 1] ?? '控制台'
}
