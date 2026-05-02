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
        <Route path={BALANCE_ROUTE} element={<div>余额中心页面</div>} />
        <Route path={PROJECTS_ROUTE} element={<div>项目市场页面</div>} />
        <Route path={ORDERS_ROUTE} element={<div>订单中心页面</div>} />
        <Route path={API_KEYS_ROUTE} element={<div>开发者 API 接入工作台</div>} />
        <Route path={WEBHOOKS_ROUTE} element={<div>Webhook 设置页面</div>} />
        <Route path={DOCS_ROUTE} element={<div>API 文档页面</div>} />
        <Route path={SETTINGS_ROUTE} element={<div>设置中心页面</div>} />
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

    expect(await screen.findByText('控制台总览')).toBeInTheDocument()
    const lane = screen.getByText('推荐下一步').closest('.semi-card')
    expect(lane).not.toBeNull()
    const scoped = within(lane as HTMLElement)
    expect(scoped.getByText('先确认预算与钱包状态')).toBeInTheDocument()
    expect(scoped.getByText('再进入项目市场采购')).toBeInTheDocument()
    expect(scoped.getByText('随后追踪订单履约')).toBeInTheDocument()
    expect(scoped.getByText('最后完成 API 接入')).toBeInTheDocument()
    expect(scoped.getByText('采购 → 订单 → 接入 的首轮路径，会与余额中心保持同一套推荐顺序。')).toBeInTheDocument()
    expect(scoped.getByRole('button', { name: '查看余额中心' })).toBeInTheDocument()
    expect(scoped.getByRole('button', { name: '前往项目市场' })).toBeInTheDocument()
    expect(scoped.getByRole('button', { name: '查看订单中心' })).toBeInTheDocument()
    expect(scoped.getByRole('button', { name: '管理 API Keys' })).toBeInTheDocument()
  })

  it('navigates from the dashboard journey lane into balance, projects, orders, and api keys within the same console', async () => {
    const user = userEvent.setup()

    let view = renderDashboard()
    let lane = await screen.findByText('推荐下一步')
    await user.click(within(lane.closest('.semi-card') as HTMLElement).getByRole('button', { name: '查看余额中心' }))
    expect(await screen.findByText('余额中心页面')).toBeInTheDocument()

    view.unmount()
    view = renderDashboard()
    lane = await screen.findByText('推荐下一步')
    await user.click(within(lane.closest('.semi-card') as HTMLElement).getByRole('button', { name: '前往项目市场' }))
    expect(await screen.findByText('项目市场页面')).toBeInTheDocument()

    view.unmount()
    view = renderDashboard()
    lane = await screen.findByText('推荐下一步')
    await user.click(within(lane.closest('.semi-card') as HTMLElement).getByRole('button', { name: '查看订单中心' }))
    expect(await screen.findByText('订单中心页面')).toBeInTheDocument()

    view.unmount()
    view = renderDashboard()
    lane = await screen.findByText('推荐下一步')
    await user.click(within(lane.closest('.semi-card') as HTMLElement).getByRole('button', { name: '管理 API Keys' }))
    expect(await screen.findByText('开发者 API 接入工作台')).toBeInTheDocument()
  })

  it('hides unavailable journey cards when the server menu does not expose those shared routes', async () => {
    seedUserMenu([DASHBOARD_ROUTE, PROJECTS_ROUTE, SETTINGS_ROUTE])

    renderDashboard()

    expect(await screen.findByText('控制台总览')).toBeInTheDocument()
    const lane = screen.getByText('推荐下一步').closest('.semi-card')
    expect(lane).not.toBeNull()
    const scoped = within(lane as HTMLElement)
    expect(scoped.queryByText('先确认预算与钱包状态')).not.toBeInTheDocument()
    expect(scoped.getByText('再进入项目市场采购')).toBeInTheDocument()
    expect(scoped.queryByText('随后追踪订单履约')).not.toBeInTheDocument()
    expect(scoped.queryByText('最后完成 API 接入')).not.toBeInTheDocument()
    expect(scoped.queryByRole('button', { name: '查看余额中心' })).not.toBeInTheDocument()
    expect(scoped.getByRole('button', { name: '前往项目市场' })).toBeInTheDocument()
  })

  it('links the dashboard integration lane to api keys, webhooks, and docs with shared route constants', async () => {
    const user = userEvent.setup()

    const view = renderDashboard()
    const lane = await screen.findByText('推荐下一步')
    const scoped = within(lane.closest('.semi-card') as HTMLElement)

    expect(scoped.getByText('最后完成 API 接入')).toBeInTheDocument()
    expect(scoped.getByText('继续进入 API Keys、Webhook 与文档，完成程序化调用、回调联调与真实接口验证准备。')).toBeInTheDocument()
    expect(scoped.getByRole('button', { name: '管理 API Keys' })).toBeInTheDocument()

    await user.click(scoped.getByRole('button', { name: '管理 API Keys' }))
    expect(await screen.findByText('开发者 API 接入工作台')).toBeInTheDocument()
    view.unmount()
  })
})
