import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { DashboardPage } from './DashboardPage'
import * as authService from '../services/auth'
import { useAuthStore } from '../store/authStore'
import {
  API_KEYS_ROUTE,
  BALANCE_ROUTE,
  DASHBOARD_ROUTE,
  DOCS_ROUTE,
  ORDERS_ROUTE,
  PROJECTS_ROUTE,
  SETTINGS_ROUTE,
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
  }

  useAuthStore.setState({
    token: 'token',
    refreshToken: 'refresh-token',
    user: { id: 1, email: 'user@nexus-mail.local', role: 'user' },
    menu: paths.map((path) => ({ key: path, label: labels[path] ?? path, path })),
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
            <section data-testid="dashboard-balance-route-stub">
              <h1>余额中心</h1>
            </section>
          }
        />
        <Route
          path={PROJECTS_ROUTE}
          element={
            <section data-testid="dashboard-projects-route-stub">
              <h1>项目市场</h1>
            </section>
          }
        />
        <Route
          path={ORDERS_ROUTE}
          element={
            <section data-testid="dashboard-orders-route-stub">
              <h1>订单中心</h1>
            </section>
          }
        />
        <Route
          path={API_KEYS_ROUTE}
          element={
            <section data-testid="dashboard-api-keys-route-stub">
              <h1>开发者 API 接入工作台</h1>
            </section>
          }
        />
        <Route
          path={WEBHOOKS_ROUTE}
          element={
            <section data-testid="dashboard-webhooks-route-stub">
              <h1>Webhook 设置</h1>
            </section>
          }
        />
        <Route
          path={DOCS_ROUTE}
          element={
            <section data-testid="dashboard-docs-route-stub">
              <h1>API 文档</h1>
            </section>
          }
        />
        <Route
          path={SETTINGS_ROUTE}
          element={
            <section data-testid="dashboard-settings-route-stub">
              <h1>设置中心</h1>
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

  it('renders a cross-console journey lane for budget, procurement, fulfillment, and integration', async () => {
    renderDashboard()

    expect(await screen.findByRole('heading', { name: '控制台总览' })).toBeInTheDocument()
    expect(screen.getByText('共享控制台入口')).toBeInTheDocument()
    const lane = screen.getByTestId('dashboard-next-steps-lane')
    const scoped = within(lane)
    expect(scoped.getByTestId('dashboard-next-step-balance')).toBeInTheDocument()
    expect(scoped.getByTestId('dashboard-next-step-projects')).toBeInTheDocument()
    expect(scoped.getByTestId('dashboard-next-step-orders')).toBeInTheDocument()
    expect(scoped.getByTestId('dashboard-next-step-api-keys')).toBeInTheDocument()
    expect(scoped.getByTestId('dashboard-next-step-action-balance')).toBeInTheDocument()
    expect(scoped.getByTestId('dashboard-next-step-action-projects')).toBeInTheDocument()
    expect(scoped.getByTestId('dashboard-next-step-action-orders')).toBeInTheDocument()
    expect(scoped.getByTestId('dashboard-next-step-action-api-keys')).toBeInTheDocument()
    expect(within(scoped.getByTestId('dashboard-next-step-api-keys')).getByRole('heading', { name: '最后完成 API 接入' })).toBeInTheDocument()
    expect(within(scoped.getByTestId('dashboard-next-step-api-keys')).getByRole('button', { name: '管理 API Keys' })).toBeInTheDocument()
  })

  it('navigates from the dashboard journey lane into balance, projects, orders, and api keys within the same console', async () => {
    const user = userEvent.setup()

    let view = renderDashboard()
    let lane = await screen.findByTestId('dashboard-next-steps-lane')
    await user.click(within(lane).getByRole('button', { name: '查看余额中心' }))
    expect(await screen.findByTestId('dashboard-balance-route-stub')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '余额中心' })).toBeInTheDocument()

    view.unmount()
    view = renderDashboard()
    lane = await screen.findByTestId('dashboard-next-steps-lane')
    await user.click(within(lane).getByRole('button', { name: '前往项目市场' }))
    expect(await screen.findByTestId('dashboard-projects-route-stub')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '项目市场' })).toBeInTheDocument()

    view.unmount()
    view = renderDashboard()
    lane = await screen.findByTestId('dashboard-next-steps-lane')
    await user.click(within(lane).getByRole('button', { name: '查看订单中心' }))
    expect(await screen.findByTestId('dashboard-orders-route-stub')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '订单中心' })).toBeInTheDocument()

    view.unmount()
    view = renderDashboard()
    lane = await screen.findByTestId('dashboard-next-steps-lane')
    await user.click(within(lane).getByRole('button', { name: '管理 API Keys' }))
    expect(await screen.findByTestId('dashboard-api-keys-route-stub')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()
    view.unmount()
  })

  it('hides unavailable journey cards when the server menu does not expose those shared routes', async () => {
    seedUserMenu([DASHBOARD_ROUTE, PROJECTS_ROUTE, SETTINGS_ROUTE])

    renderDashboard()

    expect(await screen.findByRole('heading', { name: '控制台总览' })).toBeInTheDocument()
    const lane = await screen.findByTestId('dashboard-next-steps-lane')
    expect(within(lane).queryByTestId('dashboard-next-step-balance')).not.toBeInTheDocument()
    expect(within(lane).getByTestId('dashboard-next-step-projects')).toBeInTheDocument()
    expect(within(lane).queryByTestId('dashboard-next-step-orders')).not.toBeInTheDocument()
    expect(within(lane).queryByTestId('dashboard-next-step-api-keys')).not.toBeInTheDocument()
    expect(within(lane).queryByTestId('dashboard-next-step-action-balance')).not.toBeInTheDocument()
    expect(within(lane).getByTestId('dashboard-next-step-action-projects')).toBeInTheDocument()
  })

  it('shows the dashboard integration lane using the shared API Keys route constant without leaking extra journey cards', async () => {
    const user = userEvent.setup()

    const view = renderDashboard()
    const lane = await screen.findByTestId('dashboard-next-steps-lane')
    const scoped = within(lane)
    const integrationCard = scoped.getByTestId('dashboard-next-step-api-keys')

    expect(integrationCard).toBeInTheDocument()
    expect(within(integrationCard).getByText('最后完成 API 接入')).toBeInTheDocument()
    expect(within(integrationCard).getByRole('button', { name: '管理 API Keys' })).toBeInTheDocument()
    expect(scoped.getByTestId('dashboard-next-step-action-api-keys')).toBeInTheDocument()
    expect(scoped.queryByTestId('dashboard-next-step-webhooks')).not.toBeInTheDocument()
    expect(scoped.queryByTestId('dashboard-next-step-docs')).not.toBeInTheDocument()

    await user.click(scoped.getByTestId('dashboard-next-step-action-api-keys'))
    expect(await screen.findByText('开发者 API 接入工作台')).toBeInTheDocument()
    view.unmount()
  })
})
