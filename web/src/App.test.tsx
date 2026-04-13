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
  }
})

const mockedGetCurrentUser = vi.mocked(authService.getCurrentUser)
const mockedGetMenu = vi.mocked(authService.getMenu)
const mockedGetDashboardOverview = vi.mocked(authService.getDashboardOverview)

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
    mockedGetDashboardOverview.mockResolvedValue({ message: 'dashboard ready' })
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
})
