import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminSuppliersPage } from './AdminSuppliersPage'

const mockedGetAdminOverview = vi.fn()

vi.mock('../services/auth', () => ({
  getAdminOverview: (...args: any[]) => mockedGetAdminOverview(...args),
}))

describe('AdminSuppliersPage', () => {
  beforeEach(() => {
    mockedGetAdminOverview.mockReset()
  })

  it('renders supplier overview metrics and table', async () => {
    mockedGetAdminOverview.mockResolvedValue({
      generated_at: '2026-04-29T00:00:00Z',
      summary: {
        users: { total: 3 },
        orders: {
          total: 10,
          waiting_email: 1,
          ready: 2,
          finished: 6,
          canceled: 1,
          timeout: 1,
          completion_rate_bps: 8000,
          timeout_rate_bps: 1000,
          cancel_rate_bps: 1000,
          gross_revenue: 1200,
          average_finished_order_value: 200,
        },
        disputes: { total: 2, open: 1, resolved: 1, rejected: 0, dispute_rate_bps: 2000 },
        projects: { total: 3, active: 2, inactive: 1 },
        suppliers: { total: 1 },
        audit: {
          total: 4,
          create: 1,
          revoke: 1,
          success: 1,
          denied_invalid: 0,
          denied_scope: 0,
          denied_whitelist: 1,
          denied_rate_limit: 0,
          denied_total: 1,
          denied_rate_bps: 2500,
        },
        supplier_settlements: { pending_amount: 5600 },
      },
      suppliers: [
        {
          user_id: 9,
          email: 'supplier@nexus-mail.local',
          role: 'supplier',
          pending_settlement: 5600,
          order_total: 12,
          finished_orders: 9,
          timeout_orders: 2,
          canceled_orders: 1,
          gross_revenue: 8800,
          completion_rate_bps: 7500,
        },
      ],
      recent_audit: [],
    })

    render(
      <MemoryRouter>
        <AdminSuppliersPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('供应商管理')).toBeInTheDocument()
    expect((await screen.findAllByText('supplier@nexus-mail.local')).length).toBeGreaterThanOrEqual(1)
    expect(await screen.findAllByText('待结算金额')).toBeTruthy()
    expect(await screen.findByRole('button', { name: '处理结算' })).toBeInTheDocument()
  })
})
