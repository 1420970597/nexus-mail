import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { useAuthStore } from './store/authStore'
import * as authService from './services/auth'
import * as webhookService from './services/webhooks'
import * as activationService from './services/activation'
import { SHARED_CONSOLE_MENU_LOADING_LABEL } from './components/AppSidebar'
import { userFirstRunStorageKeyForUser } from './pages/DashboardPage'
import {
  API_KEYS_ROUTE,
  DEFAULT_LOGIN_ROUTE,
  DOCS_ROUTE,
  ORDERS_ROUTE,
  PROJECTS_ROUTE,
  SETTINGS_ROUTE,
  SUPPLIER_DOMAINS_ROUTE,
  SUPPLIER_RESOURCES_ROUTE,
  WEBHOOKS_ROUTE,
} from './utils/consoleNavigation'

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

vi.mock('./services/activation', async () => {
  const actual = await vi.importActual<typeof import('./services/activation')>('./services/activation')
  return {
    ...actual,
    getSupplierResourcesOverview: vi.fn(),
  }
})

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
const mockedGetSupplierResourcesOverview = vi.mocked(activationService.getSupplierResourcesOverview)

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
    mockedGetSupplierResourcesOverview.mockResolvedValue({
      domains: [
        {
          id: 1,
          name: 'mail.supplier.example',
          region: 'global',
          catch_all: true,
          status: 'active',
          created_at: '2026-04-29T00:00:00Z',
          updated_at: '2026-04-29T00:00:00Z',
        },
      ],
      accounts: [],
      mailboxes: [],
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
    window.localStorage.clear()
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })
  })

  it('renders login page when unauthenticated', async () => {
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })
    renderApp([DEFAULT_LOGIN_ROUTE])
    expect(await screen.findByText('登录 Nexus-Mail')).toBeInTheDocument()
    expect(screen.getByText('邮件接码业务的统一运营控制台')).toBeInTheDocument()
  })

  it('clears local session on bootstrap failure without revoking refresh session server-side', async () => {
    setSession('user')
    mockedGetCurrentUser.mockRejectedValueOnce(new Error('transient bootstrap failure'))

    renderApp(['/'])

    await waitFor(() => {
      expect(screen.getByText('登录 Nexus-Mail')).toBeInTheDocument()
    })

    expect(authService.logoutSession).not.toHaveBeenCalled()
    expect(useAuthStore.getState()).toMatchObject({
      token: null,
      refreshToken: null,
      user: null,
      menu: [],
    })
  })

  it('persists only the access token in sessionStorage when setting a session', () => {
    useAuthStore.getState().setSession('stored-token', 'stored-refresh-token', {
      id: 1,
      email: 'user@nexus-mail.local',
      role: 'user',
    })

    expect(window.sessionStorage.getItem('nexus-mail-token')).toBe('stored-token')
    expect(window.sessionStorage.getItem('nexus-mail-refresh-token')).toBeNull()
    expect(window.sessionStorage.getItem('nexus-mail-user')).toContain('user@nexus-mail.local')
    expect(useAuthStore.getState().refreshToken).toBe('stored-refresh-token')
  })

  it('renders the admin risk workspace when starting from the preferred admin route after session bootstrap', async () => {
    setSession('admin')
    mockedGetCurrentUser.mockResolvedValueOnce({ user: { id: 1, email: 'admin@nexus-mail.local', role: 'admin' } })
    mockedGetMenu.mockResolvedValueOnce({
      role: 'admin',
      items: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'admin-risk', label: '风控中心', path: '/admin/risk' },
        { key: 'admin-audit', label: '审计日志', path: '/admin/audit' },
      ],
    })
    mockedGetAdminRisk.mockResolvedValueOnce({
      generated_at: '2026-04-28T00:00:00Z',
      summary: {
        open_disputes: 1,
        denied_whitelist: 1,
        denied_scope: 0,
        denied_invalid: 0,
        denied_rate_limit: 1,
        timeout_orders: 2,
        canceled_orders: 1,
        high_risk_signal_count: 2,
        medium_risk_signal_count: 1,
      },
      signals: [
        {
          category: 'auth',
          severity: 'high',
          count: 1,
          title: 'API Key 白名单拦截频繁',
          detail: '最近审计中检测到 1 次 denied_whitelist 事件',
        },
      ],
    })

    renderApp(['/admin/risk'])

    expect(await screen.findByText('Risk Mission Control')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '保存规则' })).toBeInTheDocument()
  })

  it('falls back to the first server-menu route when no preferred role landing route exists', async () => {
    setSession('supplier')
    mockedGetCurrentUser.mockResolvedValueOnce({ user: { id: 2, email: 'supplier@nexus-mail.local', role: 'supplier' } })
    mockedGetMenu.mockResolvedValueOnce({
      role: 'supplier',
      items: [
        { key: 'docs', label: 'API 文档', path: '/docs' },
      ],
    })

    renderApp(['/'])

    expect((await screen.findAllByText('API 文档')).length).toBeGreaterThan(0)
  })

  it('shows register journey guidance and role entry descriptions on the login shell', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })
    renderApp(['/login'])

    expect(screen.getByText('注册后默认进入共享控制台')).toBeInTheDocument()
    expect(screen.getByText('用户路径')).toBeInTheDocument()
    expect(screen.getByText('如账号已被授予供应商角色，可在同一控制台继续进入域名管理、供货规则、资源与结算页面。')).toBeInTheDocument()
    expect(screen.getByText('登录后实际可见菜单与工作台能力，以账号当前角色和服务端返回权限为准。')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /立即注册，进入共享控制台/ }))
    expect(screen.getByRole('heading', { name: '注册 Nexus-Mail' })).toBeInTheDocument()
    expect(screen.getByText('仅需邮箱与密码即可开通账户；注册成功后直接进入同一套控制台。')).toBeInTheDocument()
  })

  it('shows role-aware first-run mission cards after registration and navigates into the shared console', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })
    mockedRegister.mockResolvedValueOnce({
      token: 'register-token',
      refresh_token: 'register-refresh',
      user: { id: 8, email: 'new@example.com', role: 'user' },
    })
    mockedGetCurrentUser.mockResolvedValueOnce({ user: { id: 8, email: 'new@example.com', role: 'user' } })
    mockedGetMenu.mockResolvedValueOnce({
      role: 'user',
      items: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'projects', label: '项目市场', path: '/projects' },
        { key: 'orders', label: '订单中心', path: '/orders' },
        { key: 'api-keys', label: 'API Keys', path: '/api-keys' },
        { key: 'webhooks', label: 'Webhook 设置', path: '/webhooks' },
        { key: 'settings', label: '设置中心', path: '/settings' },
        { key: 'docs', label: 'API 文档', path: '/docs' },
      ],
    })

    renderApp(['/login'])

    await user.click(screen.getByRole('button', { name: /立即注册，进入共享控制台/ }))
    await user.type(screen.getByPlaceholderText('name@example.com'), 'new@example.com')
    await user.type(screen.getByPlaceholderText('至少 8 位密码'), 'Password123!')
    await user.type(screen.getByPlaceholderText('再次输入密码'), 'Password123!')
    await user.click(screen.getByRole('button', { name: '创建账户并进入控制台' }))

    await waitFor(() => expect(mockedRegister).toHaveBeenCalledWith('new@example.com', 'Password123!'))
    expect(await screen.findByText('欢迎进入共享控制台')).toBeInTheDocument()
    expect(screen.getByText('先完成基础采购路径')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /稍后再看/ })).toBeInTheDocument()
    expect(screen.getByText('继续准备 API 接入')).toBeInTheDocument()
    expect(screen.getByText('如果后续被服务端授予供应商或管理员角色，菜单会按权限扩展，不需要切换独立后台。')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /前往项目市场开始采购/ })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /管理 API Keys/ }).length).toBeGreaterThan(0)
    expect(screen.queryByText('供应商主任务')).not.toBeInTheDocument()
    expect(screen.queryByText('管理员主任务')).not.toBeInTheDocument()
  })

  it('uses the shared API keys route constant for register onboarding entrypoints', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })
    mockedRegister.mockResolvedValueOnce({
      token: 'register-token',
      refresh_token: 'register-refresh',
      user: { id: 8, email: 'new@example.com', role: 'user' },
    })
    mockedGetCurrentUser.mockResolvedValueOnce({ user: { id: 8, email: 'new@example.com', role: 'user' } })
    mockedGetMenu.mockResolvedValueOnce({
      role: 'user',
      items: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'projects', label: '项目市场', path: PROJECTS_ROUTE },
        { key: 'orders', label: '订单中心', path: ORDERS_ROUTE },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
        { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
        { key: 'settings', label: '设置中心', path: SETTINGS_ROUTE },
      ],
    })

    renderApp(['/login'])

    expect(API_KEYS_ROUTE).toBe('/api-keys')

    await user.click(screen.getByRole('button', { name: /立即注册，进入共享控制台/ }))
    await user.type(screen.getByPlaceholderText('name@example.com'), 'new@example.com')
    await user.type(screen.getByPlaceholderText('至少 8 位密码'), 'Password123!')
    await user.type(screen.getByPlaceholderText('再次输入密码'), 'Password123!')
    await user.click(screen.getByRole('button', { name: '创建账户并进入控制台' }))

    await waitFor(() => expect(mockedRegister).toHaveBeenCalledWith('new@example.com', 'Password123!'))
    expect(await screen.findByText('欢迎进入共享控制台')).toBeInTheDocument()
    const onboardingRegion = await screen.findByTestId('dashboard-next-steps-lane')
    const apiKeyButtons = within(onboardingRegion).getAllByRole('button', { name: /管理 API Keys/ })
    expect(apiKeyButtons.length).toBeGreaterThan(0)
    await user.click(apiKeyButtons[0])

    expect(await screen.findByText('开发者 API 接入工作台')).toBeInTheDocument()
    expect(screen.getByText('当前密钥')).toBeInTheDocument()
  })

  it('keeps settings guidance entry available after dismissing first-run mission cards for default user', async () => {
    const user = userEvent.setup()
    window.localStorage.removeItem(userFirstRunStorageKeyForUser(1))
    setSession('user')

    const dashboardView = renderApp(['/'])

    expect(await screen.findByText('欢迎进入共享控制台')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /稍后再看/ }))
    await waitFor(() => expect(screen.queryByText('欢迎进入共享控制台')).not.toBeInTheDocument())
    await waitFor(() => expect(window.localStorage.getItem(userFirstRunStorageKeyForUser(1))).toBe('true'))

    dashboardView.unmount()
    renderApp([SETTINGS_ROUTE])

    await waitFor(() => expect(screen.getByText('首次使用清单')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /重新打开首轮引导/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /重新打开首轮引导/ }))
    expect(window.localStorage.getItem(userFirstRunStorageKeyForUser(1))).toBe('false')
    expect(await screen.findByText('欢迎进入共享控制台')).toBeInTheDocument()
    expect(screen.queryByText('首次使用清单')).not.toBeInTheDocument()
    expect(screen.getByText('当前角色：普通用户。先走通采购、订单与接入三步，再在同一套工作台里继续扩展角色能力。')).toBeInTheDocument()
  })

  it('waits for server menu instead of rendering fallback privileged navigation from client role state', () => {
    setSession('admin')
    mockedGetCurrentUser.mockResolvedValueOnce({ user: { id: 1, email: 'admin@nexus-mail.local', role: 'admin' } })
    mockedGetMenu.mockImplementationOnce(
      () =>
        new Promise(() => {
          // keep pending to verify no client-derived fallback menu leaks privileged entries
        }),
    )

    renderApp(['/'])

    expect(screen.getByText(SHARED_CONSOLE_MENU_LOADING_LABEL)).toBeInTheDocument()
    expect(screen.queryByText('用户管理')).not.toBeInTheDocument()
    expect(screen.queryByText('风控中心')).not.toBeInTheDocument()
  })

  it('keeps shared integration routes reachable after register bootstrap', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })
    mockedRegister.mockResolvedValueOnce({
      token: 'register-token',
      refresh_token: 'register-refresh',
      user: { id: 8, email: 'new@example.com', role: 'user' },
    })

    renderApp([DEFAULT_LOGIN_ROUTE])

    await user.click(await screen.findByRole('button', { name: '注册' }))
    await user.type(screen.getByPlaceholderText('name@example.com'), 'new@example.com')
    await user.type(screen.getByPlaceholderText('至少 8 位密码'), 'Password123!')
    await user.type(screen.getByPlaceholderText('再次输入密码'), 'Password123!')
    await user.click(screen.getByRole('button', { name: '创建账户并进入控制台' }))

    expect((await screen.findAllByText('控制台总览')).length).toBeGreaterThan(0)
    expect(mockedGetMenu).toHaveBeenCalled()
    await waitFor(() => {
      const menuPaths = useAuthStore.getState().menu.map((item) => item.path)
      expect(menuPaths).toEqual(expect.arrayContaining([PROJECTS_ROUTE, ORDERS_ROUTE, API_KEYS_ROUTE, WEBHOOKS_ROUTE, SETTINGS_ROUTE]))
    })
  })

  it('hides supplier and admin-only menu labels for a newly registered user shell', async () => {
    useAuthStore.setState({
      token: 'user-token',
      refreshToken: 'user-refresh',
      user: { id: 8, email: 'new@example.com', role: 'user' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'projects', label: '项目市场', path: PROJECTS_ROUTE },
        { key: 'orders', label: '订单中心', path: ORDERS_ROUTE },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
        { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
        { key: 'docs', label: 'API 文档', path: DOCS_ROUTE },
        { key: 'settings', label: '设置中心', path: SETTINGS_ROUTE },
      ],
    })

    renderApp(['/'])

    expect((await screen.findAllByText('控制台总览')).length).toBeGreaterThan(0)
    expect((await screen.findAllByText('基础工作台')).length).toBeGreaterThan(0)
    expect(screen.queryByText('供应商扩展')).not.toBeInTheDocument()
    expect(screen.queryByText('管理员扩展')).not.toBeInTheDocument()
    expect(screen.queryByText('域名管理')).not.toBeInTheDocument()
    expect(screen.queryByText('风控中心')).not.toBeInTheDocument()
  })

  it('scopes first-run dismissal by user id so one user does not hide onboarding for another', async () => {
    const user = userEvent.setup()
    window.localStorage.clear()

    useAuthStore.setState({
      token: 'token-a',
      refreshToken: 'refresh-a',
      user: { id: 1, email: 'user1@nexus-mail.local', role: 'user' },
      menu: [],
    })

    mockedGetCurrentUser.mockResolvedValueOnce({ user: { id: 1, email: 'user1@nexus-mail.local', role: 'user' } })
    mockedGetMenu.mockResolvedValueOnce({
      role: 'user',
      items: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'projects', label: '项目市场', path: '/projects' },
        { key: 'orders', label: '订单中心', path: '/orders' },
        { key: 'api-keys', label: 'API Keys', path: '/api-keys' },
        { key: 'webhooks', label: 'Webhook 设置', path: '/webhooks' },
        { key: 'settings', label: '设置中心', path: '/settings' },
        { key: 'docs', label: 'API 文档', path: '/docs' },
      ],
    })

    const firstView = renderApp(['/'])
    expect(await screen.findByText('欢迎进入共享控制台')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /稍后再看/ }))
    await waitFor(() => expect(screen.queryByText('欢迎进入共享控制台')).not.toBeInTheDocument())
    expect(window.localStorage.getItem(userFirstRunStorageKeyForUser(1))).toBe('true')
    firstView.unmount()

    useAuthStore.setState({
      token: 'token-b',
      refreshToken: 'refresh-b',
      user: { id: 2, email: 'user2@nexus-mail.local', role: 'user' },
      menu: [],
    })

    mockedGetCurrentUser.mockResolvedValueOnce({ user: { id: 2, email: 'user2@nexus-mail.local', role: 'user' } })
    mockedGetMenu.mockResolvedValueOnce({
      role: 'user',
      items: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'projects', label: '项目市场', path: '/projects' },
        { key: 'orders', label: '订单中心', path: '/orders' },
        { key: 'api-keys', label: 'API Keys', path: '/api-keys' },
        { key: 'webhooks', label: 'Webhook 设置', path: '/webhooks' },
        { key: 'settings', label: '设置中心', path: '/settings' },
        { key: 'docs', label: 'API 文档', path: '/docs' },
      ],
    })

    renderApp(['/'])
    expect(await screen.findByText('欢迎进入共享控制台')).toBeInTheDocument()
    expect(window.localStorage.getItem(userFirstRunStorageKeyForUser(2))).toBeNull()
  })

  it('shows first-run onboarding guidance for default user dashboard and allows dismissing it', async () => {
    const user = userEvent.setup()
    window.localStorage.removeItem(userFirstRunStorageKeyForUser(1))
    setSession('user')

    renderApp(['/'])

    expect(await screen.findByText('欢迎进入共享控制台')).toBeInTheDocument()
    expect(screen.getByText('当前角色：普通用户。先走通采购、订单与接入三步，再在同一套工作台里继续扩展角色能力。')).toBeInTheDocument()
    expect(screen.getByText('先完成基础采购路径')).toBeInTheDocument()
    expect(screen.getByText('后续角色能力仍在同一壳内扩展')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /稍后再看/ }))
    await waitFor(() => expect(screen.queryByText('欢迎进入共享控制台')).not.toBeInTheDocument())
    expect(window.localStorage.getItem(userFirstRunStorageKeyForUser(1))).toBe('true')
  })

  it('does not show first-run onboarding guidance for supplier dashboard', async () => {
    window.localStorage.removeItem(userFirstRunStorageKeyForUser(2))
    setSession('supplier')
    mockedGetCurrentUser.mockResolvedValue({ user: { id: 2, email: 'supplier@nexus-mail.local', role: 'supplier' } })
    mockedGetMenu.mockResolvedValueOnce({
      role: 'supplier',
      items: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'orders', label: '订单中心', path: '/orders' },
        { key: 'supplier-domains', label: '域名管理', path: '/supplier/domains' },
      ],
    })

    renderApp(['/'])

    expect(await screen.findByText('供应商主任务')).toBeInTheDocument()
    expect(screen.queryByText('普通用户首轮引导')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '查看结算页' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '打开 Webhook 设置' })).not.toBeInTheDocument()
  })

  it('shows onboarding checklist on settings page for default user only', async () => {
    setSession('user')

    renderApp([SETTINGS_ROUTE])

    expect(await screen.findByText('首次使用清单')).toBeInTheDocument()
    expect(screen.getByText('重新打开首轮引导')).toBeInTheDocument()
  })

  it('does not show onboarding checklist on settings page for supplier role', async () => {
    setSession('supplier')
    mockedGetCurrentUser.mockResolvedValue({ user: { id: 2, email: 'supplier@nexus-mail.local', role: 'supplier' } })
    mockedGetMenu.mockResolvedValue({
      role: 'supplier',
      items: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'settings', label: '设置中心', path: '/settings' },
        { key: 'supplier-domains', label: '域名管理', path: '/supplier/domains' },
      ],
    })

    renderApp([SETTINGS_ROUTE])

    expect(await screen.findByText('控制台模式')).toBeInTheDocument()
    expect(screen.queryByText('首次使用清单')).not.toBeInTheDocument()
  })

  it('navigates from profile page CTA to the supplier domains page', async () => {
    const user = userEvent.setup()
    setSession('supplier')
    mockedGetCurrentUser.mockResolvedValue({ user: { id: 2, email: 'supplier@nexus-mail.local', role: 'supplier' } })
    mockedGetMenu.mockResolvedValue({
      role: 'supplier',
      items: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'profile', label: '个人资料', path: '/profile' },
        { key: 'supplier-domains', label: '域名管理', path: '/supplier/domains' },
      ],
    })

    renderApp(['/profile'])

    await waitFor(() => expect(screen.getByText('供应商运营焦点')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: '前往域名管理' }))
    expect(await screen.findByText('域名池运营中枢')).toBeInTheDocument()
  })

  it('renders dashboard with role mission panel and navigable next actions for supplier', async () => {
    const user = userEvent.setup()
    setSession('supplier')
    mockedGetCurrentUser.mockResolvedValue({ user: { id: 2, email: 'supplier@nexus-mail.local', role: 'supplier' } })
    mockedGetMenu.mockResolvedValue({
      role: 'supplier',
      items: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'supplier-domains', label: '域名管理', path: '/supplier/domains' },
        { key: 'supplier-offerings', label: '供货规则', path: '/supplier/offerings' },
        { key: 'supplier-settlements', label: '供应商结算', path: '/supplier/settlements' },
        { key: 'settings', label: '设置中心', path: '/settings' },
      ],
    })

    renderApp(['/'])

    expect(await screen.findByText('供应商主任务')).toBeInTheDocument()
    expect(screen.getAllByText('域名池运营').length).toBeGreaterThan(0)
    expect(screen.getByText('设置中心继续连接 Webhook、API Keys 与共享会话说明。')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '前往域名管理' }))
    expect(await screen.findByText('域名池运营中枢')).toBeInTheDocument()
  })

  it('navigates from settings shortcuts to admin risk and audit pages', async () => {
    const user = userEvent.setup()
    setSession('admin')
    mockedGetCurrentUser.mockResolvedValue({ user: { id: 1, email: 'admin@nexus-mail.local', role: 'admin' } })
    mockedGetMenu.mockResolvedValue({
      role: 'admin',
      items: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'settings', label: '设置中心', path: '/settings' },
        { key: 'admin-risk', label: '风控中心', path: '/admin/risk' },
        { key: 'admin-audit', label: '审计日志', path: '/admin/audit' },
      ],
    })

    renderApp([SETTINGS_ROUTE])

    await waitFor(() => expect(screen.getByText('风险规则联动')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /前往风控中心/ }))
    expect(await screen.findByText('Risk Mission Control')).toBeInTheDocument()

    renderApp([SETTINGS_ROUTE])
    await waitFor(() => expect(screen.getByText('审计追踪')).toBeInTheDocument())
    await user.click(screen.getAllByRole('button', { name: /查看审计日志/ })[0])
    expect(await screen.findByText('Audit Mission Control')).toBeInTheDocument()
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

    expect(await screen.findByText('Webhook 运维与回调观测')).toBeInTheDocument()
    expect(screen.getByText('端点总数')).toBeInTheDocument()
    expect(screen.getByText('失败 / 排队中')).toBeInTheDocument()
    expect(screen.getByText('当前 endpoint')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '发送测试投递' }).length).toBeGreaterThan(0)
  })

  it('creates a webhook test delivery and refreshes the delivery feed', async () => {
    const user = userEvent.setup()
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

    await user.click(await screen.findByRole('button', { name: '发送测试投递' }))
    await waitFor(() => expect(mockedCreateWebhookTestDelivery).toHaveBeenCalledWith(11))
    await waitFor(() => expect(mockedGetWebhookDeliveries).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('测试投递已入队，系统将异步真实回调目标地址')).toBeInTheDocument()
  })

  it('renders admin risk page with signal cards and rule editor', async () => {
    setSession('admin')
    mockedGetCurrentUser.mockResolvedValue({ user: { id: 1, email: 'admin@nexus-mail.local', role: 'admin' } })
    mockedGetMenu.mockResolvedValue({
      role: 'admin',
      items: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'admin-risk', label: '风控中心', path: '/admin/risk' },
        { key: 'admin-audit', label: '审计日志', path: '/admin/audit' },
        { key: 'webhooks', label: 'Webhook 设置', path: '/webhooks' },
      ],
    })

    renderApp(['/admin/risk'])

    expect(await screen.findByText('Risk Mission Control')).toBeInTheDocument()
    expect(screen.getByText('规则命中概览')).toBeInTheDocument()
    expect(screen.getByText('处置建议')).toBeInTheDocument()
    expect(screen.getByText('API Key 白名单拦截频繁')).toBeInTheDocument()
    expect(screen.getByText('高风险')).toBeInTheDocument()
  })

  it('renders admin audit page with filters and highlighted denied actions', async () => {
    setSession('admin')
    mockedGetCurrentUser.mockResolvedValue({ user: { id: 1, email: 'admin@nexus-mail.local', role: 'admin' } })
    mockedGetMenu.mockResolvedValue({
      role: 'admin',
      items: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'admin-audit', label: '审计日志', path: '/admin/audit' },
        { key: 'admin-risk', label: '风控中心', path: '/admin/risk' },
        { key: 'supplier-domains', label: '域名管理', path: '/supplier/domains' },
      ],
    })
    mockedGetAdminAudit.mockResolvedValueOnce({
      items: [
        { id: 1, user_id: 3, api_key_id: 9, action: 'denied_whitelist', actor_type: 'system', note: 'blocked', created_at: '2026-04-28T00:00:00Z' },
        { id: 2, user_id: 3, api_key_id: 9, action: 'success', actor_type: 'user', note: 'scope ok', created_at: '2026-04-28T00:01:00Z' },
      ],
    })

    renderApp(['/admin/audit'])

    expect(await screen.findByText('Audit Mission Control')).toBeInTheDocument()
    expect(screen.getByText('高风险动作')).toBeInTheDocument()
    expect(screen.getAllByText('denied_whitelist').length).toBeGreaterThan(0)
    expect(screen.getByText('blocked')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '查询审计' })).toBeInTheDocument()
  })

  it('blocks supplier routes for plain users', async () => {
    setSession('user')
    renderApp([SUPPLIER_RESOURCES_ROUTE])
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
    await waitFor(() => expect(screen.getAllByText('50.00%').length).toBeGreaterThanOrEqual(1))
    await waitFor(() => expect(screen.getAllByText('当前重点关注供应商').length).toBeGreaterThanOrEqual(1))
    expect(screen.getByText('鉴权拒绝总数：2')).toBeInTheDocument()
  })
})
