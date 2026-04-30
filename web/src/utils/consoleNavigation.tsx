import { IconActivity, IconArticle, IconBolt, IconComponent, IconHome, IconHistogram, IconPriceTag, IconSafe, IconServer, IconSetting, IconUser } from '@douyinfe/semi-icons'
import type { JSX } from 'react'
import type { Role } from '../store/authStore'

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
      return base + route.landingPriority
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
    path: '/',
    title: '控制台总览',
    group: 'shared',
    icon: <IconHome />,
    landingPriority: 0,
    allowedRoles: ['user', 'supplier', 'admin'],
  },
  {
    key: 'projects',
    label: '项目市场',
    path: '/projects',
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
    path: '/orders',
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
    path: '/balance',
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
    path: '/profile',
    title: '个人资料',
    group: 'shared',
    icon: <IconUser />,
    landingPriority: 50,
    allowedRoles: ['user', 'supplier', 'admin'],
  },
  {
    key: 'api-keys',
    label: 'API Keys',
    path: '/api-keys',
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
    path: '/webhooks',
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
    path: '/settings',
    title: '设置中心',
    group: 'shared',
    icon: <IconSetting />,
    landingPriority: 45,
    allowedRoles: ['user', 'supplier', 'admin'],
  },
  {
    key: 'docs',
    label: 'API 文档',
    path: '/docs',
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
    path: '/supplier/domains',
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
    path: '/supplier/resources',
    title: '供应商资源',
    group: 'supplier',
    icon: <IconPriceTag />,
    landingPriority: 10,
    allowedRoles: ['supplier', 'admin'],
  },
  {
    key: 'supplier-offerings',
    label: '供货规则',
    path: '/supplier/offerings',
    title: '供货规则',
    group: 'supplier',
    icon: <IconBolt />,
    landingPriority: 20,
    allowedRoles: ['supplier', 'admin'],
  },
  {
    key: 'supplier-settlements',
    label: '供应商结算',
    path: '/supplier/settlements',
    title: '供应商结算',
    group: 'supplier',
    icon: <IconActivity />,
    landingPriority: 30,
    allowedRoles: ['supplier', 'admin'],
  },
  {
    key: 'admin-users',
    label: '用户管理',
    path: '/admin/users',
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
    path: '/admin/suppliers',
    title: '供应商管理',
    group: 'admin',
    icon: <IconServer />,
    landingPriority: 20,
    allowedRoles: ['admin'],
  },
  {
    key: 'admin-pricing',
    label: '价格策略',
    path: '/admin/pricing',
    title: '价格策略',
    group: 'admin',
    icon: <IconPriceTag />,
    landingPriority: 40,
    allowedRoles: ['admin'],
  },
  {
    key: 'admin-risk',
    label: '风控中心',
    path: '/admin/risk',
    title: '风控中心',
    group: 'admin',
    icon: <IconSafe />,
    landingPriority: 0,
    quickActionPriority: 30,
    allowedRoles: ['admin'],
  },
  {
    key: 'admin-audit',
    label: '审计日志',
    path: '/admin/audit',
    title: '审计日志',
    group: 'admin',
    icon: <IconActivity />,
    landingPriority: 10,
    quickActionPriority: 50,
    allowedRoles: ['admin'],
  },
]

export function titleFromPathname(pathname: string) {
  if (pathname === '/') return '控制台总览'
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return '控制台总览'
  const raw = segments[segments.length - 1]
  return raw
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function resolveRouteDefinition(pathname: string) {
  return consoleRoutes.find((item) => item.path === pathname)
}

export function resolveRouteTitle(pathname: string) {
  return resolveRouteDefinition(pathname)?.title ?? titleFromPathname(pathname)
}

export function firstMenuPath(menu: Array<{ path: string }>) {
  return menu[0]?.path ?? DEFAULT_SHARED_ROUTE
}

export function allowedLandingPathsForRole(role?: string) {
  const effectiveRole: Role = role === 'admin' || role === 'supplier' ? role : 'user'
  return consoleRoutes
    .filter((item) => item.allowedRoles.includes(effectiveRole))
    .sort((a, b) => {
      const priorityDiff = routePriorityForRole(a, effectiveRole) - routePriorityForRole(b, effectiveRole)
      if (priorityDiff !== 0) {
        return priorityDiff
      }
      return a.path.localeCompare(b.path)
    })
    .map((item) => item.path)
}

export function resolvePreferredConsoleRoute(menu: Array<{ path: string }>, role?: string) {
  const allowed = new Set(menu.map((item) => item.path))
  for (const path of allowedLandingPathsForRole(role)) {
    if (allowed.has(path)) {
      return path
    }
  }
  return firstMenuPath(menu)
}

export function resolvePostAuthLandingRoute(menu: Array<{ path: string }>, role?: string) {
  return resolvePreferredConsoleRoute(menu, role)
}

export function hasMenuPath(menu: Array<{ path: string }>, path: string) {
  return menu.some((item) => item.path === path)
}

export function groupedConsolePaths() {
  return {
    shared: consoleRoutes.filter((item) => item.group === 'shared').map((item) => item.path),
    supplier: consoleRoutes.filter((item) => item.group === 'supplier').map((item) => item.path),
    admin: consoleRoutes.filter((item) => item.group === 'admin').map((item) => item.path),
  }
}

export function visibleQuickActionPaths(menu: Array<{ path: string }>, currentPath: string) {
  const allowed = new Set(menu.map((item) => item.path))
  return consoleRoutes
    .filter((item) => typeof item.quickActionPriority === 'number' && item.path !== currentPath && allowed.has(item.path))
    .sort((a, b) => (a.quickActionPriority ?? 999) - (b.quickActionPriority ?? 999))
    .map((item) => item.path)
}
