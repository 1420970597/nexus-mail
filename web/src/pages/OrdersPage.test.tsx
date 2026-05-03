import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { OrdersPage } from './OrdersPage'
import * as activationService from '../services/activation'
import { useAuthStore } from '../store/authStore'
import { API_KEYS_ROUTE, PROJECTS_ROUTE } from '../utils/consoleNavigation'

vi.mock('../services/activation', () => ({
  getActivationOrders: vi.fn(),
  getActivationResult: vi.fn(),
  finishActivationOrder: vi.fn(),
  cancelActivationOrder: vi.fn(),
}))

const mockedGetActivationOrders = vi.mocked(activationService.getActivationOrders)
const mockedGetActivationResult = vi.mocked(activationService.getActivationResult)
const mockedFinishActivationOrder = vi.mocked(activationService.finishActivationOrder)
const mockedCancelActivationOrder = vi.mocked(activationService.cancelActivationOrder)

describe('OrdersPage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 1, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'projects', label: '项目市场', path: '/projects' },
        { key: 'orders', label: '订单中心', path: '/orders' },
        { key: 'api-keys', label: 'API Keys', path: '/api-keys' },
      ],
    })
    mockedGetActivationOrders.mockResolvedValue({
      items: [
        {
          id: 1,
          order_no: 'ORD-1',
          project_key: 'discord',
          project_name: 'Discord',
          domain_name: 'mail.discord.example',
          email_address: 'bot@mail.discord.example',
          status: 'READY',
          quoted_price: 1200,
          final_price: 1200,
          extraction_type: 'code',
          extraction_value: '123456',
          created_at: '2026-04-29T00:00:00Z',
          updated_at: '2026-04-29T00:01:00Z',
          expires_at: '2026-04-29T00:05:00Z',
        },
      ],
    })
    mockedGetActivationResult.mockResolvedValue({
      result: {
        status: 'READY',
        extraction_type: 'code',
        extraction_value: '123456',
        is_terminal: false,
        expires_in_seconds: 120,
        next_poll_after_seconds: 15,
      },
    })
    mockedFinishActivationOrder.mockResolvedValue({
      order: {
        id: 1,
        order_no: 'ORD-1',
        project_key: 'discord',
        project_name: 'Discord',
        domain_name: 'mail.discord.example',
        email_address: 'bot@mail.discord.example',
        status: 'FINISHED',
        quoted_price: 1200,
        final_price: 1200,
        extraction_type: 'code',
        extraction_value: '123456',
        created_at: '2026-04-29T00:00:00Z',
        updated_at: '2026-04-29T00:01:30Z',
        expires_at: '2026-04-29T00:05:00Z',
      },
    })
    mockedCancelActivationOrder.mockResolvedValue({
      order: {
        id: 1,
        order_no: 'ORD-1',
        project_key: 'discord',
        project_name: 'Discord',
        domain_name: 'mail.discord.example',
        email_address: 'bot@mail.discord.example',
        status: 'CANCELED',
        quoted_price: 1200,
        final_price: 0,
        extraction_type: 'code',
        extraction_value: '123456',
        created_at: '2026-04-29T00:00:00Z',
        updated_at: '2026-04-29T00:01:30Z',
        expires_at: '2026-04-29T00:05:00Z',
      },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })
  })

  it('renders the fulfillment shared-console slice shell', async () => {
    render(
      <MemoryRouter>
        <OrdersPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('共享控制台履约切片')).toBeInTheDocument()
    expect(screen.getByText('订单中心')).toBeInTheDocument()
    expect(screen.getByText('把首轮采购后的邮箱分配、提取结果、履约终态与接入回放统一收敛在同一套深色共享控制台内。')).toBeInTheDocument()
    expect(screen.getByText('履约路径信号')).toBeInTheDocument()
  })

  it('renders the unified order workbench with real-order messaging', async () => {
    render(
      <MemoryRouter>
        <OrdersPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('共享控制台履约切片')).toBeInTheDocument()
    expect(screen.getByText('待收信')).toBeInTheDocument()
    expect(screen.getByText('READY / FINISHED / TIMEOUT 全部来自真实 API 返回')).toBeInTheDocument()
  })

  it('shows shared-console next actions when the order list is empty', async () => {
    const user = userEvent.setup()
    mockedGetActivationOrders.mockResolvedValueOnce({ items: [] })

    render(
      <MemoryRouter initialEntries={['/orders']}>
        <Routes>
          <Route path="/orders" element={<OrdersPage />} />
          <Route path={PROJECTS_ROUTE} element={<div>项目市场页面</div>} />
          <Route path={API_KEYS_ROUTE} element={<div>API Keys 页面</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('当前暂无订单，可先前往项目市场下单。')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '前往项目市场' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: '查看 API 接入准备' }).length).toBeGreaterThan(0)

    await user.click(screen.getAllByRole('button', { name: '查看 API 接入准备' })[0])
    expect(await screen.findByText('API Keys 页面')).toBeInTheDocument()
  })

  it('opens result modal for an existing order', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <OrdersPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('ORD-1')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '查看结果' }))

    expect(await screen.findByText('订单结果 · ORD-1')).toBeInTheDocument()
    expect(screen.getAllByText('123456').length).toBeGreaterThan(0)
  })

  it('renders the first-run order journey card so users know what to do after purchasing', async () => {
    render(
      <MemoryRouter>
        <OrdersPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('订单中心')).toBeInTheDocument()
    expect(screen.getByText('履约说明')).toBeInTheDocument()
    expect(screen.getByText('READY 后完成订单')).toBeInTheDocument()
    expect(screen.getByText('异常时看结果面板')).toBeInTheDocument()
    expect(screen.getByText('订单为空时的下一步')).toBeInTheDocument()
    expect(screen.getByText('接入联调仍在同一控制台继续：可直接回到 API Keys 校验自动化调用')).toBeInTheDocument()
  })

  it('navigates from the empty-state api continuation CTA into the api keys workspace', async () => {
    const user = userEvent.setup()
    mockedGetActivationOrders.mockResolvedValueOnce({ items: [] })

    render(
      <MemoryRouter initialEntries={['/orders']}>
        <Routes>
          <Route path="/orders" element={<OrdersPage />} />
          <Route path={API_KEYS_ROUTE} element={<div>开发者 API 接入工作台</div>} />
          <Route path={PROJECTS_ROUTE} element={<div>项目市场页面</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('当前暂无订单，可先前往项目市场下单。')).toBeInTheDocument()
    const continuationButtons = screen.getAllByRole('button', { name: '查看 API 接入准备' })
    expect(continuationButtons.length).toBeGreaterThan(0)
    await user.click(continuationButtons[0])
    expect(await screen.findByText('开发者 API 接入工作台')).toBeInTheDocument()
  })

  it('hides the API continuation CTA when the server menu does not expose API key management', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 1, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'projects', label: '项目市场', path: '/projects' },
        { key: 'orders', label: '订单中心', path: '/orders' },
      ],
    })

    render(
      <MemoryRouter>
        <OrdersPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('共享控制台履约切片')).toBeInTheDocument()
    expect(screen.queryByText('接入联调仍在同一控制台继续：可直接回到 API Keys 校验自动化调用')).not.toBeInTheDocument()
  })

  it('renders a mission-control continuation lane from orders into API integration and procurement replay', async () => {
    render(
      <MemoryRouter>
        <OrdersPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('首轮履约与接入衔接')).toBeInTheDocument()
    const lane = screen.getByTestId('orders-continuation-lane')
    const scoped = within(lane)
    expect(scoped.getByText('订单结果 → API 接入 → 再次采购')).toBeInTheDocument()
    expect(scoped.getByText('先确认邮箱与提取结果，再继续程序化接入。')).toBeInTheDocument()
    expect(scoped.getByRole('button', { name: /回到项目市场/ })).toBeInTheDocument()
    expect(scoped.getByRole('button', { name: /打开 API Keys/ })).toBeInTheDocument()
  })

  it('navigates from the continuation lane back to the procurement market inside the shared console', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/orders']}>
        <Routes>
          <Route path="/orders" element={<OrdersPage />} />
          <Route path={PROJECTS_ROUTE} element={<div>项目市场页面</div>} />
          <Route path={API_KEYS_ROUTE} element={<div>开发者 API 接入工作台</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('首轮履约与接入衔接')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /回到项目市场/ }))
    expect(await screen.findByText('项目市场页面')).toBeInTheDocument()
  })

  it('shows a return-to-recommended-workspace CTA in the empty state when only the shared dashboard remains available', async () => {
    const user = userEvent.setup()
    mockedGetActivationOrders.mockResolvedValueOnce({ items: [] })
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 1, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'orders', label: '订单中心', path: '/orders' },
      ],
    })

    render(
      <MemoryRouter initialEntries={['/orders']}>
        <Routes>
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/" element={<div>控制台总览页面</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('当前暂无订单，可先前往项目市场下单。')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '返回推荐工作台' }))
    expect(await screen.findByText('控制台总览页面')).toBeInTheDocument()
  })
})
