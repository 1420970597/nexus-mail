import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { useAuthStore } from './store/authStore'
import * as authService from './services/auth'

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
    getAdminAudit: vi.fn(),
  }
})

const mockedGetCurrentUser = vi.mocked(authService.getCurrentUser)
const mockedGetMenu = vi.mocked(authService.getMenu)
const mockedGetDashboardOverview = vi.mocked(authService.getDashboardOverview)
const mockedGetAdminOverview = vi.mocked(authService.getAdminOverview)
const mockedGetAdminRisk = vi.mocked(authService.getAdminRisk)
const mockedGetAdminAudit = vi.mocked(authService.getAdminAudit)

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
        { key: 'settings', label: '设置中心', path: '/settings' },
      ],
    })
    mockedGetDashboardOverview.mockResolvedValue({ message: 'dashboard ready', stats: { projects: 6, suppliers: 1, orders: 5 } })
    mockedGetAdminOverview.mockResolvedValue({
      generated_at: '2026-04-28T00:00:00Z',
      summary: {
        users: { total: 3 },
        orders: { total: 5, waiting_email: 1, ready: 1, finished: 1, canceled: 1, timeout: 1 },
        disputes: { total: 2, open: 1, resolved: 1, rejected: 0 },
        projects: { total: 2, active: 1, inactive: 1 },
        suppliers: { total: 2 },
        audit: { total: 3, create: 1, revoke: 0, success: 1, denied_invalid: 0, denied_scope: 0, denied_whitelist: 1 },
        supplier_settlements: { pending_amount: 1500 },
      },
      recent_audit: [{ id: 1, user_id: 3, api_key_id: 9, action: 'denied_whitelist', actor_type: 'system', note: 'blocked', created_at: '2026-04-28T00:00:00Z' }],
    })
    mockedGetAdminRisk.mockResolvedValue({
      generated_at: '2026-04-28T00:00:00Z',
      summary: { open_disputes: 1, denied_whitelist: 1, denied_scope: 0, denied_invalid: 0, timeout_orders: 2, canceled_orders: 1, high_risk_signal_count: 1, medium_risk_signal_count: 1 },
      signals: [{ category: 'auth', severity: 'high', count: 1, title: 'API Key 白名单拦截频繁', detail: '最近审计中检测到 1 次 denied_whitelist 事件' }],
    })
    mockedGetAdminAudit.mockResolvedValue({ items: [{ id: 1, user_id: 3, api_key_id: 9, action: 'success', actor_type: 'system', note: 'scope ok', created_at: '2026-04-28T00:00:00Z' }] })
  })

  afterEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })
  })

  it('renders login page when unauthenticated', () => {
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })
    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByText('登录 Nexus-Mail')).toBeInTheDocument()
  })

  it('renders api key page for authenticated user', async () => {
    setSession('user')
    render(
      <MemoryRouter initialEntries={['/api-keys']}>
        <App />
      </MemoryRouter>,
    )
    expect(await screen.findByRole('heading', { name: 'API Keys' })).toBeInTheDocument()
    await waitFor(() => expect(mockedGetMenu).toHaveBeenCalled())
  })

  it('blocks supplier routes for plain users', async () => {
    setSession('user')
    render(
      <MemoryRouter initialEntries={['/supplier/resources']}>
        <App />
      </MemoryRouter>,
    )
    expect(await screen.findByText('控制台总览')).toBeInTheDocument()
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
    render(
      <MemoryRouter initialEntries={['/admin/risk']}>
        <App />
      </MemoryRouter>,
    )
    expect(await screen.findByRole('heading', { name: '风控中心' })).toBeInTheDocument()
    expect(await screen.findByText('API Key 白名单拦截频繁')).toBeInTheDocument()
  })
})
