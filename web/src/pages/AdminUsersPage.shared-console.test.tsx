import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AdminUsersPage } from './AdminUsersPage'
import * as financeService from '../services/finance'
import { useAuthStore } from '../store/authStore'
import { ADMIN_AUDIT_ROUTE, ADMIN_RISK_ROUTE, API_KEYS_ROUTE, ADMIN_USERS_ROUTE, DASHBOARD_ROUTE, DOCS_ROUTE, WEBHOOKS_ROUTE, resolveRouteTitle } from '../utils/consoleNavigation'

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
        <Route
          path={ADMIN_RISK_ROUTE}
          element={<section data-testid="admin-users-route-stub-risk"><h1>风控中心</h1></section>}
        />
        <Route
          path={ADMIN_AUDIT_ROUTE}
          element={<section data-testid="admin-users-route-stub-audit"><h1>审计日志</h1></section>}
        />
        <Route
          path={API_KEYS_ROUTE}
          element={<section data-testid="admin-users-route-stub-api-keys"><h1>开发者 API 接入工作台</h1></section>}
        />
        <Route
          path={WEBHOOKS_ROUTE}
          element={<section data-testid="admin-users-route-stub-webhooks"><h1>{resolveRouteTitle(WEBHOOKS_ROUTE, 'admin')}</h1></section>}
        />
        <Route
          path={DOCS_ROUTE}
          element={<section data-testid="admin-users-route-stub-docs"><h1>API 文档与接入控制台</h1></section>}
        />
        <Route
          path={DASHBOARD_ROUTE}
          element={<section data-testid="admin-users-route-stub-dashboard"><h1>控制台总览</h1></section>}
        />
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

  it('renders admin finance mission-control shell with scoped metrics and shared-console bridge CTA contracts', async () => {
    renderAdminUsersPage()

    expect(await screen.findByRole('heading', { name: '用户管理' })).toBeInTheDocument()

    const walletMetric = screen.getByTestId('admin-users-metric-wallet')
    expect(within(walletMetric).getByText('钱包调整面')).toBeInTheDocument()
    expect(within(walletMetric).getByText(/人均可用余额/)).toBeInTheDocument()

    const settlementMetric = screen.getByTestId('admin-users-metric-settlement')
    expect(within(settlementMetric).getByText('待结算总额')).toBeInTheDocument()
    expect(within(settlementMetric).getByText('优先处理供应商月度或异常结算')).toBeInTheDocument()

    const disputesMetric = screen.getByTestId('admin-users-metric-disputes')
    expect(within(disputesMetric).getByText('开放争议')).toBeInTheDocument()
    expect(within(disputesMetric).getByText(/当前退款敞口/)).toBeInTheDocument()

    const consoleMetric = screen.getByTestId('admin-users-metric-console')
    expect(within(consoleMetric).getByText('共享接入桥接')).toBeInTheDocument()
    expect(within(consoleMetric).queryByText('共享控制台联动')).not.toBeInTheDocument()
    expect(within(consoleMetric).getByText('高危动作、风控与接入留在同一后台闭环')).toBeInTheDocument()

    const capabilityMatrix = screen.getByRole('region', { name: '控制台能力矩阵' })
    expect(within(capabilityMatrix).getByRole('heading', { name: '控制台能力矩阵' })).toBeInTheDocument()
    expect(within(capabilityMatrix).getByText('统一运营入口')).toBeInTheDocument()
    expect(within(capabilityMatrix).getByText('共享接入桥接')).toBeInTheDocument()
    expect(within(capabilityMatrix).getByText('管理员菜单扩展')).toBeInTheDocument()

    const missionFlow = screen.getByTestId('admin-users-mission-flow')
    expect(within(missionFlow).getByRole('heading', { name: '管理员主任务流' })).toBeInTheDocument()

    const bridgeCard = screen.getByRole('region', { name: '共享接入桥接' })
    expect(bridgeCard).toBeInTheDocument()
    expect(within(bridgeCard).getByRole('heading', { name: '共享接入桥接' })).toBeInTheDocument()
    expect(within(bridgeCard).getByText('即使当前是管理员资金运营切片，也要保持单一登录后控制台叙事：完成账务 / 争议动作后，仍通过 API Keys、Webhook 与 API 文档与接入控制台继续验证平台对外接入链路。')).toBeInTheDocument()
    expect(within(missionFlow).getByText('完成账务/争议处理后，仍通过 API Keys、Webhook 与 API 文档与接入控制台验证外部接入与回调链路，不拆分第二套后台。')).toBeInTheDocument()
    const bridgeLinks = within(bridgeCard).getByTestId('admin-users-shared-console-links')
    expect(within(bridgeLinks).getByText(resolveRouteTitle(API_KEYS_ROUTE, 'admin'))).toBeInTheDocument()
    expect(within(bridgeLinks).getByText(resolveRouteTitle(WEBHOOKS_ROUTE, 'admin'))).toBeInTheDocument()
    expect(within(bridgeLinks).getByText(resolveRouteTitle(DOCS_ROUTE, 'admin'))).toBeInTheDocument()
    expect(within(bridgeLinks).getByRole('button', { name: new RegExp(`打开 ${resolveRouteTitle(API_KEYS_ROUTE, 'admin')}`) })).toBeInTheDocument()
    expect(within(bridgeLinks).getByRole('button', { name: new RegExp(`打开 ${resolveRouteTitle(WEBHOOKS_ROUTE, 'admin')}`) })).toBeInTheDocument()
    expect(within(bridgeLinks).getByRole('button', { name: new RegExp(`打开 ${resolveRouteTitle(DOCS_ROUTE, 'admin')}`) })).toBeInTheDocument()
  })

  it('navigates from the shared-console bridge to api keys, webhooks, and docs destinations', async () => {
    const user = userEvent.setup()
    let view = renderAdminUsersPage()

    expect(await screen.findByRole('heading', { name: '用户管理' })).toBeInTheDocument()
    let bridgeLinks = screen.getByTestId('admin-users-shared-console-links')
    await user.click(within(bridgeLinks).getByRole('button', { name: new RegExp(`打开 ${resolveRouteTitle(API_KEYS_ROUTE, 'admin')}`) }))
    let apiKeysRouteStub = await screen.findByTestId('admin-users-route-stub-api-keys')
    expect(within(apiKeysRouteStub).getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()

    view.unmount()
    view = renderAdminUsersPage()
    expect(await screen.findByRole('heading', { name: '用户管理' })).toBeInTheDocument()
    bridgeLinks = screen.getByTestId('admin-users-shared-console-links')
    await user.click(within(bridgeLinks).getByRole('button', { name: new RegExp(`打开 ${resolveRouteTitle(WEBHOOKS_ROUTE, 'admin')}`) }))
    const webhooksRouteStub = await screen.findByTestId('admin-users-route-stub-webhooks')
    expect(within(webhooksRouteStub).getByRole('heading', { name: resolveRouteTitle(WEBHOOKS_ROUTE, 'admin') })).toBeInTheDocument()

    view.unmount()
    renderAdminUsersPage()
    expect(await screen.findByRole('heading', { name: '用户管理' })).toBeInTheDocument()
    bridgeLinks = screen.getByTestId('admin-users-shared-console-links')
    await user.click(within(bridgeLinks).getByRole('button', { name: new RegExp(`打开 ${resolveRouteTitle(DOCS_ROUTE, 'admin')}`) }))
    const docsRouteStub = await screen.findByTestId('admin-users-route-stub-docs')
    expect(within(docsRouteStub).getByRole('heading', { name: 'API 文档与接入控制台' })).toBeInTheDocument()
  })

  it('navigates from mission-control actions to risk, audit, and api key pages via the admin mission-flow region', async () => {
    const user = userEvent.setup()
    let view = renderAdminUsersPage()

    expect(await screen.findByRole('heading', { name: '用户管理' })).toBeInTheDocument()
    const missionFlow = screen.getByTestId('admin-users-mission-flow')
    await user.click(within(missionFlow).getByRole('button', { name: '查看风控中心' }))
    const riskRouteStub = await screen.findByTestId('admin-users-route-stub-risk')
    expect(within(riskRouteStub).getByRole('heading', { name: '风控中心' })).toBeInTheDocument()

    view.unmount()
    view = renderAdminUsersPage()
    expect(await screen.findByRole('heading', { name: '用户管理' })).toBeInTheDocument()
    const auditMissionFlow = screen.getByTestId('admin-users-mission-flow')
    await user.click(within(auditMissionFlow).getByRole('button', { name: '查看审计日志' }))
    const auditRouteStub = await screen.findByTestId('admin-users-route-stub-audit')
    expect(within(auditRouteStub).getByRole('heading', { name: '审计日志' })).toBeInTheDocument()

    view.unmount()
    view = renderAdminUsersPage()
    expect(await screen.findByRole('heading', { name: '用户管理' })).toBeInTheDocument()
    const integrationMissionFlow = screen.getByTestId('admin-users-mission-flow')
    await user.click(within(integrationMissionFlow).getByRole('button', { name: '打开 API Keys' }))
    const apiKeysRouteStub = await screen.findByTestId('admin-users-route-stub-api-keys')
    expect(within(apiKeysRouteStub).getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()
  })

  it('submits wallet adjustment, settlement and dispute resolution flows', async () => {
    renderAdminUsersPage()

    expect(await screen.findByText('用户管理')).toBeInTheDocument()

    const adjustmentCard = screen.getByTestId('admin-users-adjustment-card')
    fireEvent.change(within(adjustmentCard).getByLabelText('用户 ID'), { target: { value: '10' } })
    fireEvent.change(within(adjustmentCard).getByLabelText('金额（分）'), { target: { value: '500' } })
    fireEvent.change(within(adjustmentCard).getByLabelText('原因'), { target: { value: 'manual bonus' } })
    fireEvent.change(within(adjustmentCard).getByPlaceholderText('请输入：确认调账'), { target: { value: '确认调账' } })
    fireEvent.click(within(adjustmentCard).getByRole('button', { name: '执行调账' }))
    await waitFor(() => expect(mockedAdminAdjustWallet).toHaveBeenCalledWith(10, 500, 'manual bonus', '确认调账'))

    const settlementCard = screen.getByTestId('admin-users-settlement-card')
    fireEvent.change(within(settlementCard).getByLabelText('供应商用户 ID'), { target: { value: '22' } })
    fireEvent.change(within(settlementCard).getByPlaceholderText('例如：月度结算'), { target: { value: 'monthly payout' } })
    fireEvent.change(within(settlementCard).getByPlaceholderText('请输入：确认结算'), { target: { value: '确认结算' } })
    fireEvent.click(within(settlementCard).getByRole('button', { name: '确认结算' }))
    await waitFor(() => expect(mockedSettleSupplierPending).toHaveBeenCalledWith(22, 'monthly payout', '确认结算'))

    const disputeCard = screen.getByTestId('admin-users-dispute-resolution-card')
    fireEvent.change(within(disputeCard).getByLabelText('争议单 ID'), { target: { value: '8' } })
    fireEvent.click(within(disputeCard).getByRole('button', { name: '处理争议单' }))
    await waitFor(() => expect(mockedResolveAdminDispute).toHaveBeenCalled())
  })

  it('suppresses unavailable shared-console CTAs and falls back to the shared console home when only the finance page remains', async () => {
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

    expect(await screen.findByRole('heading', { name: '用户管理' })).toBeInTheDocument()
    const missionFlow = screen.getByTestId('admin-users-mission-flow')
    expect(within(missionFlow).queryByRole('button', { name: '查看风控中心' })).not.toBeInTheDocument()
    expect(within(missionFlow).queryByRole('button', { name: '查看审计日志' })).not.toBeInTheDocument()
    expect(within(missionFlow).queryByRole('button', { name: '打开 API Keys' })).not.toBeInTheDocument()
    const bridgeLinks = screen.getByTestId('admin-users-shared-console-links')
    expect(within(bridgeLinks).queryByRole('button', { name: new RegExp(`打开 ${resolveRouteTitle(API_KEYS_ROUTE, 'admin')}`) })).not.toBeInTheDocument()
    expect(within(bridgeLinks).queryByRole('button', { name: new RegExp(`打开 ${resolveRouteTitle(WEBHOOKS_ROUTE, 'admin')}`) })).not.toBeInTheDocument()
    expect(within(bridgeLinks).queryByRole('button', { name: new RegExp(`打开 ${resolveRouteTitle(DOCS_ROUTE, 'admin')}`) })).not.toBeInTheDocument()
    expect(screen.queryByTestId('admin-users-capability-matrix')).not.toBeInTheDocument()
    const fallbackCard = screen.getByTestId('admin-users-shared-console-fallback')
    expect(fallbackCard).toBeInTheDocument()
    expect(within(fallbackCard).getByRole('heading', { name: '回到共享工作台继续管理员主链路' })).toBeInTheDocument()
    expect(within(fallbackCard).getByText('当风控、审计与共享接入入口暂未由服务端暴露时，先回到共享工作台完成当前管理员主链路，再等待后续菜单授权。')).toBeInTheDocument()

    await user.click(within(fallbackCard).getByRole('button', { name: '返回共享工作台' }))
    const dashboardRouteStub = await screen.findByTestId('admin-users-route-stub-dashboard')
    expect(within(dashboardRouteStub).getByRole('heading', { name: '控制台总览' })).toBeInTheDocument()
  })
})
