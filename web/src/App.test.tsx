import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { useAuthStore } from './store/authStore'
import * as authService from './services/auth'
import * as webhookService from './services/webhooks'

function renderApp(initialEntries: string[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </MemoryRouter>,
  )
}

vi.mock('./services/auth', async () => {
  const actual = await vi.importActual<typeof import('./services/auth')>('./services/auth')
  return {
    ...actual,
    getCurrentUser: vi.fn(),
    getMenu: vi.fn(),
    logoutSession: vi.fn(),
    getDashboardOverview: vi.fn(),
    getAdminOverview: vi.fn(),
    getAdminRisk: vi.fn(),
    getAdminRiskRules: vi.fn(),
    updateAdminRiskRules: vi.fn(),
    getAdminAudit: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
  }
})

vi.mock('./services/webhooks', () => ({
  getWebhookEndpoints: vi.fn(),
  createWebhookEndpoint: vi.fn(),
  createWebhookTestDelivery: vi.fn(),
  getWebhookDeliveries: vi.fn(),
}))

const mockedGetCurrentUser = vi.mocked(authService.getCurrentUser)
const mockedGetMenu = vi.mocked(authService.getMenu)
const mockedGetDashboardOverview = vi.mocked(authService.getDashboardOverview)
const mockedGetAdminOverview = vi.mocked(authService.getAdminOverview)
const mockedGetAdminRisk = vi.mocked(authService.getAdminRisk)
const mockedGetAdminRiskRules = vi.mocked(authService.getAdminRiskRules)
const mockedUpdateAdminRiskRules = vi.mocked(authService.updateAdminRiskRules)
const mockedGetAdminAudit = vi.mocked(authService.getAdminAudit)
const mockedLogin = vi.mocked(authService.login)
const mockedRegister = vi.mocked(authService.register)
const mockedGetWebhookEndpoints = vi.mocked(webhookService.getWebhookEndpoints)
const mockedGetWebhookDeliveries = vi.mocked(webhookService.getWebhookDeliveries)
const mockedCreateWebhookTestDelivery = vi.mocked(webhookService.createWebhookTestDelivery)

function setSession(role: 'user' | 'supplier' | 'admin' = 'user') {
  useAuthStore.setState({
    token: 'token',
    refreshToken: 'refresh-token',
    user: { id: 1, email: `${role}@nexus-mail.local`, role },
    menu: [],
  })
}

