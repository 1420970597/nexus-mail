import '@testing-library/jest-dom'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminSuppliersPage } from './AdminSuppliersPage'
import { useAuthStore } from '../store/authStore'
import {
  ADMIN_AUDIT_ROUTE,
  ADMIN_RISK_ROUTE,
  ADMIN_SUPPLIERS_ROUTE,
  ADMIN_USERS_ROUTE,
  API_KEYS_ROUTE,
  DASHBOARD_ROUTE,
  DOCS_ROUTE,
  WEBHOOKS_ROUTE,
} from '../utils/consoleNavigation'

const mockedGetAdminOverview = vi.fn()

vi.mock('../services/auth', () => ({
  getAdminOverview: (...args: any[]) => mockedGetAdminOverview(...args),
}))

function renderAdminSuppliersPage(initialEntry = ADMIN_SUPPLIERS_ROUTE) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path={ADMIN_SUPPLIERS_ROUTE} element={<AdminSuppliersPage />} />
        <Route
          path={ADMIN_USERS_ROUTE}
          element={(
            <section data-testid="admin-suppliers-route-stub-users">
              <h1>用户管理</h1>
            </section>
          )}
        />
        <Route
          path={ADMIN_RISK_ROUTE}
          element={(
            <section data-testid="admin-suppliers-route-stub-risk">
              <h1>风控中心</h1>
            </section>
          )}
        />
        <Route
          path={ADMIN_AUDIT_ROUTE}
          element={(
            <section data-testid="admin-suppliers-route-stub-audit">
              <h1>审计日志</h1>
            </section>
          )}
        />
        <Route
          path={DASHBOARD_ROUTE}
          element={(
            <section data-testid="admin-suppliers-route-stub-shared-home">
              <h1>控制台总览</h1>
            </section>
          )}
        />
        <Route
          path={API_KEYS_ROUTE}
          element={(
            <section data-testid="admin-suppliers-route-stub-api-keys">
              <h1>开发者 API 接入工作台</h1>
            </section>
          )}
        />
        <Route
          path={WEBHOOKS_ROUTE}
          element={(
            <section data-testid="admin-suppliers-route-stub-webhooks">
              <h1>Webhook 设置</h1>
            </section>
          )}
        />
        <Route
          path={DOCS_ROUTE}
          element={(
            <section data-testid="admin-suppliers-route-stub-docs">
              <h1>API 文档</h1>
            </section>
          )}
        />
      </Routes>
    </MemoryRouter>,
  )
}

function seedAdminMenu(paths: string[]) {
  useAuthStore.setState({
    token: 'token',
    refreshToken: 'refresh-token',
    user: { id: 1, email: 'admin@nexus-mail.local', role: 'admin' },
    menu: paths.map((path) => ({ key: path, label: path, path })),
  })
}

