import { describe, expect, it } from 'vitest'
import { allowedLandingPathsForRole, resolveContinueConsoleSteps, resolvePreferredConsoleRoute, visibleQuickActionPaths } from './consoleNavigation'

describe('console navigation landing rules', () => {
  it('keeps shared dashboard ahead of admin-specific routes for admin users in the current shared-console model', () => {
    const adminPaths = allowedLandingPathsForRole('admin')
    expect(adminPaths.indexOf('/')).toBeGreaterThanOrEqual(0)
    expect(adminPaths.indexOf('/admin/risk')).toBeGreaterThanOrEqual(0)
    expect(adminPaths.indexOf('/')).toBeLessThan(adminPaths.indexOf('/admin/risk'))
  })

  it('keeps shared dashboard ahead of supplier-specific routes for supplier users in the current shared-console model', () => {
    const supplierPaths = allowedLandingPathsForRole('supplier')
    expect(supplierPaths.indexOf('/')).toBeGreaterThanOrEqual(0)
    expect(supplierPaths.indexOf('/supplier/domains')).toBeGreaterThanOrEqual(0)
    expect(supplierPaths.indexOf('/')).toBeLessThan(supplierPaths.indexOf('/supplier/domains'))
  })

  it('keeps shared routes ahead of supplier routes for plain users', () => {
    const userPaths = allowedLandingPathsForRole('user')
    expect(userPaths.indexOf('/')).toBeGreaterThanOrEqual(0)
    expect(userPaths.indexOf('/projects')).toBeGreaterThanOrEqual(0)
    expect(userPaths.includes('/supplier/domains')).toBe(false)
  })

  it('chooses the first allowed menu path according to the shared-console priority list', () => {
    expect(
      resolvePreferredConsoleRoute(
        [
          { path: '/admin/risk' },
          { path: '/' },
          { path: '/admin/audit' },
        ],
        'admin',
      ),
    ).toBe('/')
  })

  it('falls back to the shared dashboard when no allowed menu path is present', () => {
    expect(
      resolvePreferredConsoleRoute(
        [
          { path: '/custom' },
          { path: '/fallback' },
        ],
        'user',
      ),
    ).toBe('/')
  })

  it('filters quick actions by visible menu paths and excludes the current route', () => {
    expect(
      visibleQuickActionPaths(
        [
          { path: '/' },
          { path: '/projects' },
          { path: '/balance' },
          { path: '/api-keys' },
          { path: '/docs' },
        ],
        '/balance',
        'user',
      ),
    ).toEqual(['/projects', '/docs', '/api-keys'])
  })

  it('returns no quick actions when the menu exposes none of the quick-action routes', () => {
    expect(visibleQuickActionPaths([{ path: '/' }, { path: '/profile' }], '/profile', 'user')).toEqual([])
  })

  it('returns user continue-console steps in the intended procurement-to-integration order', () => {
    const steps = resolveContinueConsoleSteps(
      [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'projects', label: '项目市场', path: '/projects' },
        { key: 'orders', label: '订单中心', path: '/orders' },
        { key: 'api-keys', label: 'API Keys', path: '/api-keys' },
      ],
      'user',
    )

    expect(steps.map((step) => step.key)).toEqual(['projects', 'orders', 'api-keys'])
    expect(steps.map((step) => step.actionLabel)).toEqual(['前往项目市场', '查看订单中心', '打开 API Keys'])
  })

  it('returns supplier continue-console steps only for supplier-visible routes', () => {
    const steps = resolveContinueConsoleSteps(
      [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'supplier-domains', label: '域名管理', path: '/supplier/domains' },
        { key: 'supplier-resources', label: '供应商资源', path: '/supplier/resources' },
        { key: 'supplier-settlements', label: '供应商结算', path: '/supplier/settlements' },
      ],
      'supplier',
    )

    expect(steps.map((step) => step.key)).toEqual(['supplier-domains', 'supplier-resources', 'supplier-settlements'])
    expect(steps.every((step) => step.group === 'supplier')).toBe(true)
  })

  it('returns admin continue-console steps only for admin-visible routes', () => {
    const steps = resolveContinueConsoleSteps(
      [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'admin-suppliers', label: '供应商管理', path: '/admin/suppliers' },
        { key: 'admin-risk', label: '风控中心', path: '/admin/risk' },
        { key: 'admin-audit', label: '审计日志', path: '/admin/audit' },
      ],
      'admin',
    )

    expect(steps.map((step) => step.key)).toEqual(['admin-suppliers', 'admin-risk', 'admin-audit'])
    expect(steps.every((step) => step.group === 'admin')).toBe(true)
  })
})