describe('App', () => {
  beforeEach(() => {
    mockedGetCurrentUser.mockResolvedValue({ user: { id: 1, email: 'user@nexus-mail.local', role: 'user' } })
    mockedGetMenu.mockResolvedValue({
      role: 'user',
      items: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'projects', label: '项目市场', path: '/projects' },
        { key: 'orders', label: '订单中心', path: '/orders' },
        { key: 'balance', label: '余额中心', path: '/balance' },
        { key: 'profile', label: '个人资料', path: '/profile' },
        { key: 'api-keys', label: 'API Keys', path: '/api-keys' },
        { key: 'webhooks', label: 'Webhook 设置', path: '/webhooks' },
        { key: 'settings', label: '设置中心', path: '/settings' },
      ],
    })
    mockedGetDashboardOverview.mockResolvedValue({ message: 'dashboard ready', stats: { projects: 6, suppliers: 1, orders: 5 } })
    mockedGetAdminOverview.mockResolvedValue({
      generated_at: '2026-04-28T00:00:00Z',
      summary: {
        users: { total: 3 },
        orders: { total: 5, waiting_email: 1, ready: 1, finished: 1, canceled: 1, timeout: 1, completion_rate_bps: 2000, timeout_rate_bps: 2000, cancel_rate_bps: 2000, gross_revenue: 1200, average_finished_order_value: 1200 },
        disputes: { total: 2, open: 1, resolved: 1, rejected: 0, dispute_rate_bps: 4000 },
        projects: { total: 2, active: 1, inactive: 1 },
        suppliers: { total: 2 },
        audit: { total: 4, create: 1, revoke: 0, success: 1, denied_invalid: 0, denied_scope: 0, denied_whitelist: 1, denied_rate_limit: 1, denied_total: 2, denied_rate_bps: 5000 },
        supplier_settlements: { pending_amount: 1500 },
      },
      recent_audit: [{ id: 1, user_id: 3, api_key_id: 9, action: 'denied_whitelist', actor_type: 'system', note: 'blocked', created_at: '2026-04-28T00:00:00Z' }],
      suppliers: [
        { user_id: 2, email: 'supplier@nexus-mail.local', role: 'supplier', pending_settlement: 1500, order_total: 5, finished_orders: 3, timeout_orders: 1, canceled_orders: 1, gross_revenue: 3600, completion_rate_bps: 6000 },
      ],
    })
    mockedGetAdminRisk.mockResolvedValue({
      generated_at: '2026-04-28T00:00:00Z',
      summary: { open_disputes: 1, denied_whitelist: 1, denied_scope: 0, denied_invalid: 0, denied_rate_limit: 1, timeout_orders: 2, canceled_orders: 1, high_risk_signal_count: 2, medium_risk_signal_count: 1 },
      signals: [
        { category: 'auth', severity: 'high', count: 1, title: 'API Key 白名单拦截频繁', detail: '最近审计中检测到 1 次 denied_whitelist 事件' },
        { category: 'auth', severity: 'high', count: 1, title: 'API Key 触发限流', detail: '最近审计中检测到 1 次 denied_rate_limit 事件，可能存在异常高频访问或客户端重试风暴' },
      ],
    })
    mockedGetAdminRiskRules.mockResolvedValue({
      items: [
        { key: 'api_denied_rate', enabled: true, threshold: 10, window_minutes: 15, severity: 'high', description: 'API Key 异常访问检测', updated_at: '2026-04-28T00:00:00Z' },
        { key: 'high_timeout', enabled: true, threshold: 5, window_minutes: 60, severity: 'medium', description: '高频超时', updated_at: '2026-04-28T00:00:00Z' },
      ],
    })
    mockedUpdateAdminRiskRules.mockImplementation(async (items) => ({ items }))
    mockedGetAdminAudit.mockResolvedValue({ items: [{ id: 1, user_id: 3, api_key_id: 9, action: 'success', actor_type: 'system', note: 'scope ok', created_at: '2026-04-28T00:00:00Z' }] })
    mockedGetWebhookEndpoints.mockResolvedValue({
      items: [
        {
          id: 11,
          user_id: 1,
          url: 'https://hooks.example.com/nexus-mail',
          events: ['activation.finished'],
          status: 'active',
          secret_preview: 'whsec_abcd…1234',
          created_at: '2026-04-29T00:00:00Z',
          updated_at: '2026-04-29T00:00:00Z',
        },
      ],
    })
    mockedGetWebhookDeliveries.mockResolvedValue({
      items: [
        {
          id: 91,
          endpoint_id: 11,
          user_id: 1,
          event_type: 'webhook.test',
          payload: '{"type":"webhook.test"}',
          status: 'pending',
          attempt_count: 1,
          next_attempt_at: '2026-04-29T00:01:00Z',
          last_error: '',
          delivered_at: '',
          created_at: '2026-04-29T00:00:10Z',
          updated_at: '2026-04-29T00:00:10Z',
        },
      ],
    })
    mockedCreateWebhookTestDelivery.mockResolvedValue({
      delivery: {
        id: 92,
        endpoint_id: 11,
        user_id: 1,
        event_type: 'webhook.test',
        payload: '{"type":"webhook.test"}',
        status: 'pending',
        attempt_count: 0,
        next_attempt_at: '2026-04-29T00:02:00Z',
        last_error: '',
        delivered_at: '',
        created_at: '2026-04-29T00:01:00Z',
        updated_at: '2026-04-29T00:01:00Z',
      },
    })
    mockedLogin.mockResolvedValue({
      token: 'login-token',
      refresh_token: 'login-refresh',
      user: { id: 7, email: 'user@example.com', role: 'user' },
    })
    mockedRegister.mockResolvedValue({
      token: 'register-token',
      refresh_token: 'register-refresh',
      user: { id: 8, email: 'new@example.com', role: 'user' },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })
  })

  it('renders login page when unauthenticated', () => {
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })
    renderApp(['/login'])
    expect(screen.getByText('登录 Nexus-Mail')).toBeInTheDocument()
    expect(screen.getByText('邮件接码业务的统一运营控制台')).toBeInTheDocument()
  })

  it('supports switching to register and submitting registration', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })
    renderApp(['/login'])

    await user.click(screen.getByRole('button', { name: '注册' }))
    expect(screen.getByRole('heading', { name: '注册 Nexus-Mail' })).toBeInTheDocument()
    await user.type(screen.getByPlaceholderText('name@example.com'), 'new@example.com')
    await user.type(screen.getByPlaceholderText('至少 8 位密码'), 'Password123!')
    await user.type(screen.getByPlaceholderText('再次输入密码'), 'Password123!')
    await user.click(screen.getByRole('button', { name: '创建账户并进入控制台' }))

    await waitFor(() => expect(mockedRegister).toHaveBeenCalledWith('new@example.com', 'Password123!'))
  })

  it('renders webhook settings page for authenticated admin', async () => {
    setSession('admin')
    mockedGetCurrentUser.mockResolvedValue({ user: { id: 1, email: 'admin@nexus-mail.local', role: 'admin' } })
    mockedGetMenu.mockResolvedValue({
      role: 'admin',
      items: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'webhooks', label: 'Webhook 设置', path: '/webhooks' },
        { key: 'admin-risk', label: '风控中心', path: '/admin/risk' },
      ],
    })
    renderApp(['/webhooks'])
    expect(await screen.findAllByRole('heading', { name: 'Webhook 设置' })).not.toHaveLength(0)
    expect(await screen.findByText('https://hooks.example.com/nexus-mail')).toBeInTheDocument()
    expect(await screen.findByText('whsec_abcd…1234')).toBeInTheDocument()
    expect(await screen.findByText(/localhost、内网、link-local/)).toBeInTheDocument()
    await waitFor(() => expect(mockedGetWebhookEndpoints).toHaveBeenCalled())
    await waitFor(() => expect(mockedGetWebhookDeliveries).toHaveBeenCalledWith(11))
  })

  it('blocks supplier routes for plain users', async () => {
    setSession('user')
    renderApp(['/supplier/resources'])
    expect(await screen.findAllByText('控制台总览')).not.toHaveLength(0)
  })

  it('renders admin dashboard deep statistics', async () => {
    setSession('admin')
    mockedGetCurrentUser.mockResolvedValue({ user: { id: 1, email: 'admin@nexus-mail.local', role: 'admin' } })
    mockedGetMenu.mockResolvedValue({
      role: 'admin',
      items: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'admin-risk', label: '风控中心', path: '/admin/risk' },
      ],
    })
    renderApp(['/'])
    expect(await screen.findByText('订单完成率')).toBeInTheDocument()
    await waitFor(() => expect(screen.getAllByText('20.00%').length).toBeGreaterThanOrEqual(3))
    expect(await screen.findByText('争议发生率')).toBeInTheDocument()
    expect(await screen.findByText('40.00%')).toBeInTheDocument()
    expect(await screen.findByText('已完成订单流水')).toBeInTheDocument()
    await waitFor(() => expect(screen.getAllByText('¥12.00').length).toBeGreaterThanOrEqual(2))
    expect(await screen.findByText('鉴权拒绝率')).toBeInTheDocument()
    expect(await screen.findByText('50.00%')).toBeInTheDocument()
    expect(await screen.findByText('供应商待结算排行')).toBeInTheDocument()
    expect(await screen.findByText('supplier@nexus-mail.local')).toBeInTheDocument()
    expect(await screen.findByText('鉴权拒绝总数：2')).toBeInTheDocument()
  })

  it('renders admin risk page with real widgets', async () => {
    setSession('admin')
    mockedGetCurrentUser.mockResolvedValue({ user: { id: 1, email: 'admin@nexus-mail.local', role: 'admin' } })
    mockedGetMenu.mockResolvedValue({
      role: 'admin',
      items: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'admin-risk', label: '风控中心', path: '/admin/risk' },
        { key: 'admin-audit', label: '审计日志', path: '/admin/audit' },
      ],
    })

    renderApp(['/admin/risk'])

    expect(await screen.findByText('高风险信号')).toBeInTheDocument()
    expect(await screen.findByText('API Key 白名单拦截频繁')).toBeInTheDocument()
    expect(await screen.findByText('API Key 触发限流')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: '保存规则' })).toBeInTheDocument()
  })
})
