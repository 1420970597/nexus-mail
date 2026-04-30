import { describe, expect, it } from 'vitest'

interface RouteDef {
  group: 'shared' | 'supplier' | 'admin'
  landingPriority: number
  path: string
}

function routePriorityForRole(route: RouteDef, role?: string) {
  switch (route.group) {
    case 'admin':
      return role === 'admin' ? route.landingPriority : 3000 + route.landingPriority
    case 'supplier':
      return role === 'supplier' || role === 'admin' ? route.landingPriority : 2000 + route.landingPriority
    default:
      return role === 'user' ? route.landingPriority : 1000 + route.landingPriority
  }
}

const supplierDomainRoute: RouteDef = { path: '/supplier/domains', group: 'supplier', landingPriority: 0 }
const sharedDashboardRoute: RouteDef = { path: '/', group: 'shared', landingPriority: 0 }
const adminRiskRoute: RouteDef = { path: '/admin/risk', group: 'admin', landingPriority: 0 }

describe('console route priority model', () => {
  it('prefers admin routes over shared routes for admin users', () => {
    expect(routePriorityForRole(adminRiskRoute, 'admin')).toBeLessThan(routePriorityForRole(sharedDashboardRoute, 'admin'))
  })

  it('prefers supplier routes over shared routes for supplier users', () => {
    expect(routePriorityForRole(supplierDomainRoute, 'supplier')).toBeLessThan(routePriorityForRole(sharedDashboardRoute, 'supplier'))
  })

  it('keeps shared routes ahead of supplier routes for plain users', () => {
    expect(routePriorityForRole(sharedDashboardRoute, 'user')).toBeLessThan(routePriorityForRole(supplierDomainRoute, 'user'))
  })
})
