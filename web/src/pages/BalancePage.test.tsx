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
        <Route
          path={PROJECTS_ROUTE}
          element={(
            <section data-testid="balance-route-stub-projects">
              <h1>项目市场</h1>
            </section>
          )}
        />
        <Route
          path={ORDERS_ROUTE}
          element={(
            <section data-testid="balance-route-stub-orders">
              <h1>订单中心</h1>
            </section>
          )}
        />
        <Route
          path={API_KEYS_ROUTE}
          element={(
            <section data-testid="balance-route-stub-api-keys">
              <h1>开发者 API 接入工作台</h1>
            </section>
          )}
        />
        <Route
          path={WEBHOOKS_ROUTE}
          element={(
            <section data-testid="balance-route-stub-webhooks">
              <h1>开发者 Webhook 接入工作台</h1>
            </section>
          )}
        />
        <Route
          path={DOCS_ROUTE}
          element={(
            <section data-testid="balance-route-stub-docs">
              <h1>API 文档与接入控制台</h1>
            </section>
          )}
        />
        <Route
          path="/"
          element={(
            <section data-testid="balance-route-stub-shared-home">
              <h1>控制台总览</h1>
            </section>
          )}
        />
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

  it('renders balance hero, mission, and capability regions for regular users', async () => {
    renderBalancePage()

    const heading = await screen.findByRole('heading', { name: '余额中心' })
    expect(heading).toBeInTheDocument()

    const hero = screen.getByTestId('balance-hero-card')
    expect(within(hero).getByText('余额任务总览')).toBeInTheDocument()
    expect(within(hero).getByText('资金工作台已与共享控制台深色壳对齐：先确认余额与预算，再回到订单、API Keys、Webhook 与 API 文档完成业务闭环。')).toBeInTheDocument()

    const missionCards = screen.getByTestId('balance-mission-cards')
    expect(within(missionCards).getByText('资金任务流')).toBeInTheDocument()
    expect(within(missionCards).getByText('先确认采购预算与库存')).toBeInTheDocument()
    expect(within(missionCards).getByText('再追踪冻结与退款链路')).toBeInTheDocument()
    expect(within(missionCards).getByText('最后串联接入与回调')).toBeInTheDocument()

    const capabilityMatrix = screen.getByTestId('balance-capability-matrix')
    expect(within(capabilityMatrix).getByText('控制台能力矩阵')).toBeInTheDocument()
    const capabilitySignals = within(capabilityMatrix).getByTestId('balance-capability-signals')
    expect(within(capabilitySignals).getByText('统一资金入口')).toBeInTheDocument()
    expect(within(capabilitySignals).getByText('共享接入桥接')).toBeInTheDocument()
    expect(within(capabilitySignals).getByText('角色菜单扩展')).toBeInTheDocument()
    expect(within(capabilityMatrix).queryByText('角色差异仍共用单壳')).not.toBeInTheDocument()
    expect(within(capabilityMatrix).queryByText('资金观察与售后同层')).not.toBeInTheDocument()
    expect(capabilityMatrix).toHaveStyle({
      background: 'linear-gradient(180deg, rgba(15,16,17,0.94) 0%, rgba(25,26,27,0.92) 100%)',
    })

    const capabilityBridge = screen.getByTestId('balance-shared-console-bridge')
    expect(within(capabilityBridge).getByText('共享接入桥接')).toBeInTheDocument()
    expect(within(capabilityBridge).getByText('余额确认后继续前往 API Keys、Webhook 与 API 文档；采购、履约、售后与程序化接入保持在同一套深色共享控制台中串联。')).toBeInTheDocument()
    expect(within(capabilityBridge).getByRole('button', { name: /打开 API Keys/ })).toBeInTheDocument()
    expect(within(capabilityBridge).getByRole('button', { name: /继续配置 Webhook/ })).toBeInTheDocument()
    expect(within(capabilityBridge).getByRole('button', { name: /查看 API 文档/ })).toBeInTheDocument()

    const disputesCard = screen.getByTestId('balance-session-disputes-card')
    expect(within(disputesCard).getByText('本次会话新提交的争议')).toBeInTheDocument()
  })


  it('navigates through the balance mission cards and shared-console bridge CTAs', async () => {
    const user = userEvent.setup()

    let view = renderBalancePage()

    expect(await screen.findByRole('heading', { name: '余额中心' })).toBeInTheDocument()

    const missionCards = await screen.findByTestId('balance-mission-cards')
    await user.click(within(missionCards).getByRole('button', { name: /前往项目市场/ }))
    expect(await screen.findByTestId('balance-route-stub-projects')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '项目市场' })).toBeInTheDocument()

    view.unmount()
    view = renderBalancePage()
    expect(await screen.findByRole('heading', { name: '余额中心' })).toBeInTheDocument()

    const refreshedMissionCards = await screen.findByTestId('balance-mission-cards')
    const ordersMissionCard = within(refreshedMissionCards).getByTestId('balance-orders-mission-card')
    await user.click(within(ordersMissionCard).getByRole('button', { name: /查看订单中心/ }))
    expect(await screen.findByTestId('balance-route-stub-orders')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '订单中心' })).toBeInTheDocument()

    view.unmount()
    view = renderBalancePage()
    expect(await screen.findByRole('heading', { name: '余额中心' })).toBeInTheDocument()

    const firstCapabilityBridge = await screen.findByTestId('balance-shared-console-bridge')
    await user.click(within(firstCapabilityBridge).getByTestId('balance-open-api-keys'))
    expect(await screen.findByTestId('balance-route-stub-api-keys')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()

    view.unmount()
    view = renderBalancePage()
    expect(await screen.findByRole('heading', { name: '余额中心' })).toBeInTheDocument()

    const secondCapabilityBridge = await screen.findByTestId('balance-shared-console-bridge')
    const secondCapabilityActions = within(secondCapabilityBridge).getByTestId('balance-capability-actions')
    expect(within(secondCapabilityActions).getByRole('button', { name: /继续配置 Webhook/ })).toBeInTheDocument()
    await user.click(within(secondCapabilityActions).getByTestId('balance-open-webhooks'))
    expect(await screen.findByTestId('balance-route-stub-webhooks')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '开发者 Webhook 接入工作台' })).toBeInTheDocument()

    view.unmount()
    view = renderBalancePage()
    expect(await screen.findByRole('heading', { name: '余额中心' })).toBeInTheDocument()

    const thirdCapabilityBridge = await screen.findByTestId('balance-shared-console-bridge')
    const thirdCapabilityActions = within(thirdCapabilityBridge).getByTestId('balance-capability-actions')
    expect(within(thirdCapabilityActions).getByRole('button', { name: /查看 API 文档/ })).toBeInTheDocument()
    await user.click(within(thirdCapabilityActions).getByTestId('balance-open-docs'))
    expect(await screen.findByTestId('balance-route-stub-docs')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'API 文档与接入控制台' })).toBeInTheDocument()
  })

  it('suppresses unavailable finance CTA targets and returns to the preferred workspace', async () => {
    seedMenu(['/', BALANCE_ROUTE])

    render(
      <MemoryRouter initialEntries={[BALANCE_ROUTE]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path={BALANCE_ROUTE} element={<BalancePage />} />
          <Route
            path="/"
            element={(
              <section data-testid="balance-route-stub-shared-home">
                <h1>控制台总览</h1>
              </section>
            )}
          />
          <Route path="*" element={<FallbackRouteProbe />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: '余额中心' })).toBeInTheDocument()
    const missionCards = screen.getByTestId('balance-mission-cards')
    expect(within(missionCards).queryByRole('button', { name: '前往项目市场' })).not.toBeInTheDocument()
    expect(within(missionCards).queryByRole('button', { name: '查看订单中心' })).not.toBeInTheDocument()
    expect(within(missionCards).queryByRole('button', { name: '打开 API Keys' })).not.toBeInTheDocument()
    const capabilityActions = screen.getByTestId('balance-capability-actions')
    expect(within(capabilityActions).queryByRole('button', { name: '打开 API Keys' })).not.toBeInTheDocument()
    expect(within(capabilityActions).queryByRole('button', { name: '继续配置 Webhook' })).not.toBeInTheDocument()
    expect(within(capabilityActions).queryByRole('button', { name: '查看 API 文档' })).not.toBeInTheDocument()
    const fallback = screen.getByTestId('balance-shared-console-fallback')
    expect(within(fallback).getByText('共享控制台回退')).toBeInTheDocument()
    expect(within(fallback).getByText('当前资金页已是唯一可见业务工作台')).toBeInTheDocument()
    expect(within(fallback).getByText('当服务端暂未暴露采购、订单或接入入口时，保持留在同一套共享控制台，并回到共享工作台继续查看当前角色仍可访问的主链路。')).toBeInTheDocument()
    expect(within(fallback).getByRole('button', { name: /返回共享工作台/ })).toBeInTheDocument()
  })

  it('hides the fallback when balance page is already the only visible workspace', async () => {
    seedMenu([BALANCE_ROUTE])

    renderBalancePage()

    expect(await screen.findByRole('heading', { name: '余额中心' })).toBeInTheDocument()
    expect(screen.queryByTestId('balance-shared-console-fallback')).not.toBeInTheDocument()
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

    const heroCard = await screen.findByTestId('balance-hero-card')
    expect(within(heroCard).getByRole('heading', { name: '余额中心' })).toBeInTheDocument()
    expect(within(heroCard).getByText('供应商仍通过同一套共享控制台观察供货结算与争议结果')).toBeInTheDocument()
  })

  it('shows admin-facing shared-console operations guidance when admin role is active', async () => {
    seedRole('admin')
    seedMenu(['/', BALANCE_ROUTE, PROJECTS_ROUTE, ORDERS_ROUTE, API_KEYS_ROUTE, WEBHOOKS_ROUTE, DOCS_ROUTE])

    renderBalancePage()

    const heroCard = await screen.findByTestId('balance-hero-card')
    expect(within(heroCard).getByRole('heading', { name: '余额中心' })).toBeInTheDocument()
    expect(within(heroCard).getByText('管理员可在共享控制台的运营链路继续跟进调账、结算与争议处理')).toBeInTheDocument()
  })
})
