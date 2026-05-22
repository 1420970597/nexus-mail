import '@testing-library/jest-dom'
import {
  ADMIN_AUDIT_ROUTE,
  ADMIN_PRICING_ROUTE,
  ADMIN_RISK_ROUTE,
  ADMIN_SUPPLIERS_ROUTE,
  ADMIN_USERS_ROUTE,
  allowedLandingPathsForRole,
  API_KEYS_ROUTE,
  BALANCE_ROUTE,
  consoleRoutes,
  DASHBOARD_ROUTE,
  DOCS_ROUTE,
  getConsoleMenuForRole,
  groupedConsolePaths,
  ORDERS_ROUTE,
  PROFILE_ROUTE,
  PROJECTS_ROUTE,
  resolvePreferredConsoleRoute,
  resolveRouteTitle,
  SETTINGS_ROUTE,
  SUPPLIER_DOMAINS_ROUTE,
  SUPPLIER_OFFERINGS_ROUTE,
  SUPPLIER_RESOURCES_ROUTE,
  SUPPLIER_SETTLEMENTS_ROUTE,
  visibleQuickActionPaths,
  WEBHOOKS_ROUTE,
} from './consoleNavigation'

describe('consoleNavigation shared-console contracts', () => {
  it('pins canonical shared route paths for integration, profile, and docs entrypoints', () => {
    expect(API_KEYS_ROUTE).toBe('/api-keys')
    expect(WEBHOOKS_ROUTE).toBe('/webhooks')
    expect(DOCS_ROUTE).toBe('/docs')
    expect(PROFILE_ROUTE).toBe('/profile')
    expect(SETTINGS_ROUTE).toBe('/settings')
  })

  it('keeps grouped shared, supplier, and admin paths aligned with the single-shell route catalog', () => {
    expect(groupedConsolePaths()).toEqual({
      shared: [
        DASHBOARD_ROUTE,
        PROJECTS_ROUTE,
        ORDERS_ROUTE,
        BALANCE_ROUTE,
        PROFILE_ROUTE,
        API_KEYS_ROUTE,
        WEBHOOKS_ROUTE,
        SETTINGS_ROUTE,
        DOCS_ROUTE,
      ],
      supplier: [
        SUPPLIER_DOMAINS_ROUTE,
        SUPPLIER_RESOURCES_ROUTE,
        SUPPLIER_OFFERINGS_ROUTE,
        SUPPLIER_SETTLEMENTS_ROUTE,
      ],
      admin: [
        ADMIN_USERS_ROUTE,
        ADMIN_SUPPLIERS_ROUTE,
        ADMIN_PRICING_ROUTE,
        ADMIN_RISK_ROUTE,
        ADMIN_AUDIT_ROUTE,
      ],
    })
  })

  it('returns role-specific landing candidates from the single shared route catalog', () => {
    expect(allowedLandingPathsForRole('user')).toEqual([
      DASHBOARD_ROUTE,
      PROJECTS_ROUTE,
      ORDERS_ROUTE,
      API_KEYS_ROUTE,
      WEBHOOKS_ROUTE,
      SETTINGS_ROUTE,
      PROFILE_ROUTE,
      BALANCE_ROUTE,
      DOCS_ROUTE,
    ])

    expect(allowedLandingPathsForRole('supplier')).toEqual([
      DASHBOARD_ROUTE,
      PROJECTS_ROUTE,
      ORDERS_ROUTE,
      API_KEYS_ROUTE,
      WEBHOOKS_ROUTE,
      SETTINGS_ROUTE,
      PROFILE_ROUTE,
      BALANCE_ROUTE,
      DOCS_ROUTE,
      SUPPLIER_DOMAINS_ROUTE,
      SUPPLIER_RESOURCES_ROUTE,
      SUPPLIER_OFFERINGS_ROUTE,
      SUPPLIER_SETTLEMENTS_ROUTE,
    ])

    expect(allowedLandingPathsForRole('admin')).toEqual([
      DASHBOARD_ROUTE,
      PROJECTS_ROUTE,
      ORDERS_ROUTE,
      API_KEYS_ROUTE,
      WEBHOOKS_ROUTE,
      SETTINGS_ROUTE,
      PROFILE_ROUTE,
      BALANCE_ROUTE,
      DOCS_ROUTE,
      SUPPLIER_DOMAINS_ROUTE,
      ADMIN_RISK_ROUTE,
      SUPPLIER_RESOURCES_ROUTE,
      ADMIN_PRICING_ROUTE,
      SUPPLIER_OFFERINGS_ROUTE,
      ADMIN_SUPPLIERS_ROUTE,
      SUPPLIER_SETTLEMENTS_ROUTE,
      ADMIN_USERS_ROUTE,
      ADMIN_AUDIT_ROUTE,
    ])
  })

  it('resolves preferred landing route from server menu truth instead of guessed role defaults', () => {
    expect(resolvePreferredConsoleRoute([{ path: DOCS_ROUTE }, { path: API_KEYS_ROUTE }], 'user')).toBe(API_KEYS_ROUTE)
    expect(resolvePreferredConsoleRoute([{ path: SUPPLIER_RESOURCES_ROUTE }, { path: PROJECTS_ROUTE }], 'supplier')).toBe(PROJECTS_ROUTE)
    expect(resolvePreferredConsoleRoute([{ path: ADMIN_RISK_ROUTE }, { path: DASHBOARD_ROUTE }], 'admin')).toBe(DASHBOARD_ROUTE)
    expect(resolvePreferredConsoleRoute([{ path: '/unknown' }], 'admin')).toBe(DASHBOARD_ROUTE)
  })

  it('derives quick actions only from visible menu paths and excludes the current route', () => {
    const adminMenu = getConsoleMenuForRole('admin')

    expect(visibleQuickActionPaths(adminMenu, DASHBOARD_ROUTE, 'admin')).toEqual([
      PROJECTS_ROUTE,
      ADMIN_RISK_ROUTE,
      BALANCE_ROUTE,
      ADMIN_USERS_ROUTE,
      ADMIN_AUDIT_ROUTE,
      SUPPLIER_DOMAINS_ROUTE,
      ORDERS_ROUTE,
      DOCS_ROUTE,
      API_KEYS_ROUTE,
      WEBHOOKS_ROUTE,
    ])

    expect(visibleQuickActionPaths(adminMenu, API_KEYS_ROUTE, 'admin')).not.toContain(API_KEYS_ROUTE)
    expect(visibleQuickActionPaths([{ path: DASHBOARD_ROUTE }, { path: DOCS_ROUTE }], DOCS_ROUTE, 'user')).toEqual([])
  })

  it('resolves canonical shell titles for shared, supplier, and admin routes from the route catalog', () => {
    expect(resolveRouteTitle(DASHBOARD_ROUTE)).toBe('控制台总览')
    expect(resolveRouteTitle(API_KEYS_ROUTE)).toBe('开发者 API 接入工作台')
    expect(resolveRouteTitle(WEBHOOKS_ROUTE)).toBe('开发者 Webhook 接入工作台')
    expect(resolveRouteTitle(WEBHOOKS_ROUTE, 'supplier')).toBe('供给事件回调工作台')
    expect(resolveRouteTitle(WEBHOOKS_ROUTE, 'admin')).toBe('Webhook 运维与回调观测')
    expect(resolveRouteTitle(DOCS_ROUTE)).toBe('API 文档与接入控制台')
    expect(resolveRouteTitle(SUPPLIER_DOMAINS_ROUTE)).toBe('域名池运营中枢')
    expect(resolveRouteTitle(SUPPLIER_RESOURCES_ROUTE)).toBe('供应商资源运营台')
    expect(resolveRouteTitle(SUPPLIER_RESOURCES_ROUTE, 'supplier')).toBe('供应商资源')
    expect(resolveRouteTitle(SUPPLIER_OFFERINGS_ROUTE)).toBe('供货规则编排中枢')
    expect(resolveRouteTitle(SUPPLIER_SETTLEMENTS_ROUTE)).toBe('供应商资金与争议指挥台')
    expect(resolveRouteTitle(ADMIN_AUDIT_ROUTE)).toBe('审计日志')
    expect(resolveRouteTitle('/missing')).toBe('/missing')
  })

  it('keeps console route definitions unique so menu truth and route truth cannot silently drift', () => {
    const paths = consoleRoutes.map((route) => route.path)
    const keys = consoleRoutes.map((route) => route.key)

    expect(new Set(paths).size).toBe(paths.length)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
