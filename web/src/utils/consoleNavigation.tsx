import { IconActivity, IconArticle, IconBolt, IconComponent, IconHome, IconHistogram, IconPriceTag, IconSafe, IconServer, IconSetting, IconShield, IconUser } from '@douyinfe/semi-icons'
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
    landingPriority: 0,
    quickActionPriority: 30,
    allowedRoles: ['admin'],
  },
  {
    key: 'admin-suppliers',
    label: '供应商管理',
    path: ADMIN_SUPPLIERS_ROUTE,
    title: '供应商管理',
    group: 'admin',
    icon: <IconServer />,
    landingPriority: 10,
    allowedRoles: ['admin'],
  },
  {
    key: 'admin-pricing',
    label: '价格策略',
    path: ADMIN_PRICING_ROUTE,
    title: '价格策略',
    group: 'admin',
    icon: <IconPriceTag />,
    landingPriority: 20,
    allowedRoles: ['admin'],
  },
  {
    key: 'admin-risk',
    label: '风控中心',
    path: ADMIN_RISK_ROUTE,
    title: '风控中心',
    group: 'admin',
    icon: <IconShield />,
    landingPriority: 30,
    quickActionPriority: 40,
    allowedRoles: ['admin'],
  },
  {
    key: 'admin-audit',
    label: '审计日志',
    path: ADMIN_AUDIT_ROUTE,
    title: '审计日志',
    group: 'admin',
    icon: <IconArticle />,
    landingPriority: 40,
    quickActionPriority: 50,
    allowedRoles: ['admin'],
  },
]

export function resolveRouteDefinition(pathname: string) {
  return consoleRoutes.find((route) => route.path === pathname)
}

export function resolveRouteTitle(pathname: string, role?: Role) {
  const route = resolveRouteDefinition(pathname)
  if (!route) {
    return pathname === DEFAULT_SHARED_ROUTE ? '共享控制台' : pathname
  }
  if (role && route.titleByRole?.[role]) {
    return route.titleByRole[role] as string
  }
  return route.title
}

function routeMatchesRole(route: ConsoleRouteDefinition, role?: Role) {
  if (!role) {
    return route.group === 'shared'
  }
  return route.allowedRoles.includes(role)
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

export function groupedConsolePaths() {
  return {
    shared: consoleRoutes.filter((route) => route.group === 'shared').map((route) => route.path),
    supplier: consoleRoutes.filter((route) => route.group === 'supplier').map((route) => route.path),
    admin: consoleRoutes.filter((route) => route.group === 'admin').map((route) => route.path),
  }
}

export function allowedLandingPathsForRole(role?: Role) {
  return getConsoleRoutesForRole(role).map((route) => route.path)
}

export function hasMenuPath(menuItems: MenuItem[] = [], path: string) {
  return menuItems.some((item) => item.path === path)
}

export function resolvePreferredConsoleRoute(menuItems: MenuItem[] = [], role?: Role) {
  const allowed = getConsoleRoutesForRole(role)
    .filter((route) => hasMenuPath(menuItems, route.path))
  if (allowed.length === 0) {
    return DEFAULT_SHARED_ROUTE
  }
  const sharedHome = allowed.find((route) => route.path === DEFAULT_SHARED_ROUTE)
  return sharedHome ? sharedHome.path : allowed[0].path
}

export function resolveBootstrapConsoleRoute(currentPath: string, menuItems: MenuItem[] = [], role?: Role) {
  if (hasMenuPath(menuItems, currentPath)) {
    return currentPath
  }

  return hasMenuPath(menuItems, DEFAULT_SHARED_ROUTE)
    ? DEFAULT_SHARED_ROUTE
    : resolvePreferredConsoleRoute(menuItems, role)
}

export function visibleQuickActionPaths(menuItems: MenuItem[] = [], currentPath: string, role?: Role) {
  return getConsoleRoutesForRole(role)
    .filter((route) => route.quickActionPriority !== undefined)
    .filter((route) => hasMenuPath(menuItems, route.path))
    .filter((route) => route.path !== currentPath)
    .sort((a, b) => (a.quickActionPriority || 0) - (b.quickActionPriority || 0))
    .map((route) => route.path)
}
export function resolveContinueConsoleSteps(menuItems: MenuItem[] = [], role?: Role): ContinueConsoleStep[] {
  const steps: ContinueConsoleStep[] = []

  const maybePush = (path: string, step: Omit<ContinueConsoleStep, 'path' | 'title'>) => {
    if (!hasMenuPath(menuItems, path)) {
      return
    }
    steps.push({
      ...step,
      path,
      title: resolveRouteTitle(path, role),
    })
  }

  switch (role) {
    case 'admin':
      maybePush(ADMIN_USERS_ROUTE, {
        key: 'admin-users',
        label: '先核对用户与会话',
        description: '继续在用户管理工作台核对账号状态、会话信息与后续处理入口，保持管理员动作留在同一壳内。',
        actionLabel: '查看用户管理',
        badge: '管理员扩展',
        group: 'admin',
      })
      maybePush(ADMIN_RISK_ROUTE, {
        key: 'admin-risk',
        label: '复核高风险信号',
        description: '继续查看限流、白名单与高危信号，校验规则是否生效。',
        actionLabel: '查看风控中心',
        badge: '管理员扩展',
        group: 'admin',
      })
      maybePush(ADMIN_AUDIT_ROUTE, {
        key: 'admin-audit',
        label: '回放审计轨迹',
        description: '把接入、资金与风控动作继续串到同一条共享控制台审计链。',
        actionLabel: '查看审计日志',
        badge: '共享审计',
        group: 'admin',
      })
      break
    case 'supplier':
      maybePush(SUPPLIER_DOMAINS_ROUTE, {
        key: 'supplier-domains',
        label: '维护域名池',
        description: '回到域名运营中枢，继续准备可售资源与 catch-all 能力。',
        actionLabel: '前往域名管理',
        badge: '供应商扩展',
        group: 'supplier',
      })
      maybePush(SUPPLIER_RESOURCES_ROUTE, {
        key: 'supplier-resources',
        label: '补齐资源与邮箱池',
        description: '继续在共享壳内整理供应商资源、账号与邮箱池状态。',
        actionLabel: '查看供应商资源',
        badge: '供应商扩展',
        group: 'supplier',
      })
      maybePush(SUPPLIER_SETTLEMENTS_ROUTE, {
        key: 'supplier-settlements',
        label: '确认结算与争议',
        description: '继续处理待结算金额与争议反馈，保持供给闭环在同一控制台完成。',
        actionLabel: '打开供应商结算',
        badge: '资金闭环',
        group: 'supplier',
      })
      break
    default:
      maybePush(PROJECTS_ROUTE, {
        key: 'projects',
        label: '先进入项目市场',
        description: '完成注册后先确认项目可售资源，为首单采购准备库存与价格。',
        actionLabel: '前往项目市场',
        badge: '首轮接入',
        group: 'shared',
      })
      maybePush(ORDERS_ROUTE, {
        key: 'orders',
        label: '再追踪订单履约',
        description: '用同一共享控制台继续查看订单状态、结果与后续履约动作。',
        actionLabel: '查看订单中心',
        badge: '首轮接入',
        group: 'shared',
      })
      maybePush(API_KEYS_ROUTE, {
        key: 'api-keys',
        label: '最后完成 API 接入',
        description: '继续进入 API Keys、Webhook 与文档，完成程序化调用、回调联调与真实接口验证准备。',
        actionLabel: '管理 API Keys',
        badge: '共享接入桥接',
        group: 'shared',
      })
      break
  }

  return steps
}