describe('AdminSuppliersPage', () => {
  beforeEach(() => {
    seedAdminMenu([
      DASHBOARD_ROUTE,
      ADMIN_SUPPLIERS_ROUTE,
      ADMIN_USERS_ROUTE,
      ADMIN_RISK_ROUTE,
      ADMIN_AUDIT_ROUTE,
      API_KEYS_ROUTE,
      WEBHOOKS_ROUTE,
      DOCS_ROUTE,
    ])
    mockedGetAdminOverview.mockReset()
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
        suppliers: { total: 2 },
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
        supplier_settlements: { pending_amount: 15600 },
      },
      suppliers: [
        {
          user_id: 9,
          email: 'supplier-alpha@nexus-mail.local',
          role: 'supplier',
          pending_settlement: 9600,
          order_total: 12,
          finished_orders: 7,
          timeout_orders: 3,
          canceled_orders: 2,
          gross_revenue: 12800,
          completion_rate_bps: 5800,
        },
        {
          user_id: 10,
          email: 'supplier-beta@nexus-mail.local',
          role: 'supplier',
          pending_settlement: 6000,
          order_total: 8,
          finished_orders: 7,
          timeout_orders: 1,
          canceled_orders: 0,
          gross_revenue: 8800,
          completion_rate_bps: 9200,
        },
      ],
      recent_audit: [],
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })
  })

  it('renders the supplier mission-control heading, overview signals, and shared-console bridge actions from overview data', async () => {
    renderAdminSuppliersPage()

    expect(await screen.findByRole('heading', { name: '供应商管理' })).toBeInTheDocument()
    const heroCard = screen.getByTestId('admin-suppliers-hero-card')
    expect(within(heroCard).getByText('供应商运营中枢')).toBeInTheDocument()
    expect(screen.getByText('高待结算待办')).toBeInTheDocument()
    expect(screen.getByText('低履约风险')).toBeInTheDocument()
    expect(screen.getByText('争议敞口')).toBeInTheDocument()

    const missionFlow = screen.getByTestId('admin-suppliers-mission-flow')
    expect(within(missionFlow).getByRole('button', { name: '前往处理结算 / 争议' })).toBeInTheDocument()
    expect(within(missionFlow).getByRole('button', { name: '查看风控中心' })).toBeInTheDocument()
    expect(within(missionFlow).getByRole('button', { name: '查看审计日志' })).toBeInTheDocument()

    const bridge = screen.getByTestId('admin-suppliers-shared-console-bridge')
    expect(within(bridge).getByText('API Keys · /api-keys')).toBeInTheDocument()
    expect(within(bridge).getByText('Webhook 设置 · /webhooks')).toBeInTheDocument()
    expect(within(bridge).getByText('API 文档 · /docs')).toBeInTheDocument()

    expect(screen.getByText('高待结算供应商')).toBeInTheDocument()
    expect(screen.getByText('58.00%')).toBeInTheDocument()
    expect(screen.getByText('92.00%')).toBeInTheDocument()
  })

  it.each([
    ['前往处理结算 / 争议', 'admin-suppliers-route-stub-users', '用户管理'],
    ['查看风控中心', 'admin-suppliers-route-stub-risk', '风控中心'],
    ['查看审计日志', 'admin-suppliers-route-stub-audit', '审计日志'],
  ])('navigates from mission-control action %s to the expected page', async (actionName, destinationTestId, destinationHeading) => {
    const user = userEvent.setup()
    renderAdminSuppliersPage()

    expect(await screen.findByRole('heading', { name: '供应商管理' })).toBeInTheDocument()
    const missionFlow = screen.getByTestId('admin-suppliers-mission-flow')
    await user.click(within(missionFlow).getByRole('button', { name: actionName }))
    expect(await screen.findByTestId(destinationTestId)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: destinationHeading })).toBeInTheDocument()
  })

  it('suppresses unavailable action and bridge CTAs based on menu truth and falls back to dashboard', async () => {
    const user = userEvent.setup()
    seedAdminMenu([DASHBOARD_ROUTE, ADMIN_SUPPLIERS_ROUTE])

    renderAdminSuppliersPage()

    expect(await screen.findByRole('heading', { name: '供应商管理' })).toBeInTheDocument()
    const missionFlow = screen.getByTestId('admin-suppliers-mission-flow')
    expect(within(missionFlow).queryByRole('button', { name: '前往处理结算 / 争议' })).not.toBeInTheDocument()
    expect(within(missionFlow).queryByRole('button', { name: '查看风控中心' })).not.toBeInTheDocument()
    expect(within(missionFlow).queryByRole('button', { name: '查看审计日志' })).not.toBeInTheDocument()

    const bridge = screen.getByTestId('admin-suppliers-shared-console-bridge')
    expect(within(bridge).queryByText('API Keys · /api-keys')).not.toBeInTheDocument()
    expect(within(bridge).queryByText('Webhook 设置 · /webhooks')).not.toBeInTheDocument()
    expect(within(bridge).queryByText('API 文档 · /docs')).not.toBeInTheDocument()

    const fallbackButton = within(bridge).getByRole('button', { name: '返回推荐工作台' })
    await user.click(fallbackButton)
    expect(await screen.findByTestId('admin-suppliers-route-stub-shared-home')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '控制台总览' })).toBeInTheDocument()
  })

  it('shows the scoped fallback card when every downstream admin action is hidden', async () => {
    seedAdminMenu([DASHBOARD_ROUTE, ADMIN_SUPPLIERS_ROUTE])

    renderAdminSuppliersPage()

    expect(await screen.findByRole('heading', { name: '供应商管理' })).toBeInTheDocument()
    const bridge = screen.getByTestId('admin-suppliers-shared-console-bridge')
    const fallbackCard = screen.getByTestId('admin-suppliers-shared-console-fallback')
    expect(within(fallbackCard).getByText('回到推荐工作台继续管理员主链路')).toBeInTheDocument()
    expect(within(fallbackCard).getByRole('button', { name: '返回推荐工作台' })).toBeInTheDocument()
    expect(within(bridge).queryByText('API Keys · /api-keys')).not.toBeInTheDocument()
  })

  it('keeps bridge links only for the pages exposed by the admin menu', async () => {
    seedAdminMenu([DASHBOARD_ROUTE, ADMIN_SUPPLIERS_ROUTE, API_KEYS_ROUTE, DOCS_ROUTE])

    renderAdminSuppliersPage()

    expect(await screen.findByRole('heading', { name: '供应商管理' })).toBeInTheDocument()

    const bridge = screen.getByTestId('admin-suppliers-shared-console-bridge')
    expect(within(bridge).getByText('API Keys · /api-keys')).toBeInTheDocument()
    expect(within(bridge).getByText('API 文档 · /docs')).toBeInTheDocument()
    expect(within(bridge).queryByText('Webhook 设置 · /webhooks')).not.toBeInTheDocument()
    expect(within(bridge).queryByRole('button', { name: '返回推荐工作台' })).not.toBeInTheDocument()
  })
})
