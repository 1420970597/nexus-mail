import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
    window.sessionStorage.clear()
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })
  })

  it('renders the login shell when unauthenticated', async () => {
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })
    renderApp([DEFAULT_LOGIN_ROUTE])
    expect(await screen.findByRole('heading', { name: '统一登录后控制台' })).toBeInTheDocument()
    const loginCopyRegion = screen.getByRole('region', { name: '登录认证说明' })
    expect(within(loginCopyRegion).getByRole('heading', { name: '登录并进入统一控制台' })).toBeInTheDocument()
  })

  it('clears local session on bootstrap failure without revoking refresh session server-side', async () => {
    setSession('user')
    mockedGetCurrentUser.mockRejectedValueOnce(new Error('transient bootstrap failure'))

    renderApp(['/'])

    expect(await screen.findByRole('heading', { name: '统一登录后控制台' })).toBeInTheDocument()

    expect(authService.logoutSession).not.toHaveBeenCalled()
    expect(useAuthStore.getState()).toMatchObject({
      token: null,
      refreshToken: null,
      user: null,
      menu: [],
    })
  })

  it('persists access and refresh tokens in sessionStorage when setting a session', () => {
    useAuthStore.getState().setSession('stored-token', 'stored-refresh-token', {
      id: 1,
      email: 'user@nexus-mail.local',
      role: 'user',
    })

    expect(window.sessionStorage.getItem('nexus-mail-token')).toBe('stored-token')
    expect(window.sessionStorage.getItem('nexus-mail-refresh-token')).toBe('stored-refresh-token')
    expect(window.sessionStorage.getItem('nexus-mail-user')).toContain('user@nexus-mail.local')
    expect(useAuthStore.getState().refreshToken).toBe('stored-refresh-token')
  })

  it('shows a named bootstrap recovery region while restoring the shared console shell', async () => {
    setSession('user')

    let resolveCurrentUser: ((value: { user: { id: number; email: string; role: 'user' } }) => void) | undefined
    let resolveMenu: ((value: { role: 'user'; items: Array<{ key: string; label: string; path: string }> }) => void) | undefined

    mockedGetCurrentUser.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveCurrentUser = resolve
        }),
    )
    mockedGetMenu.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveMenu = resolve
        }),
    )

    renderApp(['/'])

    const bootstrapRegion = await screen.findByRole('region', { name: '正在恢复共享控制台' })
    expect(bootstrapRegion).toBeInTheDocument()
    expect(within(bootstrapRegion).getByRole('heading', { name: '正在恢复共享控制台' })).toBeInTheDocument()
    expect(within(bootstrapRegion).getByText('正在同步当前账号、角色菜单与深链落点，确保刷新页面后仍停留在同一套登录后工作台，而不是回退到错误角色页。')).toBeInTheDocument()
    expect(within(bootstrapRegion).getByText('共享控制台引导')).toBeInTheDocument()
    expect(within(bootstrapRegion).queryByRole('heading', { name: '控制台总览' })).not.toBeInTheDocument()

    resolveCurrentUser?.({ user: { id: 1, email: 'user@nexus-mail.local', role: 'user' } })
    resolveMenu?.({
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

    expect(await screen.findByRole('heading', { name: '控制台总览' })).toBeInTheDocument()
  })

  it('falls back to the dashboard workspace when no higher-priority landing route exists', async () => {
    setSession('supplier')
    mockedGetCurrentUser.mockResolvedValueOnce({ user: { id: 2, email: 'supplier@nexus-mail.local', role: 'supplier' } })
    mockedGetMenu.mockResolvedValueOnce({
      role: 'supplier',
      items: [
        { key: 'docs', label: 'API 文档', path: '/docs' },
      ],
    })

    renderApp(['/'])

    await waitFor(() => {
      expect(useAuthStore.getState().bootstrapStatus).toBe('ready')
      expect(useAuthStore.getState().menu).toEqual([
        { key: 'docs', label: 'API 文档', path: '/docs' },
      ])
      expect(useAuthStore.getState().user).toMatchObject({ role: 'supplier' })
    })

    expect(screen.queryByRole('heading', { level: 3, name: 'API 文档与接入控制台' })).not.toBeInTheDocument()
    expect(screen.queryByTestId('docs-shared-console-loop')).not.toBeInTheDocument()
    expect(screen.queryByTestId('docs-shared-console-bridge')).not.toBeInTheDocument()
    expect(screen.queryByTitle('nexus-mail-api-docs')).not.toBeInTheDocument()
  })

  it('keeps an allowed shared-console deep link after bootstrap instead of forcing a root-only landing redirect', async () => {
    setSession('user')
    mockedGetCurrentUser.mockResolvedValueOnce({ user: { id: 1, email: 'user@nexus-mail.local', role: 'user' } })
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

    renderApp([API_KEYS_ROUTE])

    const apiKeysHeading = await screen.findByRole('heading', { name: '开发者 API 接入工作台' })
    expect(apiKeysHeading).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '控制台总览' })).not.toBeInTheDocument()
  })

  it('redirects an invalid deep link back to the dashboard when the shared home route remains available', async () => {
    setSession('user')
    mockedGetCurrentUser.mockResolvedValueOnce({ user: { id: 1, email: 'user@nexus-mail.local', role: 'user' } })
    mockedGetMenu.mockResolvedValueOnce({
      role: 'user',
      items: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'projects', label: '项目市场', path: PROJECTS_ROUTE },
        { key: 'orders', label: '订单中心', path: ORDERS_ROUTE },
      ],
    })

    renderApp(['/missing-shared-route'])

    expect(await screen.findByRole('heading', { name: '控制台总览' })).toBeInTheDocument()
  })

  it('shows register journey CTA and opens a named registration form region from the login shell', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })
    renderApp(['/login'])

    const registerJourneyRegion = screen.getByRole('region', { name: '首轮接入路径' })
    const registerJourneyScope = within(registerJourneyRegion)

    expect(registerJourneyScope.getByRole('button', { name: /立即注册，进入共享控制台/ })).toBeInTheDocument()

    await user.click(registerJourneyScope.getByRole('button', { name: /立即注册，进入共享控制台/ }))
    const authShell = screen.getByTestId('login-auth-shell')
    const registerFormRegion = within(authShell).getByRole('region', { name: '创建账号并进入统一控制台' })
    expect(within(registerFormRegion).getByRole('heading', { name: '创建账号并进入统一控制台' })).toBeInTheDocument()
    expect(within(registerFormRegion).getByRole('button', { name: '注册并进入统一控制台' })).toBeInTheDocument()
  })

  async function openRegisterMode(user: ReturnType<typeof userEvent.setup>) {
    await user.click(await screen.findByRole('button', { name: /立即注册，进入共享控制台/ }))
  }

  async function submitRegistration(user: ReturnType<typeof userEvent.setup>, email = 'new@example.com') {
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), { target: { value: email } })
    fireEvent.change(screen.getByPlaceholderText('至少 8 位密码'), { target: { value: 'Password123!' } })
    fireEvent.change(screen.getByPlaceholderText('再次输入密码'), { target: { value: 'Password123!' } })
    await user.click(screen.getByRole('button', { name: '注册并进入统一控制台' }))
    await waitFor(() => expect(mockedRegister).toHaveBeenCalledWith(email, 'Password123!'))
  }

  async function expectDefaultUserFirstRunLane() {
    const onboardingRegion = await screen.findByRole('region', { name: '推荐下一步' })
    await within(onboardingRegion).findByTestId('dashboard-next-step-api-keys')
    const scoped = within(onboardingRegion)
    expect(scoped.getByRole('button', { name: '前往项目市场' })).toBeInTheDocument()
    expect(scoped.getByRole('button', { name: '查看订单中心' })).toBeInTheDocument()
    expect(scoped.getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()
    expect(within(scoped.getByTestId('dashboard-next-step-api-keys')).getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()
    expect(scoped.queryByRole('button', { name: '前往域名管理' })).not.toBeInTheDocument()
    expect(scoped.queryByRole('button', { name: '查看风控中心' })).not.toBeInTheDocument()
    return onboardingRegion
  }

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

    await openRegisterMode(user)
    await submitRegistration(user)

    const onboardingRegion = await expectDefaultUserFirstRunLane()
    expect(within(onboardingRegion).getByTestId('dashboard-next-step-projects')).toBeInTheDocument()
    expect(within(onboardingRegion).getByTestId('dashboard-next-step-orders')).toBeInTheDocument()
    expect(within(onboardingRegion).getByTestId('dashboard-next-step-api-keys')).toBeInTheDocument()
    expect(within(onboardingRegion).getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()
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

    await openRegisterMode(user)
    await submitRegistration(user)

    const onboardingRegion = await expectDefaultUserFirstRunLane()
    const apiKeysActionCard = within(onboardingRegion).getByTestId('dashboard-next-step-api-keys')
    expect(within(apiKeysActionCard).getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()
    expect(within(apiKeysActionCard).getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()
  })

  it('keeps settings guidance entry available after dismissing first-run mission cards for default user', async () => {
    const user = userEvent.setup()
    window.localStorage.removeItem(userFirstRunStorageKeyForUser(1))
    setSession('user')

    const dashboardView = renderApp(['/'])
    await expectDefaultUserFirstRunLane()
    await user.click(screen.getByTestId('dashboard-first-run-dismiss'))
    await waitFor(() => expect(window.localStorage.getItem(userFirstRunStorageKeyForUser(1))).toBe('true'))

    dashboardView.unmount()
    renderApp([SETTINGS_ROUTE])

    const checklist = await screen.findByTestId('settings-user-first-run-checklist')
    expect(within(checklist).getByRole('button', { name: /重新打开首轮引导/ })).toBeInTheDocument()
    await user.click(within(checklist).getByRole('button', { name: /重新打开首轮引导/ }))
    expect(window.localStorage.getItem(userFirstRunStorageKeyForUser(1))).toBe('false')

    const reopenedOnboarding = await expectDefaultUserFirstRunLane()
    expect(screen.queryByTestId('settings-user-first-run-checklist')).not.toBeInTheDocument()
    expect(within(reopenedOnboarding).getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()
  })

  it('shows a shared-console bootstrap shell while waiting for server menu instead of rendering fallback privileged navigation from client role state', () => {
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
    expect(screen.getByTestId('auth-bootstrap-shell')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '正在恢复共享控制台' })).toBeInTheDocument()
    expect(screen.getByText('共享控制台引导')).toBeInTheDocument()
    expect(screen.queryByText('shared-console bootstrap')).not.toBeInTheDocument()
    const dashboardMain = screen.getByRole('main', { name: '控制台主内容' })
    expect(within(dashboardMain).queryByText('用户管理')).not.toBeInTheDocument()
    expect(within(dashboardMain).queryByText('风控中心')).not.toBeInTheDocument()
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

    const authModeSwitch = await screen.findByTestId('login-auth-mode-switch')
    await user.click(within(authModeSwitch).getByRole('tab', { name: '注册' }))
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), { target: { value: 'new@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('至少 8 位密码'), { target: { value: 'Password123!' } })
    fireEvent.change(screen.getByPlaceholderText('再次输入密码'), { target: { value: 'Password123!' } })
    await user.click(screen.getByRole('button', { name: '注册并进入统一控制台' }))

    const onboardingRegion = await expectDefaultUserFirstRunLane()
    void onboardingRegion
    expect(mockedGetMenu).toHaveBeenCalled()
    await waitFor(() => {
      const menuPaths = useAuthStore.getState().menu.map((item) => item.path)
      expect(menuPaths).toEqual(expect.arrayContaining([PROJECTS_ROUTE, ORDERS_ROUTE, API_KEYS_ROUTE, WEBHOOKS_ROUTE, SETTINGS_ROUTE]))
    })
  })

  it('keeps the post-login sidebar scoped to the shared group when a plain user has no supplier/admin routes', async () => {
    useAuthStore.setState({
      token: 'register-token',
      refreshToken: 'register-refresh',
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

    mockedGetDashboardOverview.mockResolvedValueOnce({
      message: 'dashboard ready',
      stats: { projects: 6, suppliers: 1, orders: 5 },
    })
    renderApp(['/'])
    expect(await screen.findByTestId('app-sidebar-shared-group')).toBeInTheDocument()

    const sharedGroup = screen.getByTestId('app-sidebar-shared-group')
    expect(within(sharedGroup).getByText('项目市场')).toBeInTheDocument()
    expect(screen.queryByTestId('app-sidebar-supplier-group')).not.toBeInTheDocument()
    expect(screen.queryByTestId('app-sidebar-admin-group')).not.toBeInTheDocument()
    expect(within(sharedGroup).queryByText('域名管理')).not.toBeInTheDocument()
    expect(within(sharedGroup).queryByText('风控中心')).not.toBeInTheDocument()
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
    const firstLane = await expectDefaultUserFirstRunLane()
    expect(within(firstLane).getByRole('button', { name: '前往项目市场' })).toBeInTheDocument()
    await user.click(screen.getByTestId('dashboard-first-run-dismiss'))
    await waitFor(() => expect(window.localStorage.getItem(userFirstRunStorageKeyForUser(1))).toBe('true'))
    await waitFor(() => expect(screen.queryByTestId('dashboard-first-run-dismiss')).not.toBeInTheDocument())
    expect(screen.getByRole('region', { name: '推荐下一步' })).toBeInTheDocument()
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
    const secondLane = await expectDefaultUserFirstRunLane()
    expect(within(secondLane).getByRole('button', { name: '查看订单中心' })).toBeInTheDocument()
    expect(window.localStorage.getItem(userFirstRunStorageKeyForUser(2))).toBeNull()
  })

  it('shows first-run onboarding guidance for default user dashboard and allows dismissing it', async () => {
    const user = userEvent.setup()
    window.localStorage.removeItem(userFirstRunStorageKeyForUser(1))
    setSession('user')

    renderApp(['/'])

    const onboardingRegion = await expectDefaultUserFirstRunLane()
    const onboardingScope = within(onboardingRegion)
    expect(onboardingScope.getByRole('button', { name: '查看余额中心' })).toBeInTheDocument()
    expect(onboardingScope.getByRole('button', { name: '前往项目市场' })).toBeInTheDocument()
    expect(onboardingScope.getByRole('button', { name: '查看订单中心' })).toBeInTheDocument()
    expect(onboardingScope.getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()
    expect(within(onboardingScope.getByTestId('dashboard-next-step-api-keys')).getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()
    expect(within(onboardingScope.getByTestId('dashboard-next-step-api-keys')).queryByRole('button', { name: '打开 Webhook 设置' })).not.toBeInTheDocument()

    await user.click(screen.getByTestId('dashboard-first-run-dismiss'))
    await waitFor(() => expect(window.localStorage.getItem(userFirstRunStorageKeyForUser(1))).toBe('true'))
    await waitFor(() => expect(screen.queryByTestId('dashboard-first-run-dismiss')).not.toBeInTheDocument())
    expect(screen.getByRole('region', { name: '推荐下一步' })).toBeInTheDocument()
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

    const roleGuidance = await screen.findByTestId('dashboard-role-guidance')
    const guidanceScope = within(roleGuidance)
    expect(guidanceScope.getByRole('heading', { name: '供应商主任务' })).toBeInTheDocument()
    expect(guidanceScope.getByText('维护域名池')).toBeInTheDocument()
    expect(guidanceScope.queryByText('普通用户首轮引导')).not.toBeInTheDocument()
    expect(guidanceScope.queryByRole('button', { name: '查看结算页' })).not.toBeInTheDocument()
    expect(guidanceScope.queryByRole('button', { name: '打开 Webhook 设置' })).not.toBeInTheDocument()
  })

  it('shows onboarding checklist on settings page for default user only', async () => {
    setSession('user')

    renderApp([SETTINGS_ROUTE])

    expect(await screen.findByRole('heading', { name: '首次使用清单' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /重新打开首轮引导/ })).toBeInTheDocument()
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

    const sessionCard = await screen.findByRole('region', { name: '当前登录会话' })
    expect(within(sessionCard).getByRole('heading', { name: '当前登录会话' })).toBeInTheDocument()
    expect(within(sessionCard).getByText('控制台模式')).toBeInTheDocument()
    const settingsMain = screen.getByRole('main', { name: '控制台主内容' })
    expect(within(settingsMain).queryByText('首次使用清单')).not.toBeInTheDocument()
    expect(within(settingsMain).queryByTestId('settings-user-first-run-checklist')).not.toBeInTheDocument()
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

    const profileIdentityCard = await screen.findByTestId('profile-primary-identity-card')
    expect(within(profileIdentityCard).getByText('supplier@nexus-mail.local')).toBeInTheDocument()
    await user.click(within(profileIdentityCard).getByRole('button', { name: '前往域名管理' }))
    const supplierDomainsHero = await screen.findByTestId('supplier-domains-hero-card')
    expect(within(supplierDomainsHero).getByRole('heading', { name: '域名池运营中枢' })).toBeInTheDocument()
  })

  it('renders supplier dashboard CTA flow and routes into supplier domains', async () => {
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

    expect(await screen.findByRole('heading', { name: '供应商主任务' })).toBeInTheDocument()
    const supplierRouteMap = screen.getByTestId('dashboard-role-surface-map')
    const roleActions = screen.getByTestId('dashboard-role-actions')
    expect(within(supplierRouteMap).getByText('共享接入')).toBeInTheDocument()
    expect(within(supplierRouteMap).getByText('/settings')).toBeInTheDocument()
    await user.click(within(roleActions).getByRole('button', { name: '前往域名管理' }))
    const supplierDomainsHero = await screen.findByTestId('supplier-domains-hero-card')
    expect(within(supplierDomainsHero).getByRole('heading', { name: '域名池运营中枢' })).toBeInTheDocument()
  })

  it('preserves deep-linked admin risk and audit workspaces after bootstrap', async () => {
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

    const riskView = renderApp(['/admin/risk'])
    expect(await screen.findByTestId('admin-risk-overview-card')).toBeInTheDocument()
    const riskHeaderSummary = screen.getByTestId('console-layout-header-summary')
    expect(within(riskHeaderSummary).getByRole('heading', { name: '风控中心' })).toBeInTheDocument()

    riskView.unmount()
    renderApp(['/admin/audit'])
    expect(await screen.findByTestId('admin-audit-events-table-card')).toBeInTheDocument()
    const auditHeaderSummary = screen.getByTestId('console-layout-header-summary')
    expect(within(auditHeaderSummary).getByRole('heading', { name: '审计日志' })).toBeInTheDocument()
  })

  it('preserves a deep-linked admin audit route after bootstrap instead of redirecting to the preferred admin landing page', async () => {
    setSession('admin')
    mockedGetCurrentUser.mockResolvedValueOnce({ user: { id: 1, email: 'admin@nexus-mail.local', role: 'admin' } })
    mockedGetMenu.mockResolvedValueOnce({
      role: 'admin',
      items: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'settings', label: '设置中心', path: '/settings' },
        { key: 'admin-risk', label: '风控中心', path: '/admin/risk' },
        { key: 'admin-audit', label: '审计日志', path: '/admin/audit' },
      ],
    })

    renderApp(['/admin/audit'])

    const auditTable = await screen.findByTestId('admin-audit-events-table-card')
    expect(auditTable).toBeInTheDocument()
    const headerSummary = screen.getByTestId('console-layout-header-summary')
    expect(within(headerSummary).getByRole('heading', { name: '审计日志' })).toBeInTheDocument()
    expect(screen.queryByTestId('admin-risk-overview-card')).not.toBeInTheDocument()
  })

  it('renders webhook operations workspace for authenticated admin routes', async () => {
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

    const currentEndpointCard = await screen.findByRole('region', { name: '当前 endpoint' })
    expect(currentEndpointCard).toBeInTheDocument()

    const headerSummary = screen.getByTestId('console-layout-header-summary')
    expect(within(headerSummary).getByRole('heading', { name: 'Webhook 运维与回调观测' })).toBeInTheDocument()
  })

  it('redirects plain users from supplier routes back into the shared dashboard next-steps region', async () => {
    setSession('user')
    renderApp([SUPPLIER_RESOURCES_ROUTE])
    expect(await screen.findByRole('region', { name: '推荐下一步' })).toBeInTheDocument()
  })
})
