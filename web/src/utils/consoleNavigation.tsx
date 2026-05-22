import { IconActivity, IconArticle, IconBolt, IconComponent, IconHome, IconHistogram, IconPriceTag, IconSafe, IconServer, IconSetting, IconUser } from '@douyinfe/semi-icons'
import type { JSX } from 'react'
import type { MenuItem, Role } from '../store/authStore'

export type ConsoleNavGroup = 'shared' | 'supplier' | 'admin'

export interface ConsoleRouteDefinition {
  key: string
  label: string
  path: string
  title: string
  titleByRole?: Partial<Record<Role, string>>
  group: ConsoleNavGroup
  icon: JSX.Element
  landingPriority: number
  quickActionPriority?: number
  allowedRoles: Role[]
}

export interface ContinueConsoleStep {
  key: string
  path: string
  title: string
  label: string
  description: string
  actionLabel: string
  badge: string
  group: ConsoleNavGroup
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
    title: '开发者 API 接入工作台',
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
    title: '开发者 Webhook 接入工作台',
    titleByRole: {
      supplier: '供给事件回调工作台',
      admin: 'Webhook 运维与回调观测',
    },
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
    title: 'API 文档与接入控制台',
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
    title: '域名池运营中枢',
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
    title: '供应商资源运营台',
    titleByRole: {
      supplier: '供应商资源',
      admin: '供应商资源',
    },
    group: 'supplier',
    icon: <IconPriceTag />,
    landingPriority: 10,
    allowedRoles: ['supplier', 'admin'],
  },
  {
    key: 'supplier-offerings',
    label: '供货规则',
    path: SUPPLIER_OFFERINGS_ROUTE,
    title: '供货规则编排中枢',
    group: 'supplier',
    icon: <IconBolt />,
    landingPriority: 20,
    allowedRoles: ['supplier', 'admin'],
  },
  {
    key: 'supplier-settlements',
    label: '供应商结算',
    path: SUPPLIER_SETTLEMENTS_ROUTE,
    title: '供应商资金与争议指挥台',
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
    label: '价格策略',
    path: ADMIN_PRICING_ROUTE,
    title: '价格策略',
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
    icon: <IconActivity />,
    landingPriority: 0,
    quickActionPriority: 10,
    allowedRoles: ['admin'],
  },
  {
    key: 'admin-audit',
    label: '审计日志',
    path: ADMIN_AUDIT_ROUTE,
    title: '审计日志',
    group: 'admin',
    icon: <IconSafe />,
    landingPriority: 40,
    quickActionPriority: 50,
    allowedRoles: ['admin'],
  },
]

function routeMatchesRole(route: ConsoleRouteDefinition, role?: Role) {
  if (!role) {
    return route.group === 'shared'
  }
  return route.allowedRoles.includes(role)
}

export function resolveRouteDefinition(path: string) {
  return consoleRoutes.find((route) => route.path === path)
}

export function resolveRouteTitle(path: string, role?: Role) {
  const route = resolveRouteDefinition(path)
  if (!route) {
    return path === DEFAULT_SHARED_ROUTE ? '控制台' : path
  }
  return route.titleByRole?.[role ?? 'user'] ?? route.title
}

export function getConsoleRoutesForRole(role?: Role) {
  return consoleRoutes
    .filter((route) => routeMatchesRole(route, role))
    .sort((left, right) => routePriorityForRole(left, role) - routePriorityForRole(right, role))
}

export function getConsoleMenuForRole(role?: Role): MenuItem[] {
  return getConsoleRoutesForRole(role).map((route) => ({
    key: route.key,
    label: route.label,
    path: route.path,
  }))
}

export function allowedLandingPathsForRole(role?: Role) {
  return getConsoleRoutesForRole(role).map((route) => route.path)
}

export function visibleQuickActionPaths(menuItems: MenuItem[] = [], currentPath?: string, role?: Role) {
  const allowedPaths = new Set(menuItems.map((item) => item.path))
  return consoleRoutes
    .filter((route) => route.quickActionPriority !== undefined && allowedPaths.has(route.path) && route.path !== currentPath && routeMatchesRole(route, role))
    .sort((left, right) => (left.quickActionPriority ?? 0) - (right.quickActionPriority ?? 0))
    .map((route) => route.path)
}

export function groupedConsolePaths() {
  return {
    shared: consoleRoutes.filter((route) => route.group === 'shared').map((route) => route.path),
    supplier: consoleRoutes.filter((route) => route.group === 'supplier').map((route) => route.path),
    admin: consoleRoutes.filter((route) => route.group === 'admin').map((route) => route.path),
  }
}

