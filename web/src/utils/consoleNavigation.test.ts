import { describe, expect, it } from 'vitest'
import { allowedLandingPathsForRole, resolvePreferredConsoleRoute, visibleQuickActionPaths } from './consoleNavigation'

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
})
