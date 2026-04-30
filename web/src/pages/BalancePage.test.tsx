import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { BalancePage } from './BalancePage'
import * as financeService from '../services/finance'
import { useAuthStore } from '../store/authStore'
import { API_KEYS_ROUTE, DOCS_ROUTE, ORDERS_ROUTE, PROJECTS_ROUTE, WEBHOOKS_ROUTE } from '../utils/consoleNavigation'

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
      </Routes>
    </MemoryRouter>,
  )
}

describe('BalancePage', () => {
  beforeEach(() => {
    seedRole('user')
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

    renderBalancePage()

    expect(await screen.findByText('Finance Mission Control')).toBeInTheDocument()
    expect(screen.getByText('供应商仍通过同一套共享控制台观察供货结算与争议结果')).toBeInTheDocument()
  })

  it('shows admin-facing shared-console operations guidance when admin role is active', async () => {
    seedRole('admin')

    renderBalancePage()

    expect(await screen.findByText('Finance Mission Control')).toBeInTheDocument()
    expect(screen.getByText('管理员可在共享控制台的运营链路继续跟进调账、结算与争议处理')).toBeInTheDocument()
  })
})
