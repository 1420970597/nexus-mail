import { render, screen, waitFor, within } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AdminUsersPage, buildDisputeResolutionPayload } from './AdminUsersPage'
import * as financeService from '../services/finance'
import { ADMIN_AUDIT_ROUTE, ADMIN_RISK_ROUTE, ADMIN_USERS_ROUTE, API_KEYS_ROUTE, DOCS_ROUTE, WEBHOOKS_ROUTE } from '../utils/consoleNavigation'
import { useAuthStore } from '../store/authStore'

vi.mock('../services/finance', () => ({
  adminAdjustWallet: vi.fn(),
  getAdminWalletUsers: vi.fn(),
  getAdminDisputes: vi.fn(),
  resolveAdminDispute: vi.fn(),
  settleSupplierPending: vi.fn(),
}))

const mockedGetAdminWalletUsers = vi.mocked(financeService.getAdminWalletUsers)
const mockedGetAdminDisputes = vi.mocked(financeService.getAdminDisputes)
const mockedResolveAdminDispute = vi.mocked(financeService.resolveAdminDispute)
const mockedAdminAdjustWallet = vi.mocked(financeService.adminAdjustWallet)
const mockedSettleSupplierPending = vi.mocked(financeService.settleSupplierPending)

function seedAdminMenu(includeSharedBridge = true) {
  useAuthStore.setState({
    token: 'admin-token',
    refreshToken: 'admin-refresh-token',
    user: { id: 1, email: 'admin@nexus-mail.local', role: 'admin' },
    menu: includeSharedBridge
      ? [
          { key: 'dashboard', label: '仪表盘', path: '/' },
          { key: 'admin-users', label: '用户管理', path: ADMIN_USERS_ROUTE },
          { key: 'admin-risk', label: '风控中心', path: ADMIN_RISK_ROUTE },
          { key: 'admin-audit', label: '审计日志', path: ADMIN_AUDIT_ROUTE },
          { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
          { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
          { key: 'docs', label: 'API 文档', path: DOCS_ROUTE },
        ]
      : [
          { key: 'dashboard', label: '仪表盘', path: '/' },
          { key: 'admin-users', label: '用户管理', path: ADMIN_USERS_ROUTE },
        ],
  })
}

function renderAdminUsersPage(initialEntry = ADMIN_USERS_ROUTE) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path={ADMIN_USERS_ROUTE} element={<AdminUsersPage />} />
        <Route
          path={ADMIN_RISK_ROUTE}
          element={(
            <section role="region" aria-label="共享控制台 - 风控中心">
              <h1>风控中心</h1>
            </section>
          )}
        />
        <Route
          path={ADMIN_AUDIT_ROUTE}
          element={(
            <section role="region" aria-label="共享控制台 - 审计日志">
              <h1>审计日志</h1>
            </section>
          )}
        />
        <Route
          path={API_KEYS_ROUTE}
          element={(
            <section role="region" aria-label="共享控制台 - API Keys">
              <h1>开发者 API 接入工作台</h1>
            </section>
          )}
        />
        <Route
          path={WEBHOOKS_ROUTE}
          element={(
            <section role="region" aria-label="共享控制台 - Webhooks">
              <h1>Webhook 运维与回调观测</h1>
            </section>
          )}
        />
        <Route
          path={DOCS_ROUTE}
          element={(
            <section role="region" aria-label="共享控制台 - API 文档">
              <h1>API 文档与接入控制台</h1>
            </section>
          )}
        />
        <Route
          path="/"
          element={(
            <section role="region" aria-label="共享控制台首页">
              <h1>控制台总览</h1>
            </section>
          )}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminUsersPage dispute handling', () => {
  beforeEach(() => {
    seedAdminMenu()
    mockedGetAdminWalletUsers.mockResolvedValue({
      items: [
        {
          user_id: 2,
          email: 'user@nexus-mail.local',
          available_balance: 1000,
          frozen_balance: 0,
          pending_settlement: 0,
          updated_at: '2026-04-28T00:00:00Z',
        },
      ],
    })
    mockedGetAdminDisputes.mockResolvedValue({
      items: [
        {
          id: 8,
          order_id: 10,
          project_key: 'discord',
          supplier_id: 7,
          user_id: 2,
          status: 'open',
          reason: '验证码错误',
          resolution_type: '',
          resolution_note: '',
          refund_amount: 0,
          created_at: '2026-04-28T00:00:00Z',
          updated_at: '2026-04-28T00:00:00Z',
        },
      ],
    })
    mockedResolveAdminDispute.mockResolvedValue({
      dispute: {
        id: 8,
        order_id: 10,
        project_key: 'discord',
        supplier_id: 7,
        user_id: 2,
        status: 'resolved',
        reason: '验证码错误',
        resolution_type: 'refund',
        resolution_note: '确认退款',
        refund_amount: 200,
        created_at: '2026-04-28T00:00:00Z',
        updated_at: '2026-04-28T00:00:00Z',
        resolved_at: '2026-04-28T00:01:00Z',
      },
    })
    mockedAdminAdjustWallet.mockResolvedValue({
      wallet: {
        user_id: 2,
        email: 'user@nexus-mail.local',
        available_balance: 1200,
        frozen_balance: 0,
        updated_at: '2026-04-28T00:00:00Z',
      },
    })
    mockedSettleSupplierPending.mockResolvedValue({
      payout: {
        supplier_id: 7,
        settled_amount: 1000,
        pending_balance: 0,
        settled_balance: 1000,
        entry_count: 1,
        reason: '月度结算',
        settled_at: '2026-04-28T00:00:00Z',
      },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })
  })

  it('renders named admin mission-control regions and bridge destinations inside the shared console shell', async () => {
    renderAdminUsersPage()

    const heroCard = await screen.findByTestId('admin-users-hero-card')
    expect(within(heroCard).getByRole('heading', { name: '用户管理' })).toBeInTheDocument()
    expect(within(heroCard).getByText('用户运营中枢')).toBeInTheDocument()

    const missionRegion = await screen.findByRole('heading', { name: '管理员主任务流' }).then((heading) => heading.closest('.semi-card') as HTMLElement)
    expect(within(missionRegion).getByRole('heading', { name: '管理员主任务流' })).toBeInTheDocument()
    expect(within(missionRegion).getByRole('button', { name: '查看风控中心' })).toBeInTheDocument()
    expect(within(missionRegion).getByRole('button', { name: '查看审计日志' })).toBeInTheDocument()
    expect(within(missionRegion).getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()

    const bridgeRegion = screen.getByRole('region', { name: '共享接入桥接' })
    expect(within(bridgeRegion).getByRole('heading', { name: '共享接入桥接' })).toBeInTheDocument()
    const capabilityMatrix = within(bridgeRegion).getByRole('region', { name: '控制台能力矩阵' })
    expect(within(capabilityMatrix).getByText('统一运营入口')).toBeInTheDocument()
    expect(within(capabilityMatrix).getByText('共享接入桥接')).toBeInTheDocument()
    expect(within(capabilityMatrix).getByText('管理员菜单扩展')).toBeInTheDocument()
  })

  it('navigates from named admin mission-control regions into shared-console destinations', async () => {
    renderAdminUsersPage()

    const missionRegion = await screen.findByRole('heading', { name: '管理员主任务流' }).then((heading) => heading.closest('.semi-card') as HTMLElement)
    fireEvent.click(within(missionRegion).getByRole('button', { name: '查看风控中心' }))
    const riskRegion = await screen.findByRole('region', { name: '共享控制台 - 风控中心' })
    expect(within(riskRegion).getByRole('heading', { name: '风控中心' })).toBeInTheDocument()
  })

  it('shows named shared-console fallback when bridge routes are hidden by menu truth', async () => {
    seedAdminMenu(false)
    renderAdminUsersPage()

    const fallbackHeading = await screen.findByRole('heading', { name: '回到共享工作台继续管理员主链路' })
    const fallbackRegion = fallbackHeading.closest('.semi-card') as HTMLElement
    expect(fallbackRegion).toBeTruthy()
    expect(within(fallbackRegion).getByRole('heading', { name: '回到共享工作台继续管理员主链路' })).toBeInTheDocument()
    expect(within(fallbackRegion).getByRole('button', { name: '返回共享工作台' })).toBeInTheDocument()
    const bridgeRegion = screen.getByRole('region', { name: '共享接入桥接' })
    expect(within(bridgeRegion).queryByRole('button', { name: /打开 API Keys/ })).not.toBeInTheDocument()
    expect(within(bridgeRegion).queryByRole('button', { name: /打开 Webhook/ })).not.toBeInTheDocument()
    expect(within(bridgeRegion).queryByRole('button', { name: /打开 API 文档/ })).not.toBeInTheDocument()
  })

  it('uses select controls for dispute resolution and submits explicit refund contract', async () => {
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: '用户管理' })).toBeInTheDocument()
    const heroCard = screen.getByTestId('admin-users-hero-card')
    expect(within(heroCard).getByText('用户运营中枢')).toBeInTheDocument()
    expect(await screen.findByText('验证码错误')).toBeInTheDocument()
    const disputeCard = screen.getByTestId('admin-users-dispute-resolution-card')

    fireEvent.change(within(disputeCard).getByLabelText('争议单 ID'), { target: { value: '8' } })
    fireEvent.change(within(disputeCard).getByLabelText('退款金额（分）'), { target: { value: '200' } })
    fireEvent.change(within(disputeCard).getByLabelText('处理备注'), { target: { value: '确认退款' } })
    expect(within(disputeCard).getByText('通过并处理')).toBeInTheDocument()
    expect(within(disputeCard).getByText(/必须选择“原路退款”/)).toBeInTheDocument()
    fireEvent.click(within(disputeCard).getByRole('button', { name: '处理争议单' }))

    await waitFor(() => expect(mockedResolveAdminDispute).toHaveBeenCalledWith(8, {
      status: 'resolved',
      resolution_type: 'refund',
      resolution_note: '确认退款',
      refund_amount: 200,
    }))
  })

  it('normalizes rejected disputes to zero refund before calling api', () => {
    expect(buildDisputeResolutionPayload({
      dispute_id: '9',
      status: 'rejected',
      resolution_type: 'refund',
      resolution_note: '证据不足',
      refund_amount: 300,
    })).toEqual({
      disputeId: 9,
      payload: {
        status: 'rejected',
        resolution_type: 'manual_adjustment',
        resolution_note: '证据不足',
        refund_amount: 0,
      },
    })
  })

  it('keeps manual adjustment when resolved without refund', () => {
    expect(buildDisputeResolutionPayload({
      dispute_id: 10,
      status: 'resolved',
      resolution_type: 'manual_adjustment',
      resolution_note: '无需退款',
      refund_amount: 0,
    })).toEqual({
      disputeId: 10,
      payload: {
        status: 'resolved',
        resolution_type: 'manual_adjustment',
        resolution_note: '无需退款',
        refund_amount: 0,
      },
    })
  })

  it('submits confirmation phrases for high-risk wallet and settlement operations', async () => {
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>,
    )
    expect(await screen.findByText('验证码错误')).toBeInTheDocument()

    const adjustmentCard = screen.getByTestId('admin-users-adjustment-card')
    fireEvent.change(within(adjustmentCard).getByLabelText('用户 ID'), { target: { value: '2' } })
    fireEvent.change(within(adjustmentCard).getByLabelText('金额（分）'), { target: { value: '500' } })
    fireEvent.change(within(adjustmentCard).getByLabelText('原因'), { target: { value: '运营补偿' } })
    fireEvent.change(within(adjustmentCard).getByLabelText('二次确认'), { target: { value: '确认调账' } })
    fireEvent.click(within(adjustmentCard).getByRole('button', { name: '执行调账' }))
    await waitFor(() => expect(mockedAdminAdjustWallet).toHaveBeenCalledWith(2, 500, '运营补偿', '确认调账'))

    const settlementCard = screen.getByTestId('admin-users-settlement-card')
    fireEvent.change(within(settlementCard).getByLabelText('供应商用户 ID'), { target: { value: '7' } })
    fireEvent.change(within(settlementCard).getByLabelText('结算说明'), { target: { value: '月度结算' } })
    fireEvent.change(within(settlementCard).getByLabelText('二次确认'), { target: { value: '确认结算' } })
    fireEvent.click(within(settlementCard).getByRole('button', { name: '确认结算' }))
    await waitFor(() => expect(mockedSettleSupplierPending).toHaveBeenCalledWith(7, '月度结算', '确认结算'))
  })

  it('applies explicit admin dispute filters only after clicking query', async () => {
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>,
    )
    expect(await screen.findByText('验证码错误')).toBeInTheDocument()
    const listCard = screen.getByTestId('admin-users-dispute-list-card')

    fireEvent.change(within(listCard).getByLabelText('状态筛选'), { target: { value: 'resolved' } })
    fireEvent.change(within(listCard).getByLabelText('最多条数'), { target: { value: '25' } })
    expect(mockedGetAdminDisputes).toHaveBeenCalledTimes(1)

    fireEvent.click(within(listCard).getByRole('button', { name: '查询争议单' }))

    await waitFor(() => expect(mockedGetAdminDisputes).toHaveBeenLastCalledWith({ status: 'resolved', limit: 25 }))
  })
})
