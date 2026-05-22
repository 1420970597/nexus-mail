import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SupplierSettlementsPage } from './SupplierSettlementsPage'
import {
  API_KEYS_ROUTE,
  DASHBOARD_ROUTE,
  DOCS_ROUTE,
  SUPPLIER_OFFERINGS_ROUTE,
  SUPPLIER_RESOURCES_ROUTE,
  SUPPLIER_SETTLEMENTS_ROUTE,
  WEBHOOKS_ROUTE,
} from '../utils/consoleNavigation'
import { useAuthStore } from '../store/authStore'

const mockedGetSupplierSettlementOverview = vi.fn()
const mockedGetSupplierCostProfiles = vi.fn()
const mockedGetSupplierReports = vi.fn()
const mockedGetSupplierDisputes = vi.fn()
const mockedSaveSupplierCostProfile = vi.fn()
const mockedCreateSupplierDispute = vi.fn()
const mockedSuccess = vi.fn()
const mockedError = vi.fn()

vi.mock('../services/finance', () => ({
  getSupplierSettlementOverview: (...args: any[]) => mockedGetSupplierSettlementOverview(...args),
  getSupplierCostProfiles: (...args: any[]) => mockedGetSupplierCostProfiles(...args),
  getSupplierReports: (...args: any[]) => mockedGetSupplierReports(...args),
  getSupplierDisputes: (...args: any[]) => mockedGetSupplierDisputes(...args),
  saveSupplierCostProfile: (...args: any[]) => mockedSaveSupplierCostProfile(...args),
  createSupplierDispute: (...args: any[]) => mockedCreateSupplierDispute(...args),
}))

vi.mock('@douyinfe/semi-ui', async () => {
  const actual: any = await vi.importActual('@douyinfe/semi-ui')
  return {
    ...actual,
    Toast: {
      success: (...args: any[]) => mockedSuccess(...args),
      error: (...args: any[]) => mockedError(...args),
    },
  }
})

function seedFinancePayload() {
  mockedGetSupplierSettlementOverview.mockResolvedValue({
    wallet: {
      user_id: 88,
      email: 'supplier@nexus.test',
      available_balance: 560000,
      frozen_balance: 23000,
      pending_settlement: 189900,
      updated_at: '2026-05-01T00:00:00Z',
    },
    entries: [
      {
        id: 101,
        supplier_id: 88,
        order_id: 9001,
        amount: 3200,
        status: 'pending',
        note: 'Discord 首单',
        created_at: '2026-04-28T10:00:00Z',
      },
      {
        id: 102,
        supplier_id: 88,
        order_id: 9002,
        amount: 4500,
        status: 'settled',
        note: 'Telegram 月结',
        created_at: '2026-04-29T11:00:00Z',
      },
    ],
  })
  mockedGetSupplierCostProfiles.mockResolvedValue({
    items: [
      {
        id: 1,
        supplier_id: 88,
        project_key: 'discord',
        cost_per_success: 120,
        cost_per_timeout: 35,
        currency: 'CNY',
        status: 'active',
        notes: '主力供给',
        updated_at: '2026-04-30T12:00:00Z',
      },
    ],
  })
  mockedGetSupplierReports.mockResolvedValue({
    items: [
      {
        project_key: 'discord',
        total_orders: 120,
        finished_orders: 109,
        timeout_orders: 7,
        disputed_orders: 4,
        gross_revenue: 38800,
        modeled_cost: 15300,
        estimated_gross_pnl: 23500,
      },
    ],
  })
  mockedGetSupplierDisputes.mockResolvedValue({
    items: [
      {
        id: 77,
        order_id: 9003,
        project_key: 'discord',
        supplier_id: 88,
        user_id: 18,
        status: 'open',
        reason: '验证码错误',
        resolution_type: '',
        resolution_note: '',
        refund_amount: 0,
        created_at: '2026-04-30T01:00:00Z',
        updated_at: '2026-04-30T01:00:00Z',
      },
    ],
  })
}