export function resolvePostAuthLandingRoute(menuItems: Array<{ path: string }> = [], role?: Role) {
  const allowedPaths = new Set(menuItems.map((item) => item.path))
  const candidates = getConsoleRoutesForRole(role).filter((route) => allowedPaths.has(route.path))
  return candidates[0]?.path ?? DEFAULT_SHARED_ROUTE
}

export function resolveBootstrapConsoleRoute(
  currentPath: string,
  menuItems: Array<{ path: string }> = [],
  role?: Role,
) {
  if (hasMenuPath(menuItems, currentPath)) {
    return currentPath
  }

  return hasMenuPath(menuItems, DEFAULT_SHARED_ROUTE)
    ? DEFAULT_SHARED_ROUTE
    : resolvePostAuthLandingRoute(menuItems, role)
}

export function resolvePreferredConsoleRoute(menuItems: Array<{ path: string }> = [], role?: Role) {
  return resolvePostAuthLandingRoute(menuItems, role)
}

export function hasMenuPath(menuItems: Array<{ path: string }> = [], path: string) {
  return menuItems.some((item) => item.path === path)
}

const continueStepTemplates: Record<Role, Array<Omit<ContinueConsoleStep, 'path' | 'title'>>> = {
  user: [
    {
      key: 'projects',
      label: '项目市场',
      description: '从项目市场开始首轮采购，确认真实库存、成功率与当前可售资源。',
      actionLabel: '前往项目市场',
      badge: '基础采购',
      group: 'shared',
    },
    {
      key: 'orders',
      label: '订单中心',
      description: '继续回到订单中心跟踪履约结果、邮箱分配与 READY / FINISHED 状态。',
      actionLabel: '查看订单中心',
      badge: '订单履约',
      group: 'shared',
    },
    {
      key: 'api-keys',
      label: 'API Keys',
      description: '继续进入 API Keys、Webhook 与文档，完成自动化接入与真实 API 联调。',
      actionLabel: '打开 API Keys',
      badge: '共享接入',
      group: 'shared',
    },
  ],
  supplier: [
    {
      key: 'supplier-domains',
      label: '域名池运营中枢',
      description: '优先核对域名池、Catch-All 覆盖与入口质量，再展开资源与供货维护。',
      actionLabel: '前往域名管理',
      badge: '供应商扩展',
      group: 'supplier',
    },
    {
      key: 'supplier-resources',
      label: '供应商资源',
      description: '继续在同一套控制台里维护资源账号、协议配置与供给健康状态。',
      actionLabel: '查看供应商资源',
      badge: '资源维护',
      group: 'supplier',
    },
    {
      key: 'supplier-settlements',
      label: '供应商资金与争议指挥台',
      description: '最后回到供应商结算页观察待结算余额、争议与最终结算链路。',
      actionLabel: '前往供应商结算',
      badge: '资金结算',
      group: 'supplier',
    },
  ],
  admin: [
    {
      key: 'admin-suppliers',
      label: '供应商管理',
      description: '先进入供应商管理，确认供给表现、待结算余额与经营协同状态。',
      actionLabel: '前往供应商管理',
      badge: '经营协同',
      group: 'admin',
    },
    {
      key: 'admin-risk',
      label: '风控中心',
      description: '继续回到风控中心复核高风险信号、限流命中与白名单拒绝轨迹。',
      actionLabel: '查看风控中心',
      badge: '风险治理',
      group: 'admin',
    },
    {
      key: 'admin-audit',
      label: '审计日志',
      description: '最后在审计日志中核对高危操作、接入事件与结算复核记录。',
      actionLabel: '查看审计日志',
      badge: '审计复核',
      group: 'admin',
    },
  ],
}

export function resolveContinueConsoleSteps(menuItems: MenuItem[] = [], role: Role = 'user') {
  const itemsByPath = new Map(menuItems.map((item) => [item.path, item]))
  return continueStepTemplates[role]
    .map((template) => {
      const route = consoleRoutes.find((candidate) => candidate.key === template.key)
      if (!route || !itemsByPath.has(route.path)) {
        return null
      }
      return {
        ...template,
        path: route.path,
        title: resolveRouteTitle(route.path, role),
      } satisfies ContinueConsoleStep
    })
    .filter((step): step is ContinueConsoleStep => Boolean(step))
}
