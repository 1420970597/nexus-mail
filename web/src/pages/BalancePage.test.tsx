import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { BalancePage } from './BalancePage'
import * as financeService from '../services/finance'
import { useAuthStore } from '../store/authStore'
import { API_KEYS_ROUTE, BALANCE_ROUTE, DOCS_ROUTE, ORDERS_ROUTE, PROJECTS_ROUTE, WEBHOOKS_ROUTE } from '../utils/consoleNavigation'

vi.mock('../services/finance', () => ({
  getWalletOverview: vi.fn(),
  getWalletTransactions: vi.fn(),
  topupWallet: vi.fn(),
  createUserOrderDispute: vi.fn(),
}))

const mockedGetWalletOverview = vi.mocked(financeService.getWalletOverview)
const mockedGetWalletTransactions = vi.mocked(financeService.getWalletTransactions)
const mockedTopupWallet = vi.mocked(financeService.topupWallet)
const mockedCreateUserOrderDispute = vi.mocked(financeService.createUserOrderDispute)

function seedRole(role: 'user' | 'supplier' | 'admin' = 'user') {
  useAuthStore.setState({
    token: 'token',
    refreshToken: 'refresh-token',
    user: { id: 7, email: `${role}@nexus-mail.local`, role },
    menu: [],
  })
}

function seedMenu(paths: string[]) {
  const labelByPath: Record<string, string> = {
    '/': '仪表盘',
    [BALANCE_ROUTE]: '余额中心',
    [PROJECTS_ROUTE]: '项目市场',
    [ORDERS_ROUTE]: '订单中心',
    [API_KEYS_ROUTE]: 'API Keys',
    [WEBHOOKS_ROUTE]: 'Webhook 设置',
    [DOCS_ROUTE]: 'API 文档',
  }
  useAuthStore.setState((state) => ({
    ...state,
    menu: paths.map((path) => ({
      key: path,
      label: labelByPath[path] ?? path,
      path,
    })),
  }))
}