function renderSupplierSettlementsPage() {
  return render(
    <MemoryRouter initialEntries={[SUPPLIER_SETTLEMENTS_ROUTE]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path={SUPPLIER_SETTLEMENTS_ROUTE} element={<SupplierSettlementsPage />} />
        <Route
          path={SUPPLIER_RESOURCES_ROUTE}
          element={(
            <section
              data-testid="supplier-settlements-route-stub-resources"
              role="region"
              aria-label="共享控制台 - 供应商资源"
            >
              <h1>供应商资源</h1>
            </section>
          )}
        />
        <Route
          path={SUPPLIER_OFFERINGS_ROUTE}
          element={(
            <section
              data-testid="supplier-settlements-route-stub-offerings"
              role="region"
              aria-label="共享控制台 - 供货规则编排中枢"
            >
              <h1>供货规则编排中枢</h1>
            </section>
          )}
        />
        <Route
          path={API_KEYS_ROUTE}
          element={(
            <section
              data-testid="supplier-settlements-route-stub-api-keys"
              role="region"
              aria-label="共享控制台 - API Keys"
            >
              <h1>开发者 API 接入工作台</h1>
            </section>
          )}
        />
        <Route
          path={WEBHOOKS_ROUTE}
          element={(
            <section
              data-testid="supplier-settlements-route-stub-webhooks"
              role="region"
              aria-label="共享控制台 - Webhooks"
            >
              <h1>供给事件回调工作台</h1>
            </section>
          )}
        />
        <Route
          path={DOCS_ROUTE}
          element={(
            <section
              data-testid="supplier-settlements-route-stub-docs"
              role="region"
              aria-label="共享控制台 - API 文档"
            >
              <h1>API 文档与接入控制台</h1>
            </section>
          )}
        />
        <Route
          path={DASHBOARD_ROUTE}
          element={(
            <section
              data-testid="supplier-settlements-route-stub-shared-home"
              role="region"
              aria-label="共享控制台首页"
            >
              <h1>控制台总览</h1>
            </section>
          )}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SupplierSettlementsPage', () => {
  beforeEach(() => {
    mockedGetSupplierSettlementOverview.mockReset()
    mockedGetSupplierCostProfiles.mockReset()
    mockedGetSupplierReports.mockReset()
    mockedGetSupplierDisputes.mockReset()
    mockedSaveSupplierCostProfile.mockReset()
    mockedCreateSupplierDispute.mockReset()
    mockedSuccess.mockReset()
    mockedError.mockReset()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 88, email: 'supplier@nexus.test', role: 'supplier', created_at: '' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: DASHBOARD_ROUTE },
        { key: 'supplier-resources', label: '供应商资源', path: SUPPLIER_RESOURCES_ROUTE },
        { key: 'supplier-offerings', label: '供货规则', path: SUPPLIER_OFFERINGS_ROUTE },
        { key: 'supplier-settlements', label: '供应商结算', path: SUPPLIER_SETTLEMENTS_ROUTE },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
        { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
        { key: 'docs', label: 'API 文档', path: DOCS_ROUTE },
      ],
    })
    seedFinancePayload()
  })

  afterEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })
  })

  it('renders supplier finance mission-control shell with metrics and shared-console guidance', async () => {
    renderSupplierSettlementsPage()

    const heroCard = await screen.findByRole('region', { name: '供应商资金与争议指挥台' })
    expect(within(heroCard).getByText('资金争议中枢')).toBeInTheDocument()
    const pendingMetric = screen.getByTestId('supplier-settlements-metric-pending')
    expect(within(pendingMetric).getByText('待结算余额')).toBeInTheDocument()
    const activeProfilesMetric = screen.getByTestId('supplier-settlements-metric-active-profiles')
    expect(within(activeProfilesMetric).getByText('活跃成本模型')).toBeInTheDocument()
    const openDisputesMetric = screen.getByTestId('supplier-settlements-metric-open-disputes')
    expect(within(openDisputesMetric).getByText('开放争议')).toBeInTheDocument()
    const entryTotalMetric = screen.getByTestId('supplier-settlements-metric-entry-total')
    expect(within(entryTotalMetric).getByText('当前列表流水')).toBeInTheDocument()
    const missionFlow = screen.getByRole('region', { name: '供应商资金任务流' })
    const missionScope = within(missionFlow)
    expect(within(missionFlow).getByRole('heading', { name: '供应商资金任务流' })).toBeInTheDocument()
    const bridge = screen.getByRole('region', { name: '共享接入桥接' })
    const capabilityMatrix = screen.getByRole('region', { name: '控制台能力矩阵' })
    expect(bridge).toHaveAttribute('aria-labelledby', 'supplier-settlements-shared-console-bridge-heading')
    expect(capabilityMatrix).toHaveAttribute('aria-labelledby', 'supplier-settlements-capability-matrix-heading')
    expect(within(bridge).getByRole('heading', { name: '共享接入桥接' })).toBeInTheDocument()
    expect(within(capabilityMatrix).getByRole('heading', { name: '控制台能力矩阵' })).toBeInTheDocument()
    expect(within(capabilityMatrix).getByText('统一结算入口')).toBeInTheDocument()
    expect(within(capabilityMatrix).getByText('共享接入桥接')).toBeInTheDocument()
    expect(within(capabilityMatrix).getByText('服务端菜单扩展')).toBeInTheDocument()
    expect(within(bridge).getByText('供应商财务动作完成后，继续与共享接入能力、回调配置和文档核对处于同一控制台中，避免把财务体验拆成孤岛页面。')).toBeInTheDocument()
    expect(within(bridge).queryByText('供应商财务动作完成后，继续与共享接入能力、回调配置和文档入口处于同一控制台中，避免把财务体验拆成孤岛页面。')).not.toBeInTheDocument()
    expect(bridge).toHaveTextContent('开发者 API 接入工作台')
    expect(bridge).toHaveTextContent('供给事件回调工作台')
    expect(bridge).toHaveTextContent('API 文档与接入控制台')
    expect(within(bridge).getByRole('button', { name: /打开 API Keys/ })).toBeInTheDocument()
    expect(within(bridge).getByRole('button', { name: /继续配置 Webhook/ })).toBeInTheDocument()
    expect(within(bridge).getByRole('button', { name: /查看 API 文档/ })).toBeInTheDocument()
    expect(bridge).not.toHaveTextContent(`API Keys · ${API_KEYS_ROUTE}`)
    expect(bridge).not.toHaveTextContent(`供给事件回调工作台 · ${WEBHOOKS_ROUTE}`)
    expect(bridge).not.toHaveTextContent(`API 文档与接入控制台 · ${DOCS_ROUTE}`)
  })

  it('navigates from the shared-console bridge into named api keys, webhooks, and docs regions', async () => {
    const user = userEvent.setup()
    let view = renderSupplierSettlementsPage()

    expect(await screen.findByRole('heading', { name: '供应商资金与争议指挥台' })).toBeInTheDocument()
    let bridge = screen.getByRole('region', { name: '共享接入桥接' })
    await user.click(within(bridge).getByRole('button', { name: /打开 API Keys/ }))
    let apiKeysRouteStub = await screen.findByRole('region', { name: '共享控制台 - API Keys' })
    expect(within(apiKeysRouteStub).getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()

    view.unmount()
    view = renderSupplierSettlementsPage()
    expect(await screen.findByRole('heading', { name: '供应商资金与争议指挥台' })).toBeInTheDocument()
    bridge = screen.getByRole('region', { name: '共享接入桥接' })
    await user.click(within(bridge).getByRole('button', { name: /继续配置 Webhook/ }))
    const webhooksRouteStub = await screen.findByRole('region', { name: '共享控制台 - Webhooks' })
    expect(within(webhooksRouteStub).getByRole('heading', { name: '供给事件回调工作台' })).toBeInTheDocument()

    view.unmount()
    renderSupplierSettlementsPage()
    expect(await screen.findByRole('heading', { name: '供应商资金与争议指挥台' })).toBeInTheDocument()
    bridge = screen.getByRole('region', { name: '共享接入桥接' })
    await user.click(within(bridge).getByRole('button', { name: /查看 API 文档/ }))
    const docsRouteStub = await screen.findByRole('region', { name: '共享控制台 - API 文档' })
    expect(within(docsRouteStub).getByRole('heading', { name: 'API 文档与接入控制台' })).toBeInTheDocument()
  })

  it('shows real supplier settlement records, reports, and disputes from loaded payloads', async () => {
    renderSupplierSettlementsPage()

    const entriesSection = await screen.findByRole('region', { name: '结算流水' })
    expect(within(entriesSection).getByRole('heading', { name: '结算流水' })).toBeInTheDocument()
    expect(within(entriesSection).getByText('Discord 首单')).toBeInTheDocument()
    expect(within(entriesSection).getByText('¥32.00')).toBeInTheDocument()

    const reportSection = screen.getByRole('region', { name: '项目报表' })
    expect(within(reportSection).getByRole('heading', { name: '项目报表' })).toBeInTheDocument()
    expect(within(reportSection).getByText(/^discord$/i)).toBeInTheDocument()
    expect(within(reportSection).getByText('¥388.00')).toBeInTheDocument()
    expect(within(reportSection).getByText('¥235.00')).toBeInTheDocument()

    const costProfilesSection = screen.getByRole('region', { name: '供应商成本模型' })
    expect(within(costProfilesSection).getByRole('heading', { name: '供应商成本模型' })).toBeInTheDocument()
    expect(within(costProfilesSection).getByText('主力供给')).toBeInTheDocument()

    const disputesSection = screen.getByRole('region', { name: '供应商争议单' })
    expect(within(disputesSection).getByRole('heading', { name: '供应商争议单' })).toBeInTheDocument()
    expect(within(disputesSection).getByText('验证码错误')).toBeInTheDocument()
    expect(within(disputesSection).getByText('¥0.00')).toBeInTheDocument()
  })

  it('navigates from mission-control actions to supplier resource, offering, and api key pages', async () => {
    const user = userEvent.setup()
    let view = renderSupplierSettlementsPage()

    expect(await screen.findByRole('heading', { name: '供应商资金与争议指挥台' })).toBeInTheDocument()

    const missionFlow = screen.getByRole('region', { name: '供应商资金任务流' })
    await user.click(within(missionFlow).getByRole('button', { name: /查看供应商资源/ }))
    const resourcesRegion = await screen.findByRole('region', { name: '共享控制台 - 供应商资源' })
    expect(within(resourcesRegion).getByRole('heading', { name: '供应商资源' })).toBeInTheDocument()

    view.unmount()
    view = renderSupplierSettlementsPage()
    expect(await screen.findByRole('heading', { name: '供应商资金与争议指挥台' })).toBeInTheDocument()
    await user.click(within(screen.getByRole('region', { name: '供应商资金任务流' })).getByRole('button', { name: /继续维护供货规则/ }))
    const offeringsRegion = await screen.findByRole('region', { name: '共享控制台 - 供货规则编排中枢' })
    expect(within(offeringsRegion).getByRole('heading', { name: '供货规则编排中枢' })).toBeInTheDocument()

    view.unmount()
    view = renderSupplierSettlementsPage()
    expect(await screen.findByRole('heading', { name: '供应商资金与争议指挥台' })).toBeInTheDocument()
    await user.click(within(screen.getByRole('region', { name: '供应商资金任务流' })).getByRole('button', { name: /打开 API Keys/ }))
    const apiKeysRegion = await screen.findByRole('region', { name: '共享控制台 - API Keys' })
    expect(within(apiKeysRegion).getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()
  })

  it('shows a named shared-console fallback region and routes back to the shared home when integration entries are hidden', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 88, email: 'supplier@nexus.test', role: 'supplier', created_at: '' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: DASHBOARD_ROUTE },
        { key: 'supplier-resources', label: '供应商资源', path: SUPPLIER_RESOURCES_ROUTE },
        { key: 'supplier-offerings', label: '供货规则', path: SUPPLIER_OFFERINGS_ROUTE },
        { key: 'supplier-settlements', label: '供应商结算', path: SUPPLIER_SETTLEMENTS_ROUTE },
      ],
    })

    renderSupplierSettlementsPage()

    expect(await screen.findByRole('heading', { name: '供应商资金与争议指挥台' })).toBeInTheDocument()
    const missionFlow = screen.getByRole('region', { name: '供应商资金任务流' })
    expect(within(missionFlow).getByRole('button', { name: /查看供应商资源/ })).toBeInTheDocument()
    expect(within(missionFlow).getByRole('button', { name: /继续维护供货规则/ })).toBeInTheDocument()
    expect(within(missionFlow).queryByRole('button', { name: '打开 API Keys' })).not.toBeInTheDocument()
    expect(screen.queryByTestId('supplier-settlements-mission-fallback')).not.toBeInTheDocument()

    const bridge = screen.getByRole('region', { name: '共享接入桥接' })
    expect(within(bridge).queryByText(`开发者 API 接入工作台 · ${API_KEYS_ROUTE}`)).not.toBeInTheDocument()
    expect(within(bridge).queryByText(`供给事件回调工作台 · ${WEBHOOKS_ROUTE}`)).not.toBeInTheDocument()
    expect(within(bridge).queryByText(`API 文档与接入控制台 · ${DOCS_ROUTE}`)).not.toBeInTheDocument()
    const sharedConsoleFallback = screen.getByRole('region', { name: '返回共享工作台' })
    expect(within(sharedConsoleFallback).getByRole('heading', { name: '返回共享工作台' })).toBeInTheDocument()
    expect(within(sharedConsoleFallback).getByText('共享接入入口暂未由服务端暴露时，先回到共享工作台继续真实业务主链路，不在当前页泄露未授权集成入口。')).toBeInTheDocument()

    await user.click(within(sharedConsoleFallback).getByRole('button', { name: /返回共享工作台/ }))
    const sharedHomeRegion = await screen.findByRole('region', { name: '共享控制台首页' })
    expect(within(sharedHomeRegion).getByRole('heading', { name: '控制台总览' })).toBeInTheDocument()
  })

  it('hides the fallback slices when supplier settlements is the only visible route', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 90, email: 'supplier@nexus.test', role: 'supplier', created_at: '' },
      menu: [{ key: 'supplier-settlements', label: '供应商结算', path: SUPPLIER_SETTLEMENTS_ROUTE }],
    })

    renderSupplierSettlementsPage()

    expect(await screen.findByRole('heading', { name: '供应商资金与争议指挥台' })).toBeInTheDocument()
    expect(screen.queryByTestId('supplier-settlements-mission-fallback')).not.toBeInTheDocument()
    expect(screen.queryByTestId('supplier-settlements-shared-console-fallback')).not.toBeInTheDocument()
  })

  it('keeps the mission fallback navigation scoped to its own fallback region when shared-console fallback also exists', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 89, email: 'supplier@nexus.test', role: 'supplier', created_at: '' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: DASHBOARD_ROUTE },
        { key: 'supplier-settlements', label: '供应商结算', path: SUPPLIER_SETTLEMENTS_ROUTE },
      ],
    })

    renderSupplierSettlementsPage()

    expect(await screen.findByRole('heading', { name: '供应商资金与争议指挥台' })).toBeInTheDocument()
    const fallbackRegions = screen.getAllByRole('region', { name: '返回共享工作台' })
    expect(fallbackRegions).toHaveLength(2)
    const missionFallback = fallbackRegions[0]
    const sharedConsoleFallback = fallbackRegions[1]

    expect(within(missionFallback).getByRole('button', { name: /返回共享工作台/ })).toBeInTheDocument()
    expect(within(sharedConsoleFallback).getByTestId('supplier-settlements-shared-console-fallback-button')).toBeInTheDocument()

    await user.click(within(missionFallback).getByRole('button', { name: /返回共享工作台/ }))
    const sharedHomeRegion = await screen.findByRole('region', { name: '共享控制台首页' })
    expect(within(sharedHomeRegion).getByRole('heading', { name: '控制台总览' })).toBeInTheDocument()
  })

  it('submits supplier cost profile and dispute actions from scoped finance cards then reloads data', async () => {
    mockedSaveSupplierCostProfile.mockResolvedValue({ profile: { id: 2 } })
    mockedCreateSupplierDispute.mockResolvedValue({ dispute: { id: 78 } })

    const user = userEvent.setup()
    renderSupplierSettlementsPage()

    expect(await screen.findByRole('heading', { name: '供应商资金与争议指挥台' })).toBeInTheDocument()

    const costProfileForm = screen.getByTestId('supplier-settlements-cost-profile-form')
    await user.clear(within(costProfileForm).getByLabelText('项目键'))
    await user.type(within(costProfileForm).getByLabelText('项目键'), 'telegram')
    await user.clear(within(costProfileForm).getByRole('spinbutton', { name: '成功成本（分）' }))
    await user.type(within(costProfileForm).getByRole('spinbutton', { name: '成功成本（分）' }), '180')
    await user.clear(within(costProfileForm).getByRole('spinbutton', { name: '超时成本（分）' }))
    await user.type(within(costProfileForm).getByRole('spinbutton', { name: '超时成本（分）' }), '40')
    await user.click(within(costProfileForm).getByRole('button', { name: '保存成本模型' }))

    await waitFor(() => expect(mockedSaveSupplierCostProfile).toHaveBeenCalledWith({
      project_key: 'telegram',
      cost_per_success: 180,
      cost_per_timeout: 40,
      currency: 'CNY',
      status: 'active',
      notes: undefined,
    }))

    const disputeForm = screen.getByTestId('supplier-settlements-dispute-form')
    await user.clear(within(disputeForm).getByRole('spinbutton', { name: '订单 ID' }))
    await user.type(within(disputeForm).getByRole('spinbutton', { name: '订单 ID' }), '9912')
    await user.clear(within(disputeForm).getByLabelText('争议原因'))
    await user.type(within(disputeForm).getByLabelText('争议原因'), '回执超时')
    await user.click(within(disputeForm).getByRole('button', { name: '提交争议' }))

    await waitFor(() => expect(mockedCreateSupplierDispute).toHaveBeenCalledWith(9912, '回执超时'))
    await waitFor(() => expect(mockedGetSupplierSettlementOverview).toHaveBeenCalledTimes(3))
    await waitFor(() => expect(mockedSuccess).toHaveBeenCalled())
  })
})
