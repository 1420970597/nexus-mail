import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { DashboardPage } from './DashboardPage'
import * as authService from '../services/auth'
import { useAuthStore } from '../store/authStore'
import {
  ADMIN_AUDIT_ROUTE,
  ADMIN_RISK_ROUTE,
  ADMIN_SUPPLIERS_ROUTE,
  API_KEYS_ROUTE,
  BALANCE_ROUTE,
  DASHBOARD_ROUTE,
  DOCS_ROUTE,
  ORDERS_ROUTE,
  PROJECTS_ROUTE,
  SETTINGS_ROUTE,
  SUPPLIER_DOMAINS_ROUTE,
  SUPPLIER_OFFERINGS_ROUTE,
  WEBHOOKS_ROUTE,
} from '../utils/consoleNavigation'

vi.mock('../services/auth', async () => {
  const actual = await vi.importActual<typeof import('../services/auth')>('../services/auth')
  return {
    ...actual,
    getDashboardOverview: vi.fn(),
    getAdminOverview: vi.fn(),
  }
})

const mockedGetDashboardOverview = vi.mocked(authService.getDashboardOverview)
const mockedGetAdminOverview = vi.mocked(authService.getAdminOverview)

function seedUserMenu(paths: string[]) {
  const labels: Record<string, string> = {
    [DASHBOARD_ROUTE]: '仪表盘',
    [BALANCE_ROUTE]: '余额中心',
    [PROJECTS_ROUTE]: '项目市场',
    [ORDERS_ROUTE]: '订单中心',
    [API_KEYS_ROUTE]: 'API Keys',
    [WEBHOOKS_ROUTE]: 'Webhook 设置',
    [DOCS_ROUTE]: 'API 文档',
    [SETTINGS_ROUTE]: '设置中心',
    [SUPPLIER_DOMAINS_ROUTE]: '域名管理',
    [SUPPLIER_OFFERINGS_ROUTE]: '供货规则',
    [ADMIN_SUPPLIERS_ROUTE]: '供应商管理',
    [ADMIN_RISK_ROUTE]: '风控中心',
    [ADMIN_AUDIT_ROUTE]: '审计日志',
  }

  useAuthStore.setState({
    token: 'token',
    refreshToken: 'refresh-token',
    user: { id: 1, email: 'user@nexus-mail.local', role: 'user' },
    menu: paths.map((path) => ({ key: path, label: labels[path] ?? path, path })),
  })
}

function seedSession(role: 'user' | 'supplier' | 'admin', paths: string[], email = `${role}@nexus-mail.local`) {
  seedUserMenu(paths)
  useAuthStore.setState({
    user: { id: role === 'admin' ? 9 : role === 'supplier' ? 7 : 1, email, role },
  })
}

