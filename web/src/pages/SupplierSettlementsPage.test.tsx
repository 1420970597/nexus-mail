import { render, screen, waitFor, within, cleanup } from '@testing-library/react'
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
        <Route path={SUPPLIER_RESOURCES_ROUTE} element={<div>供应商资源页</div>} />
        <Route path={SUPPLIER_OFFERINGS_ROUTE} element={<div>供应商供货页</div>} />
        <Route path={API_KEYS_ROUTE} element={<div>API Keys 页面</div>} />
        <Route path={WEBHOOKS_ROUTE} element={<div>Webhook 页面</div>} />
        <Route path={DOCS_ROUTE} element={<div>Docs 页面</div>} />
        <Route path={DASHBOARD_ROUTE} element={<div>共享控制台首页</div>} />
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
        { key: 'dashboard', label: '共享控制台首页', path: DASHBOARD_ROUTE },
        { key: 'supplier-resources', label: '供应商资源', path: SUPPLIER_RESOURCES_ROUTE },
        { key: 'supplier-offerings', label: '供货规则', path: SUPPLIER_OFFERINGS_ROUTE },
        { key: 'supplier-settlements', label: '供应商结算', path: SUPPLIER_SETTLEMENTS_ROUTE },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
        { key: 'webhooks', label: 'Webhook', path: WEBHOOKS_ROUTE },
        { key: 'docs', label: 'Docs', path: DOCS_ROUTE },
      ],
    })
    seedFinancePayload()
  })

  it('renders supplier finance mission-control shell with metrics and shared-console guidance', async () => {
    renderSupplierSettlementsPage()

    expect(await screen.findByText('Supplier Finance Mission Control')).toBeInTheDocument()
    expect(screen.getByText('供应商资金与争议指挥台')).toBeInTheDocument()
    expect(screen.getByText('供应商资金任务流')).toBeInTheDocument()
    expect(screen.getByText('共享控制台联动')).toBeInTheDocument()
    expect(screen.getByText('待结算余额')).toBeInTheDocument()
    expect(screen.getByText('活跃成本模型')).toBeInTheDocument()
    expect(screen.getByText('开放争议')).toBeInTheDocument()
    expect(screen.getByText('当前列表流水')).toBeInTheDocument()
    expect(screen.getByText('先核对待结算与冻结资金')).toBeInTheDocument()
    expect(screen.getByText('继续维护项目成本模型')).toBeInTheDocument()
    expect(screen.getByText('最后复盘争议与共享控制台入口')).toBeInTheDocument()
    const bridge = screen.getByTestId('supplier-settlements-shared-console-bridge')
    expect(within(bridge).getByText(`API Keys · ${API_KEYS_ROUTE}`)).toBeInTheDocument()
    expect(within(bridge).getByText(`Webhook 设置 · ${WEBHOOKS_ROUTE}`)).toBeInTheDocument()
    expect(within(bridge).getByText(`API 文档 · ${DOCS_ROUTE}`)).toBeInTheDocument()
  })

  it('shows real supplier settlement records, reports, and disputes from loaded payloads', async () => {
    renderSupplierSettlementsPage()

    expect(await screen.findByText('Discord 首单')).toBeInTheDocument()
    const reportSection = screen.getByText('项目报表').closest('.semi-card')
    expect(reportSection).not.toBeNull()
    expect(within(reportSection as HTMLElement).getByText(/^discord$/i)).toBeInTheDocument()
    expect(screen.getByText('¥1899.00')).toBeInTheDocument()
    expect(screen.getByText('¥77.00')).toBeInTheDocument()
    expect(screen.getByText('主力供给')).toBeInTheDocument()
    expect(screen.getByText('验证码错误')).toBeInTheDocument()
    expect(screen.getByText('¥388.00')).toBeInTheDocument()
    expect(screen.getByText('¥235.00')).toBeInTheDocument()
  })

  it('navigates from mission-control actions to supplier resource, offering, and api key pages', async () => {
    const user = userEvent.setup()
    renderSupplierSettlementsPage()

    expect(await screen.findByText('Supplier Finance Mission Control')).toBeInTheDocument()

    const missionFlow = screen.getByTestId('supplier-settlements-mission-flow')
    await user.click(within(missionFlow).getByRole('button', { name: /查看供应商资源/ }))
    expect(await screen.findByText('供应商资源页')).toBeInTheDocument()

    cleanup()
    renderSupplierSettlementsPage()
    expect(await screen.findByText('Supplier Finance Mission Control')).toBeInTheDocument()
    await user.click(within(screen.getByTestId('supplier-settlements-mission-flow')).getByRole('button', { name: /继续维护供货规则/ }))
    expect(await screen.findByText('供应商供货页')).toBeInTheDocument()

    cleanup()
    renderSupplierSettlementsPage()
    expect(await screen.findByText('Supplier Finance Mission Control')).toBeInTheDocument()
    await user.click(within(screen.getByTestId('supplier-settlements-mission-flow')).getByRole('button', { name: /打开 API Keys/ }))
    expect(await screen.findByText('API Keys 页面')).toBeInTheDocument()
  })

  it('suppresses unavailable supplier and shared-console ctas then falls back to the preferred workspace when downstream routes are absent', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 89, email: 'supplier@nexus.test', role: 'supplier', created_at: '' },
      menu: [
        { key: 'dashboard', label: '共享控制台首页', path: DASHBOARD_ROUTE },
        { key: 'supplier-settlements', label: '供应商结算', path: SUPPLIER_SETTLEMENTS_ROUTE },
      ],
    })

    renderSupplierSettlementsPage()

    expect(await screen.findByText('Supplier Finance Mission Control')).toBeInTheDocument()
    const missionFlow = screen.getByTestId('supplier-settlements-mission-flow')
    expect(within(missionFlow).queryByRole('button', { name: '查看供应商资源' })).not.toBeInTheDocument()
    expect(within(missionFlow).queryByRole('button', { name: '继续维护供货规则' })).not.toBeInTheDocument()
    expect(within(missionFlow).queryByRole('button', { name: '打开 API Keys' })).not.toBeInTheDocument()
    expect(screen.getByTestId('supplier-settlements-mission-fallback')).toBeInTheDocument()

    const bridge = screen.getByTestId('supplier-settlements-shared-console-bridge')
    expect(within(bridge).queryByText(`API Keys · ${API_KEYS_ROUTE}`)).not.toBeInTheDocument()
    expect(within(bridge).queryByText(`Webhook 设置 · ${WEBHOOKS_ROUTE}`)).not.toBeInTheDocument()
    expect(within(bridge).queryByText(`API 文档 · ${DOCS_ROUTE}`)).not.toBeInTheDocument()
    expect(screen.getByTestId('supplier-settlements-shared-console-fallback')).toBeInTheDocument()

    const fallbackButton = within(screen.getByTestId('supplier-settlements-mission-fallback')).getByRole('button', { name: /返回推荐工作台/ })
    await user.click(fallbackButton)
    expect(await screen.findByText('共享控制台首页')).toBeInTheDocument()
  })

  it('hides the fallback slices when supplier settlements is the only visible route', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 90, email: 'supplier@nexus.test', role: 'supplier', created_at: '' },
      menu: [{ key: 'supplier-settlements', label: '供应商结算', path: SUPPLIER_SETTLEMENTS_ROUTE }],
    })

    renderSupplierSettlementsPage()

    expect(await screen.findByText('Supplier Finance Mission Control')).toBeInTheDocument()
    expect(screen.queryByTestId('supplier-settlements-mission-fallback')).not.toBeInTheDocument()
    expect(screen.queryByTestId('supplier-settlements-shared-console-fallback')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '返回推荐工作台' })).not.toBeInTheDocument()
  })

  it('submits supplier cost profile and dispute actions then reloads data', async () => {
    mockedSaveSupplierCostProfile.mockResolvedValue({ profile: { id: 2 } })
    mockedCreateSupplierDispute.mockResolvedValue({ dispute: { id: 78 } })

    const user = userEvent.setup()
    renderSupplierSettlementsPage()

    expect(await screen.findByText('Supplier Finance Mission Control')).toBeInTheDocument()

    await user.type(screen.getByLabelText('项目键'), 'telegram')
    await user.clear(screen.getByRole('spinbutton', { name: '成功成本（分）' }))
    await user.type(screen.getByRole('spinbutton', { name: '成功成本（分）' }), '180')
    await user.clear(screen.getByRole('spinbutton', { name: '超时成本（分）' }))
    await user.type(screen.getByRole('spinbutton', { name: '超时成本（分）' }), '40')
    await user.clear(screen.getByLabelText('币种'))
    await user.type(screen.getByLabelText('币种'), 'USD')
    await user.click(screen.getByRole('button', { name: '保存成本模型' }))

    await waitFor(() => expect(mockedSaveSupplierCostProfile).toHaveBeenCalledWith({
      project_key: 'telegram',
      cost_per_success: 180,
      cost_per_timeout: 40,
      currency: 'USD',
      status: 'active',
      notes: undefined,
    }))

    await user.clear(screen.getByRole('spinbutton', { name: '订单 ID' }))
    await user.type(screen.getByRole('spinbutton', { name: '订单 ID' }), '9912')
    await user.type(screen.getByLabelText('争议原因'), '回执超时')
    await user.click(screen.getByRole('button', { name: '提交争议' }))

    await waitFor(() => expect(mockedCreateSupplierDispute).toHaveBeenCalledWith(9912, '回执超时'))
    await waitFor(() => expect(mockedGetSupplierSettlementOverview).toHaveBeenCalledTimes(3))
    await waitFor(() => expect(mockedSuccess).toHaveBeenCalled())
  })
})