function renderBalancePage(initialEntry = '/balance') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/balance" element={<BalancePage />} />
        <Route path={PROJECTS_ROUTE} element={<div>项目市场页面</div>} />
        <Route path={ORDERS_ROUTE} element={<div>订单中心页面</div>} />
        <Route path={API_KEYS_ROUTE} element={<div>API Keys 页面</div>} />
        <Route path={WEBHOOKS_ROUTE} element={<div>Webhook 设置页面</div>} />
        <Route path={DOCS_ROUTE} element={<div>API 文档页面</div>} />
        <Route path="/" element={<div>共享控制台首页</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

function FallbackRouteProbe() {
  const { menu, user } = useAuthStore()
  const currentPaths = menu.map((item) => item.path).join(',')
  return <div>{`fallback-probe:${user?.role ?? 'none'}:${currentPaths}`}</div>
}

describe('BalancePage', () => {
  beforeEach(() => {
    seedRole('user')
    seedMenu(['/', BALANCE_ROUTE, PROJECTS_ROUTE, ORDERS_ROUTE, API_KEYS_ROUTE, WEBHOOKS_ROUTE, DOCS_ROUTE])
    mockedGetWalletOverview.mockResolvedValue({
      wallet: {
        user_id: 7,
        email: 'user@nexus-mail.local',
        available_balance: 12500,
        frozen_balance: 3200,
        pending_settlement: 1800,
      },
    } as any)
    mockedGetWalletTransactions.mockResolvedValue({
      items: [
        {
          id: 1,
          type: 'topup',
          direction: 'credit',
          balance_type: 'available',
          amount: 1200,
          order_id: 0,
          note: 'manual topup',
        },
      ],
    } as any)
    mockedTopupWallet.mockResolvedValue({} as any)
    mockedCreateUserOrderDispute.mockResolvedValue({
      dispute: {
        id: 9,
        order_id: 123,
        status: 'open',
        reason: '验证码错误',
      },
    } as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })
  })

  it('renders finance mission control with shared-console integration cards for regular users', async () => {
    renderBalancePage()

    expect(await screen.findByText('Finance Mission Control')).toBeInTheDocument()
    expect(screen.getByText('资金任务流')).toBeInTheDocument()
    expect(screen.getByText('控制台能力矩阵')).toBeInTheDocument()
    expect(screen.getByText('先确认采购预算与库存')).toBeInTheDocument()
    expect(screen.getByText('再追踪冻结与退款链路')).toBeInTheDocument()
    expect(screen.getByText('最后串联接入与回调')).toBeInTheDocument()
    expect(screen.getByText('角色差异仍共用单壳')).toBeInTheDocument()
    expect(screen.getByText('资金观察与售后同层')).toBeInTheDocument()
    expect(screen.getByText('普通用户先完成预算确认，再串联订单、争议与接入路径')).toBeInTheDocument()
    expect(screen.getByText('本次会话新提交的争议')).toBeInTheDocument()
  })

  it('navigates through the finance mission cards and shared-console bridge CTAs', async () => {
    const user = userEvent.setup()

    let view = renderBalancePage()

    expect(await screen.findByText('Finance Mission Control')).toBeInTheDocument()

    await user.click(screen.getByText('前往项目市场'))
    expect(await screen.findByText('项目市场页面')).toBeInTheDocument()

    view.unmount()
    view = renderBalancePage()
    expect(await screen.findByText('Finance Mission Control')).toBeInTheDocument()

    const missionCardsSection = screen.getByTestId('balance-mission-cards')
    const ordersMissionCard = within(missionCardsSection).getByTestId('balance-orders-mission-card')
    expect(ordersMissionCard).not.toBeNull()
    await user.click(within(ordersMissionCard as HTMLElement).getByRole('button', { name: /查看订单中心/ }))
    expect(await screen.findByText('订单中心页面')).toBeInTheDocument()

    view.unmount()
    view = renderBalancePage()
    expect(await screen.findByText('Finance Mission Control')).toBeInTheDocument()

    await user.click(screen.getByText('打开 API Keys'))
    expect(await screen.findByText('API Keys 页面')).toBeInTheDocument()

    view.unmount()
    view = renderBalancePage()
    expect(await screen.findByText('Finance Mission Control')).toBeInTheDocument()

    await user.click(screen.getByText('打开 Webhook 设置'))
    expect(await screen.findByText('Webhook 设置页面')).toBeInTheDocument()

    view.unmount()
    view = renderBalancePage()
    expect(await screen.findByText('Finance Mission Control')).toBeInTheDocument()

    await user.click(screen.getByText('打开 API 文档'))
    expect(await screen.findByText('API 文档页面')).toBeInTheDocument()
  })

  it('suppresses unavailable finance CTA targets and returns to the preferred workspace', async () => {
    seedMenu(['/', BALANCE_ROUTE])

    render(
      <MemoryRouter initialEntries={[BALANCE_ROUTE]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path={BALANCE_ROUTE} element={<BalancePage />} />
          <Route path="/" element={<div>共享控制台首页</div>} />
          <Route path="*" element={<FallbackRouteProbe />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Finance Mission Control')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '前往项目市场' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '查看订单中心' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '打开 API Keys' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '打开 Webhook 设置' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '打开 API 文档' })).not.toBeInTheDocument()
    expect(screen.getByText('当前资金页已是唯一可见业务工作台')).toBeInTheDocument()
  })

  it('hides the fallback when balance page is already the only visible workspace', async () => {
    seedMenu([BALANCE_ROUTE])

    renderBalancePage()

    expect(await screen.findByText('Finance Mission Control')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '返回推荐工作台' })).not.toBeInTheDocument()
  })

  it('supports topup and dispute submission flows', async () => {
    const user = userEvent.setup()

    renderBalancePage()

    expect(await screen.findByText('钱包流水')).toBeInTheDocument()

    await user.type(screen.getByLabelText('金额（分）'), '2000')
    await user.type(screen.getByLabelText('备注'), 'online')
    await user.click(screen.getByRole('button', { name: '确认充值' }))
    await waitFor(() => expect(mockedTopupWallet).toHaveBeenCalledWith(2000, 'online'))

    await user.type(screen.getByLabelText('订单 ID'), '123')
    await user.type(screen.getByLabelText('争议原因'), '验证码错误')
    await user.click(screen.getByRole('button', { name: '提交争议' }))
    await waitFor(() => expect(mockedCreateUserOrderDispute).toHaveBeenCalledWith(123, '验证码错误'))
    expect(await screen.findByText('验证码错误')).toBeInTheDocument()
  })

  it('shows supplier-facing single-shell guidance when supplier role is active', async () => {
    seedRole('supplier')
    seedMenu(['/', BALANCE_ROUTE, PROJECTS_ROUTE, ORDERS_ROUTE, API_KEYS_ROUTE, WEBHOOKS_ROUTE, DOCS_ROUTE])

    renderBalancePage()

    expect(await screen.findByText('Finance Mission Control')).toBeInTheDocument()
    expect(screen.getByText('供应商仍通过同一套共享控制台观察供货结算与争议结果')).toBeInTheDocument()
  })

  it('shows admin-facing shared-console operations guidance when admin role is active', async () => {
    seedRole('admin')
    seedMenu(['/', BALANCE_ROUTE, PROJECTS_ROUTE, ORDERS_ROUTE, API_KEYS_ROUTE, WEBHOOKS_ROUTE, DOCS_ROUTE])

    renderBalancePage()

    expect(await screen.findByText('Finance Mission Control')).toBeInTheDocument()
    expect(screen.getByText('管理员可在共享控制台的运营链路继续跟进调账、结算与争议处理')).toBeInTheDocument()
  })
})
