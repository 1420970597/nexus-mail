import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AdminUsersPage } from './AdminUsersPage'
import * as financeService from '../services/finance'
import { useAuthStore } from '../store/authStore'
import { ADMIN_AUDIT_ROUTE, ADMIN_RISK_ROUTE, API_KEYS_ROUTE, ADMIN_USERS_ROUTE, DASHBOARD_ROUTE } from '../utils/consoleNavigation'

vi.mock('../services/finance', async () => {
  const actual = await vi.importActual<typeof import('../services/finance')>('../services/finance')
  return {
    ...actual,
    getAdminWalletUsers: vi.fn(),
    getAdminDisputes: vi.fn(),
    adminAdjustWallet: vi.fn(),
    settleSupplierPending: vi.fn(),
    resolveAdminDispute: vi.fn(),
  }
})

const mockedGetAdminWalletUsers = vi.mocked(financeService.getAdminWalletUsers)
const mockedGetAdminDisputes = vi.mocked(financeService.getAdminDisputes)
const mockedAdminAdjustWallet = vi.mocked(financeService.adminAdjustWallet)
const mockedSettleSupplierPending = vi.mocked(financeService.settleSupplierPending)
const mockedResolveAdminDispute = vi.mocked(financeService.resolveAdminDispute)

function renderAdminUsersPage(initialEntry = ADMIN_USERS_ROUTE) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path={ADMIN_USERS_ROUTE} element={<AdminUsersPage />} />
        <Route path={ADMIN_RISK_ROUTE} element={<div>风控中心页面</div>} />
        <Route path={ADMIN_AUDIT_ROUTE} element={<div>审计日志页面</div>} />
        <Route path={API_KEYS_ROUTE} element={<div>API Keys 页面</div>} />
        <Route path={DASHBOARD_ROUTE} element={<div>共享控制台首页</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminUsersPage shared-console admin workbench', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 1, email: 'admin@nexus-mail.local', role: 'admin' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: DASHBOARD_ROUTE },
        { key: 'admin-users', label: '用户管理', path: ADMIN_USERS_ROUTE },
        { key: 'admin-risk', label: '风控中心', path: ADMIN_RISK_ROUTE },
        { key: 'admin-audit', label: '审计日志', path: ADMIN_AUDIT_ROUTE },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
        { key: 'webhooks', label: 'Webhook 设置', path: '/webhooks' },
        { key: 'docs', label: 'API 文档', path: '/docs' },
      ],
    })
    mockedGetAdminWalletUsers.mockResolvedValue({
      items: [
        {
          user_id: 10,
          email: 'user@example.com',
          available_balance: 12000,
          frozen_balance: 2000,
          pending_settlement: 4000,
        },
      ],
    } as any)
    mockedGetAdminDisputes.mockResolvedValue({
      items: [
        {
          id: 8,
          order_id: 101,
          user_id: 10,
          supplier_id: 22,
          project_key: 'discord',
          status: 'open',
          reason: '超时',
          resolution_type: '',
          refund_amount: 0,
        },
      ],
    } as any)
    mockedAdminAdjustWallet.mockResolvedValue({} as any)
    mockedSettleSupplierPending.mockResolvedValue({ payout: { settled_amount: 5600, entry_count: 2 } } as any)
    mockedResolveAdminDispute.mockResolvedValue({} as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })
  })

  it('renders admin finance mission-control shell with metrics and shared-console guidance', async () => {
    renderAdminUsersPage()

    expect(await screen.findByText('Admin Finance Mission Control')).toBeInTheDocument()
    expect(screen.getByText('用户管理')).toBeInTheDocument()
    expect(screen.getByText('钱包调整面')).toBeInTheDocument()
    expect(screen.getAllByText('待结算总额').length).toBeGreaterThan(0)
    expect(screen.getAllByText('开放争议').length).toBeGreaterThan(0)
    expect(screen.getByText('共享控制台联动')).toBeInTheDocument()
    expect(screen.getByText('管理员主任务流')).toBeInTheDocument()
    expect(screen.getAllByText('共享接入桥接').length).toBeGreaterThan(0)
    expect(screen.getByText('API Keys · /api-keys')).toBeInTheDocument()
    expect(screen.getByText('Webhook 设置 · /webhooks')).toBeInTheDocument()
    expect(screen.getByText('API 文档 · /docs')).toBeInTheDocument()
  })

  it('navigates from mission-control actions to risk, audit, and api key pages', async () => {
    const user = userEvent.setup()
    renderAdminUsersPage()

    expect(await screen.findByText('Admin Finance Mission Control')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '查看风控中心' }))
    expect(await screen.findByText('风控中心页面')).toBeInTheDocument()

    renderAdminUsersPage()
    expect(await screen.findByText('Admin Finance Mission Control')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '查看审计日志' }))
    expect(await screen.findByText('审计日志页面')).toBeInTheDocument()

    renderAdminUsersPage()
    expect(await screen.findByText('Admin Finance Mission Control')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '打开 API Keys' }))
    expect(await screen.findByText('API Keys 页面')).toBeInTheDocument()
  })

  it('submits wallet adjustment, settlement and dispute resolution flows', async () => {
    const user = userEvent.setup()

    renderAdminUsersPage()

    expect(await screen.findByText('用户管理')).toBeInTheDocument()

    await user.type(screen.getAllByLabelText('用户 ID')[0], '10')
    await user.type(screen.getByLabelText('金额（分）'), '500')
    await user.type(screen.getAllByLabelText('原因')[0], 'manual bonus')
    await user.type(screen.getByPlaceholderText('请输入：确认调账'), '确认调账')
    await user.click(screen.getByRole('button', { name: '执行调账' }))
    await waitFor(() => expect(mockedAdminAdjustWallet).toHaveBeenCalledWith(10, 500, 'manual bonus', '确认调账'))

    await user.type(screen.getByLabelText('供应商用户 ID'), '22')
    await user.type(screen.getByPlaceholderText('例如：月度结算'), 'monthly payout')
    await user.type(screen.getByPlaceholderText('请输入：确认结算'), '确认结算')
    await user.click(within(screen.getByTestId('admin-users-settlement-card')).getByRole('button', { name: '确认结算' }))
    await waitFor(() => expect(mockedSettleSupplierPending).toHaveBeenCalledWith(22, 'monthly payout', '确认结算'))

    await user.type(screen.getByLabelText('争议单 ID'), '8')
    await user.click(screen.getByRole('button', { name: '处理争议单' }))
    await waitFor(() => expect(mockedResolveAdminDispute).toHaveBeenCalled())
  })

  it('suppresses unavailable shared-console CTAs and falls back to dashboard when only the finance page remains', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 2, email: 'admin@nexus-mail.local', role: 'admin' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: DASHBOARD_ROUTE },
        { key: 'admin-users', label: '用户管理', path: ADMIN_USERS_ROUTE },
      ],
    })

    renderAdminUsersPage()

    expect(await screen.findByText('Admin Finance Mission Control')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '查看风控中心' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '查看审计日志' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '打开 API Keys' })).not.toBeInTheDocument()
    expect(screen.queryByText('API Keys · /api-keys')).not.toBeInTheDocument()
    expect(screen.queryByText('Webhook 设置 · /webhooks')).not.toBeInTheDocument()
    expect(screen.queryByText('API 文档 · /docs')).not.toBeInTheDocument()
    expect(screen.getByTestId('admin-users-shared-console-fallback')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '返回推荐工作台' }))
    expect(await screen.findByText('共享控制台首页')).toBeInTheDocument()
  })
})