function renderDashboard(initialEntry = DASHBOARD_ROUTE) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path={DASHBOARD_ROUTE} element={<DashboardPage />} />
        <Route
          path={BALANCE_ROUTE}
          element={
            <section data-testid="dashboard-balance-route-stub" role="region" aria-label="共享控制台 - 余额中心">
              <h1>余额中心</h1>
            </section>
          }
        />
        <Route
          path={PROJECTS_ROUTE}
          element={
            <section data-testid="dashboard-projects-route-stub" role="region" aria-label="共享控制台 - 项目市场">
              <h1>项目市场</h1>
            </section>
          }
        />
        <Route
          path={ORDERS_ROUTE}
          element={
            <section data-testid="dashboard-orders-route-stub" role="region" aria-label="共享控制台 - 订单中心">
              <h1>订单中心</h1>
            </section>
          }
        />
        <Route
          path={API_KEYS_ROUTE}
          element={
            <section data-testid="dashboard-api-keys-route-stub" role="region" aria-label="共享控制台 - API Keys">
              <h1>开发者 API 接入工作台</h1>
            </section>
          }
        />
        <Route
          path={WEBHOOKS_ROUTE}
          element={
            <section data-testid="dashboard-webhooks-route-stub" role="region" aria-label="共享控制台 - Webhooks">
              <h1>开发者 Webhook 接入工作台</h1>
            </section>
          }
        />
        <Route
          path={DOCS_ROUTE}
          element={
            <section data-testid="dashboard-docs-route-stub" role="region" aria-label="共享控制台 - API 文档">
              <h1>API 文档与接入控制台</h1>
            </section>
          }
        />
        <Route
          path={SETTINGS_ROUTE}
          element={
            <section data-testid="dashboard-settings-route-stub" role="region" aria-label="共享控制台 - 设置中心">
              <h1>设置中心</h1>
            </section>
          }
        />
        <Route
          path={SUPPLIER_DOMAINS_ROUTE}
          element={
            <section data-testid="dashboard-supplier-domains-route-stub" role="region" aria-label="共享控制台 - 域名池运营中枢">
              <h1>域名池运营中枢</h1>
            </section>
          }
        />
        <Route
          path={SUPPLIER_OFFERINGS_ROUTE}
          element={
            <section data-testid="dashboard-supplier-offerings-route-stub">
              <h1>供货规则编排中枢</h1>
            </section>
          }
        />
        <Route
          path={ADMIN_SUPPLIERS_ROUTE}
          element={
            <section data-testid="dashboard-admin-suppliers-route-stub" role="region" aria-label="共享控制台 - 供应商管理">
              <h1>供应商管理</h1>
            </section>
          }
        />
        <Route
          path={ADMIN_RISK_ROUTE}
          element={
            <section data-testid="dashboard-admin-risk-route-stub" role="region" aria-label="共享控制台 - 风控中心">
              <h1>风控中心</h1>
            </section>
          }
        />
        <Route
          path={ADMIN_AUDIT_ROUTE}
          element={
            <section data-testid="dashboard-admin-audit-route-stub" role="region" aria-label="共享控制台 - 审计日志">
              <h1>审计日志</h1>
            </section>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('DashboardPage shared-console journey hub', () => {
  beforeEach(() => {
    window.localStorage.clear()
    seedUserMenu([
      DASHBOARD_ROUTE,
      BALANCE_ROUTE,
      PROJECTS_ROUTE,
      ORDERS_ROUTE,
      API_KEYS_ROUTE,
      WEBHOOKS_ROUTE,
      DOCS_ROUTE,
      SETTINGS_ROUTE,
    ])
    mockedGetDashboardOverview.mockResolvedValue({
      message: 'dashboard ready',
      stats: {
        projects: 6,
        suppliers: 2,
        orders: 5,
      },
    } as any)
    mockedGetAdminOverview.mockResolvedValue({} as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })
  })

  it('renders a localized cross-console journey lane for budget, procurement, fulfillment, and integration', async () => {
    renderDashboard()

    const heroCard = await screen.findByRole('region', { name: '控制台总览' })
    expect(within(heroCard).getByRole('heading', { name: '控制台总览' })).toBeInTheDocument()
    expect(within(heroCard).getByText('共享控制台入口')).toBeInTheDocument()
    const firstRunLane = screen.getByRole('region', { name: '欢迎进入共享控制台' })
    expect(within(firstRunLane).getByRole('heading', { name: '欢迎进入共享控制台' })).toBeInTheDocument()
    const firstRunScope = within(screen.getByRole('region', { name: '先完成基础采购路径' }))
    expect(firstRunScope.getByRole('heading', { name: '先完成基础采购路径' })).toBeInTheDocument()
    expect(within(firstRunLane).getByText('首次使用指引')).toBeInTheDocument()
    expect(firstRunScope.getByText('基础采购')).toBeInTheDocument()
    expect(firstRunScope.queryByText('Shared Console')).not.toBeInTheDocument()
    expect(firstRunScope.queryByText('Integration')).not.toBeInTheDocument()
    expect(firstRunScope.queryByText('Role-aware')).not.toBeInTheDocument()
    expect(screen.getByText('统一接入')).toBeInTheDocument()
    expect(screen.getByText('角色扩展')).toBeInTheDocument()
    const lane = screen.getByRole('region', { name: '推荐下一步' })
    const scoped = within(lane)
    expect(scoped.getByText('资金准备')).toBeInTheDocument()
    expect(scoped.getByText('项目采购')).toBeInTheDocument()
    expect(scoped.getByText('订单履约')).toBeInTheDocument()
    expect(scoped.getByText('共享接入')).toBeInTheDocument()
    expect(scoped.queryByText('Budget')).not.toBeInTheDocument()
    expect(scoped.queryByText('Procurement')).not.toBeInTheDocument()
    expect(scoped.queryByText('Fulfillment')).not.toBeInTheDocument()
    expect(scoped.queryByText('Integration')).not.toBeInTheDocument()
    expect(scoped.getByRole('heading', { name: '先确认预算与钱包状态' })).toBeInTheDocument()
    expect(scoped.getByRole('heading', { name: '再进入项目市场采购' })).toBeInTheDocument()
    expect(scoped.getByRole('heading', { name: '随后追踪订单履约' })).toBeInTheDocument()
    expect(scoped.getByTestId('dashboard-next-step-balance')).toBeInTheDocument()
    expect(scoped.getByTestId('dashboard-next-step-projects')).toBeInTheDocument()
    expect(scoped.getByTestId('dashboard-next-step-orders')).toBeInTheDocument()
    const apiKeysCard = scoped.getByTestId('dashboard-next-step-api-keys')
    expect(within(apiKeysCard).getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()
    expect(scoped.getByTestId('dashboard-next-step-action-balance')).toBeInTheDocument()
    expect(scoped.getByTestId('dashboard-next-step-action-projects')).toBeInTheDocument()
    expect(scoped.getByTestId('dashboard-next-step-action-orders')).toBeInTheDocument()
    expect(scoped.getByRole('button', { name: '查看余额中心' })).toBeInTheDocument()
    expect(scoped.getByRole('button', { name: '前往项目市场' })).toBeInTheDocument()
    expect(scoped.getByRole('button', { name: '查看订单中心' })).toBeInTheDocument()
    expect(within(apiKeysCard).getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()
  })

  it('renders a dashboard capability matrix and bridge actions inside the shared console shell', async () => {
    renderDashboard()

    expect(await screen.findByRole('heading', { name: '控制台总览' })).toBeInTheDocument()
    const capabilityMatrix = screen.getByRole('region', { name: '控制台能力矩阵' })
    const matrixScope = within(capabilityMatrix)
    expect(matrixScope.getByText('共享壳能力总览')).toBeInTheDocument()
    expect(matrixScope.getByRole('heading', { name: '控制台能力矩阵' })).toBeInTheDocument()
    expect(matrixScope.getByText('统一身份入口')).toBeInTheDocument()
    expect(matrixScope.getByText('共享接入桥接')).toBeInTheDocument()
    expect(matrixScope.getByText('角色菜单扩展')).toBeInTheDocument()
    expect(matrixScope.getByText('个人资料与角色核对继续留在单一登录后控制台')).toBeInTheDocument()
    expect(matrixScope.getByText('API Keys、Webhook 与文档链路继续停留在共享壳内')).toBeInTheDocument()
    expect(matrixScope.getByText('服务端菜单开放更多角色工作台时，无需切换独立后台')).toBeInTheDocument()

    const bridgeCard = screen.getByRole('region', { name: '共享接入桥接' })
    const bridgeScope = within(bridgeCard)
    expect(bridgeScope.getByRole('heading', { name: '共享接入桥接' })).toBeInTheDocument()
    expect(bridgeScope.getByText('从总览直接继续 API Keys、Webhook 与文档核对；具体入口仍以后端返回的共享菜单为准，保持采购、履约与接入在同一套深色控制台里串联。')).toBeInTheDocument()
    expect(bridgeScope.getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()
    expect(bridgeScope.getByRole('button', { name: '前往 开发者 Webhook 接入工作台' })).toBeInTheDocument()
    expect(bridgeScope.getByRole('button', { name: '查看 API 文档' })).toBeInTheDocument()
    expect(bridgeScope.queryByRole('heading', { name: '开发者 API 接入工作台' })).not.toBeInTheDocument()
    expect(bridgeScope.queryByRole('heading', { name: '开发者 Webhook 接入工作台' })).not.toBeInTheDocument()
    expect(bridgeScope.queryByRole('heading', { name: 'API 文档与接入控制台' })).not.toBeInTheDocument()
  })

  it('suppresses unavailable bridge actions when the server menu does not expose those shared routes', async () => {
    seedUserMenu([DASHBOARD_ROUTE, API_KEYS_ROUTE])

    renderDashboard()

    expect(await screen.findByRole('heading', { name: '控制台总览' })).toBeInTheDocument()
    const bridgeScope = within(screen.getByRole('region', { name: '共享接入桥接' }))
    expect(bridgeScope.getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()
    expect(bridgeScope.queryByRole('button', { name: /Webhook/ })).not.toBeInTheDocument()
    expect(bridgeScope.queryByRole('button', { name: '查看 API 文档' })).not.toBeInTheDocument()
  })

  it('navigates from the dashboard journey lane into named shared-console destination regions for balance, projects, orders, and api keys', async () => {
    const user = userEvent.setup()

    let view = renderDashboard()
    let lane = await screen.findByRole('region', { name: '推荐下一步' })
    await user.click(within(lane).getByRole('button', { name: '查看余额中心' }))
    const balanceRegion = await screen.findByRole('region', { name: '共享控制台 - 余额中心' })
    expect(within(balanceRegion).getByRole('heading', { name: '余额中心' })).toBeInTheDocument()

    view.unmount()
    view = renderDashboard()
    lane = await screen.findByRole('region', { name: '推荐下一步' })
    await user.click(within(lane).getByRole('button', { name: '前往项目市场' }))
    const projectsRegion = await screen.findByRole('region', { name: '共享控制台 - 项目市场' })
    expect(within(projectsRegion).getByRole('heading', { name: '项目市场' })).toBeInTheDocument()

    view.unmount()
    view = renderDashboard()
    lane = await screen.findByRole('region', { name: '推荐下一步' })
    await user.click(within(lane).getByRole('button', { name: '查看订单中心' }))
    const ordersRegion = await screen.findByRole('region', { name: '共享控制台 - 订单中心' })
    expect(within(ordersRegion).getByRole('heading', { name: '订单中心' })).toBeInTheDocument()

    view.unmount()
    view = renderDashboard()
    lane = await screen.findByRole('region', { name: '推荐下一步' })
    await user.click(within(lane).getByRole('button', { name: '打开 API Keys' }))
    const apiKeysRegion = await screen.findByRole('region', { name: '共享控制台 - API Keys' })
    expect(within(apiKeysRegion).getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()
    view.unmount()
  })

  it('hides unavailable journey cards when the server menu does not expose those shared routes', async () => {
    seedUserMenu([DASHBOARD_ROUTE, PROJECTS_ROUTE, SETTINGS_ROUTE])

    renderDashboard()

    expect(await screen.findByRole('heading', { name: '控制台总览' })).toBeInTheDocument()
    const lane = await screen.findByRole('region', { name: '推荐下一步' })
    expect(within(lane).queryByRole('button', { name: '查看余额中心' })).not.toBeInTheDocument()
    expect(within(lane).getByRole('button', { name: '前往项目市场' })).toBeInTheDocument()
    expect(within(lane).queryByRole('button', { name: '查看订单中心' })).not.toBeInTheDocument()
    expect(within(lane).queryByRole('button', { name: '打开 API Keys' })).not.toBeInTheDocument()
  })

  it('shows the dashboard integration lane using the shared API Keys route constant without leaking extra journey cards', async () => {
    const user = userEvent.setup()

    const view = renderDashboard()
    const lane = await screen.findByRole('region', { name: '推荐下一步' })
    const integrationCard = within(lane).getByTestId('dashboard-next-step-api-keys')

    expect(integrationCard).toBeInTheDocument()
    expect(within(integrationCard).getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()
    expect(within(integrationCard).getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()
    expect(within(integrationCard).queryByText('集成与回调')).not.toBeInTheDocument()
    expect(within(lane).queryByRole('button', { name: '前往 开发者 Webhook 接入工作台' })).not.toBeInTheDocument()
    expect(within(lane).queryByRole('button', { name: '查看 API 文档' })).not.toBeInTheDocument()

    await user.click(within(integrationCard).getByRole('button', { name: '打开 API Keys' }))
    expect(await screen.findByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()
    view.unmount()
  })

  it('renders admin role surfaces and admin ops summary inside the shared shell', async () => {
    seedSession('admin', [DASHBOARD_ROUTE, ADMIN_SUPPLIERS_ROUTE, ADMIN_RISK_ROUTE, ADMIN_AUDIT_ROUTE, WEBHOOKS_ROUTE])
    mockedGetAdminOverview.mockResolvedValue({
      generated_at: '2026-05-07T13:00:00Z',
      summary: {
        users: { total: 12 },
        orders: {
          total: 30,
          waiting_email: 2,
          ready: 4,
          finished: 18,
          canceled: 3,
          timeout: 5,
          completion_rate_bps: 6000,
          timeout_rate_bps: 1667,
          cancel_rate_bps: 1000,
          gross_revenue: 888800,
          average_finished_order_value: 49378,
        },
        disputes: { total: 6, open: 2, resolved: 3, rejected: 1, dispute_rate_bps: 2000 },
        projects: { total: 9, active: 7, inactive: 2 },
        audit: {
          total: 42,
          create: 5,
          revoke: 2,
          success: 33,
          denied_invalid: 1,
          denied_scope: 2,
          denied_whitelist: 4,
          denied_rate_limit: 6,
          denied_total: 13,
          denied_rate_bps: 3095,
        },
        supplier_settlements: { pending_amount: 123450 },
      },
      suppliers: [
        {
          user_id: 99,
          email: 'supplier-top@nexus-mail.local',
          role: 'supplier',
          pending_settlement: 82000,
          order_total: 11,
          finished_orders: 8,
          timeout_orders: 2,
          canceled_orders: 1,
          completion_rate_bps: 7273,
          gross_revenue: 512300,
        },
      ],
      recent_audit: [],
    })

    renderDashboard()

    const heroCard = await screen.findByRole('region', { name: '控制台总览' })
    expect(within(heroCard).getByRole('heading', { name: '控制台总览' })).toBeInTheDocument()
    expect(within(heroCard).getByText('共享控制台入口')).toBeInTheDocument()
    const roleActions = screen.getByRole('region', { name: '管理员主任务动作' })
    expect(within(roleActions).getByTestId('dashboard-role-action-admin-suppliers')).toBeInTheDocument()
    expect(within(roleActions).getByTestId('dashboard-role-action-admin-risk')).toBeInTheDocument()
    const webhookAction = within(roleActions).getByTestId('dashboard-role-action-webhooks')
    expect(webhookAction).toBeInTheDocument()
    expect(within(webhookAction).getByRole('heading', { name: 'Webhook 运维与回调观测' })).toBeInTheDocument()
    expect(within(webhookAction).getByRole('button', { name: '继续配置 Webhook' })).toBeInTheDocument()
    expect(within(webhookAction).queryByText('共享接入入口')).not.toBeInTheDocument()
    expect(within(webhookAction).queryByRole('button', { name: '打开 Webhook 工作台' })).not.toBeInTheDocument()
    const roleSurfaceMap = await screen.findByRole('region', { name: '共享壳中的角色菜单映射' })
    const scopedSurface = within(roleSurfaceMap)
    expect(scopedSurface.getByText('基础工作台')).toBeInTheDocument()
    expect(scopedSurface.getByText('管理员扩展')).toBeInTheDocument()
    expect(scopedSurface.getByText('共享接入')).toBeInTheDocument()
    expect(scopedSurface.getAllByRole('button', { name: '打开该工作台' })).toHaveLength(3)
    expect(scopedSurface.queryByTestId('dashboard-next-step-balance')).not.toBeInTheDocument()

    const completionRateCard = await screen.findByTestId('dashboard-order-completion-rate-card')
    expect(within(completionRateCard).getByText('60.00%')).toBeInTheDocument()

    const disputeCard = screen.getByTestId('dashboard-dispute-rate-card')
    expect(within(disputeCard).getByText('20.00%')).toBeInTheDocument()

    const revenueCard = screen.getByTestId('dashboard-finished-revenue-card')
    expect(within(revenueCard).getByText('¥8888.00')).toBeInTheDocument()

    const topSupplierCard = screen.getByTestId('dashboard-top-supplier-card')
    expect(within(topSupplierCard).getByText('supplier-top@nexus-mail.local')).toBeInTheDocument()
    expect(within(topSupplierCard).getByText('完成率：72.73%')).toBeInTheDocument()

    const supplierRankTable = screen.getByTestId('dashboard-supplier-settlement-rank-card')
    expect(within(supplierRankTable).getByText('supplier-top@nexus-mail.local')).toBeInTheDocument()
    expect(within(supplierRankTable).getByText('72.73%')).toBeInTheDocument()

    const adminOpsSummary = await screen.findByTestId('dashboard-admin-ops-summary-card')
    const scopedAdminOps = within(adminOpsSummary)
    expect(scopedAdminOps.getByText('项目：7/9 启用')).toBeInTheDocument()
    expect(scopedAdminOps.getByText('完成订单：18')).toBeInTheDocument()
    expect(scopedAdminOps.getByText('白名单拦截：4')).toBeInTheDocument()
    expect(scopedAdminOps.getByText('鉴权拒绝总数：13')).toBeInTheDocument()
    expect(scopedAdminOps.getByRole('button', { name: '前往供应商管理查看详情' })).toBeInTheDocument()
    expect(scopedAdminOps.getByRole('button', { name: '前往风控中心' })).toBeInTheDocument()
    expect(scopedAdminOps.getByRole('button', { name: '前往审计日志' })).toBeInTheDocument()
  })

  it('navigates from admin operations to named shared-console destination regions', async () => {
    seedSession('admin', [
      DASHBOARD_ROUTE,
      ADMIN_SUPPLIERS_ROUTE,
      ADMIN_RISK_ROUTE,
      ADMIN_AUDIT_ROUTE,
      WEBHOOKS_ROUTE,
      DOCS_ROUTE,
      API_KEYS_ROUTE,
    ])
    mockedGetAdminOverview.mockResolvedValue({
      generated_at: '2026-05-07T13:00:00Z',
      summary: {
        users: { total: 1 },
        orders: {
          total: 4,
          waiting_email: 0,
          ready: 0,
          finished: 2,
          canceled: 1,
          timeout: 1,
          completion_rate_bps: 5000,
          timeout_rate_bps: 2500,
          cancel_rate_bps: 2500,
          gross_revenue: 20000,
          average_finished_order_value: 10000,
        },
        disputes: { total: 1, open: 0, resolved: 1, rejected: 0, dispute_rate_bps: 2500 },
        projects: { total: 2, active: 1, inactive: 1 },
        audit: {
          total: 4,
          create: 1,
          revoke: 0,
          success: 3,
          denied_invalid: 0,
          denied_scope: 0,
          denied_whitelist: 1,
          denied_rate_limit: 1,
          denied_total: 2,
          denied_rate_bps: 5000,
        },
        supplier_settlements: { pending_amount: 1000 },
      },
      suppliers: [],
      recent_audit: [],
    })

    const user = userEvent.setup()

    let view = renderDashboard()
    let adminOpsSummary = await screen.findByTestId('dashboard-admin-ops-summary-card')
    await user.click(within(adminOpsSummary).getByRole('button', { name: '前往供应商管理查看详情' }))
    const adminSuppliersRegion = await screen.findByRole('region', { name: '共享控制台 - 供应商管理' })
    expect(within(adminSuppliersRegion).getByRole('heading', { name: '供应商管理' })).toBeInTheDocument()

    view.unmount()
    view = renderDashboard()
    adminOpsSummary = await screen.findByTestId('dashboard-admin-ops-summary-card')
    await user.click(within(adminOpsSummary).getByRole('button', { name: '前往风控中心' }))
    const adminRiskRegion = await screen.findByRole('region', { name: '共享控制台 - 风控中心' })
    expect(within(adminRiskRegion).getByRole('heading', { name: '风控中心' })).toBeInTheDocument()

    view.unmount()
    view = renderDashboard()
    adminOpsSummary = await screen.findByTestId('dashboard-admin-ops-summary-card')
    await user.click(within(adminOpsSummary).getByRole('button', { name: '前往审计日志' }))
    const adminAuditRegion = await screen.findByRole('region', { name: '共享控制台 - 审计日志' })
    expect(within(adminAuditRegion).getByRole('heading', { name: '审计日志' })).toBeInTheDocument()
    view.unmount()
  })

  it('renders supplier role surfaces and supplier actions inside the shared shell', async () => {
    seedSession('supplier', [DASHBOARD_ROUTE, SUPPLIER_DOMAINS_ROUTE, SUPPLIER_OFFERINGS_ROUTE, SETTINGS_ROUTE])

    renderDashboard()

    const heroCard = await screen.findByRole('region', { name: '控制台总览' })
    expect(within(heroCard).getByRole('heading', { name: '控制台总览' })).toBeInTheDocument()
    const roleActions = screen.getByRole('region', { name: '供应商主任务动作' })
    expect(within(roleActions).getByTestId('dashboard-role-action-supplier-domains')).toBeInTheDocument()
    expect(within(roleActions).getByTestId('dashboard-role-action-supplier-offerings')).toBeInTheDocument()
    const roleSurfaceMap = await screen.findByRole('region', { name: '共享壳中的角色菜单映射' })
    const scopedSurface = within(roleSurfaceMap)
    const basicSurfaceCard = scopedSurface.getByTestId('dashboard-role-surface-basic')
    const supplierSurfaceCard = scopedSurface.getByTestId('dashboard-role-surface-supplier-domains')
    const sharedSurfaceCard = scopedSurface.getByTestId('dashboard-role-surface-settings')

    expect(within(basicSurfaceCard).getByText('基础工作台')).toBeInTheDocument()
    expect(within(basicSurfaceCard).getByText(DASHBOARD_ROUTE)).toBeInTheDocument()
    expect(within(supplierSurfaceCard).getByText('供应商扩展')).toBeInTheDocument()
    expect(within(supplierSurfaceCard).getByText(SUPPLIER_DOMAINS_ROUTE)).toBeInTheDocument()
    expect(within(sharedSurfaceCard).getByText('共享接入')).toBeInTheDocument()
    expect(within(sharedSurfaceCard).getByText(SETTINGS_ROUTE)).toBeInTheDocument()
    expect(scopedSurface.getAllByRole('button', { name: '打开该工作台' })).toHaveLength(3)
    expect(scopedSurface.queryByTestId('dashboard-next-step-balance')).not.toBeInTheDocument()

    expect(within(roleActions).getByRole('button', { name: '前往域名管理' })).toBeInTheDocument()
    expect(within(roleActions).getByRole('button', { name: '调整供货规则' })).toBeInTheDocument()
    expect(screen.queryByTestId('dashboard-next-steps-lane')).not.toBeInTheDocument()
  })

  it('navigates from supplier role-surface cards to named shared-console destination regions within the same shell', async () => {
    seedSession('supplier', [DASHBOARD_ROUTE, SUPPLIER_DOMAINS_ROUTE, SUPPLIER_OFFERINGS_ROUTE, SETTINGS_ROUTE])
    const user = userEvent.setup()

    let view = renderDashboard()
    await screen.findByTestId('dashboard-role-surface-map')
    await user.click(within(screen.getByTestId('dashboard-role-surface-basic')).getByRole('button', { name: '打开该工作台' }))
    expect(await screen.findByRole('heading', { name: '控制台总览' })).toBeInTheDocument()

    view.unmount()
    view = renderDashboard()
    await screen.findByTestId('dashboard-role-surface-map')
    await user.click(within(screen.getByTestId('dashboard-role-surface-supplier-domains')).getByRole('button', { name: '打开该工作台' }))
    const supplierDomainsRegion = await screen.findByRole('region', { name: '共享控制台 - 域名池运营中枢' })
    expect(within(supplierDomainsRegion).getByRole('heading', { name: '域名池运营中枢' })).toBeInTheDocument()

    view.unmount()
    view = renderDashboard()
    await screen.findByTestId('dashboard-role-surface-map')
    await user.click(within(screen.getByTestId('dashboard-role-surface-settings')).getByRole('button', { name: '打开该工作台' }))
    const settingsRegion = await screen.findByRole('region', { name: '共享控制台 - 设置中心' })
    expect(within(settingsRegion).getByRole('heading', { name: '设置中心' })).toBeInTheDocument()
    view.unmount()
  })
})
