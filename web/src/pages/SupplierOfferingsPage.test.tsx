import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SupplierOfferingsPage } from './SupplierOfferingsPage'
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

const mockedGetSupplierResourcesOverview = vi.fn()
const mockedGetSupplierOfferings = vi.fn()
const mockedSaveSupplierOffering = vi.fn()
const mockedSuccess = vi.fn()
const mockedError = vi.fn()

vi.mock('../services/activation', () => ({
  getSupplierResourcesOverview: (...args: any[]) => mockedGetSupplierResourcesOverview(...args),
  getSupplierOfferings: (...args: any[]) => mockedGetSupplierOfferings(...args),
  saveSupplierOffering: (...args: any[]) => mockedSaveSupplierOffering(...args),
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

function renderSupplierOfferingsPage() {
  return render(
    <MemoryRouter initialEntries={[SUPPLIER_OFFERINGS_ROUTE]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path={SUPPLIER_OFFERINGS_ROUTE} element={<SupplierOfferingsPage />} />
        <Route
          path={DASHBOARD_ROUTE}
          element={
            <section data-testid="supplier-offerings-route-stub-shared-home">
              <h1>控制台总览</h1>
            </section>
          }
        />
        <Route
          path={SUPPLIER_RESOURCES_ROUTE}
          element={
            <section data-testid="supplier-offerings-route-stub-resources">
              <h1>供应商资源</h1>
            </section>
          }
        />
        <Route
          path={SUPPLIER_SETTLEMENTS_ROUTE}
          element={
            <section data-testid="supplier-offerings-route-stub-settlements">
              <h1>供应商结算</h1>
            </section>
          }
        />
        <Route
          path={API_KEYS_ROUTE}
          element={
            <section data-testid="supplier-offerings-route-stub-api-keys">
              <h1>开发者 API 接入工作台</h1>
            </section>
          }
        />
        <Route
          path={WEBHOOKS_ROUTE}
          element={
            <section data-testid="supplier-offerings-route-stub-webhooks">
              <h1>Webhook 设置</h1>
            </section>
          }
        />
        <Route
          path={DOCS_ROUTE}
          element={
            <section data-testid="supplier-offerings-route-stub-docs">
              <h1>API 文档与接入控制台</h1>
            </section>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SupplierOfferingsPage', () => {
  beforeEach(() => {
    mockedGetSupplierResourcesOverview.mockReset()
    mockedGetSupplierOfferings.mockReset()
    mockedSaveSupplierOffering.mockReset()
    mockedSuccess.mockReset()
    mockedError.mockReset()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 7, email: 'supplier@nexus.test', role: 'supplier', created_at: '' },
      menu: [
        { label: '仪表盘', path: DASHBOARD_ROUTE },
        { label: '供应商资源', path: SUPPLIER_RESOURCES_ROUTE },
        { label: '供货规则', path: SUPPLIER_OFFERINGS_ROUTE },
        { label: '供应商结算', path: SUPPLIER_SETTLEMENTS_ROUTE },
        { label: 'API Keys', path: API_KEYS_ROUTE },
        { label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
        { label: 'API 文档', path: DOCS_ROUTE },
      ],
    })
  })

  it('renders supplier offering mission shell with scoped metrics and shared-console guidance', async () => {
    mockedGetSupplierResourcesOverview.mockResolvedValue({
      domains: [
        { id: 11, name: 'mail.nexus.test', region: 'global', status: 'active', catch_all: true },
        { id: 12, name: 'otp.nexus.test', region: 'hk', status: 'inactive', catch_all: false },
      ],
      accounts: [],
      mailboxes: [],
    })
    mockedGetSupplierOfferings.mockResolvedValue({
      items: [
        {
          id: 1,
          project_key: 'discord',
          project_name: 'Discord',
          domain_name: 'mail.nexus.test',
          price: 199,
          stock: 18,
          success_rate: 0.95,
          priority: 10,
          source_type: 'domain',
          protocol_mode: '',
        },
        {
          id: 2,
          project_key: 'telegram',
          project_name: 'Telegram',
          domain_name: 'otp.nexus.test',
          price: 299,
          stock: 6,
          success_rate: 0.88,
          priority: 20,
          source_type: 'public_mailbox_account',
          protocol_mode: 'imap_pull',
        },
      ],
    })

    renderSupplierOfferingsPage()

    const heroCard = await screen.findByTestId('supplier-offerings-hero-card')
    expect(within(heroCard).getByText('供货规则中枢')).toBeInTheDocument()
    expect(within(heroCard).getByRole('heading', { name: '供货规则编排中枢' })).toBeInTheDocument()
    const totalMetric = within(heroCard).getByTestId('supplier-offerings-metric-total')
    expect(within(totalMetric).getByText('可售规则数')).toBeInTheDocument()
    expect(within(totalMetric).getByText('2')).toBeInTheDocument()
    const projectMetric = within(heroCard).getByTestId('supplier-offerings-metric-projects')
    expect(within(projectMetric).getByText('覆盖项目')).toBeInTheDocument()
    expect(within(projectMetric).getByText('2')).toBeInTheDocument()
    const highConfidenceMetric = within(heroCard).getByTestId('supplier-offerings-metric-high-confidence')
    expect(within(highConfidenceMetric).getByText('高成功率规则')).toBeInTheDocument()
    expect(within(highConfidenceMetric).getByText('1')).toBeInTheDocument()
    const readyDomainsMetric = within(heroCard).getByTestId('supplier-offerings-metric-ready-domains')
    expect(within(readyDomainsMetric).getByText('可挂接域名池')).toBeInTheDocument()
    expect(within(readyDomainsMetric).getByText('1')).toBeInTheDocument()

    const missionFlow = screen.getByTestId('supplier-offerings-mission-flow')
    expect(within(missionFlow).getByRole('heading', { name: '供应商主任务流' })).toBeInTheDocument()
    expect(within(missionFlow).getByText('资源准备')).toBeInTheDocument()
    expect(within(missionFlow).getByText('结算反馈')).toBeInTheDocument()
    expect(within(missionFlow).getByText('统一控制台')).toBeInTheDocument()
    expect(within(missionFlow).getByRole('button', { name: /查看供应商资源/ })).toBeInTheDocument()
    expect(within(missionFlow).getByRole('button', { name: /打开供应商结算/ })).toBeInTheDocument()
    expect(within(missionFlow).getByRole('button', { name: /打开 API Keys/ })).toBeInTheDocument()

    const bridge = screen.getByTestId('supplier-offerings-shared-console-bridge')
    expect(within(bridge).getByRole('heading', { name: '共享控制台联动' })).toBeInTheDocument()
    const singleShellPillar = within(bridge).getByTestId('supplier-offerings-console-pillar-single-shell')
    expect(within(singleShellPillar).getByText('单一登录后控制台')).toBeInTheDocument()
    expect(within(bridge).getByRole('button', { name: /API Keys\s*·\s*\/api-keys/ })).toBeInTheDocument()
    expect(within(bridge).getByRole('button', { name: /Webhook 设置\s*·\s*\/webhooks/ })).toBeInTheDocument()
    expect(within(bridge).getByRole('button', { name: /API 文档\s*·\s*\/docs/ })).toBeInTheDocument()

    const offeringsTable = screen.getByTestId('supplier-offerings-table')
    expect(within(offeringsTable).getByText('discord')).toBeInTheDocument()
    expect(within(offeringsTable).getByText('¥1.99')).toBeInTheDocument()
    expect(within(offeringsTable).getByText('95.0%')).toBeInTheDocument()
    expect(within(offeringsTable).getByText('—')).toBeInTheDocument()
    expect(screen.getByText('domain · 1')).toBeInTheDocument()
  })

  it('navigates from mission-control actions to resource, settlement, and api key pages', async () => {
    mockedGetSupplierResourcesOverview.mockResolvedValue({ domains: [], accounts: [], mailboxes: [] })
    mockedGetSupplierOfferings.mockResolvedValue({ items: [] })
    const user = userEvent.setup()

    let view = renderSupplierOfferingsPage()
    expect(await screen.findByRole('heading', { name: '供货规则编排中枢' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /查看供应商资源/ }))
    expect(await screen.findByTestId('supplier-offerings-route-stub-resources')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '供应商资源' })).toBeInTheDocument()

    view.unmount()
    view = renderSupplierOfferingsPage()
    expect(await screen.findByRole('heading', { name: '供货规则编排中枢' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /打开供应商结算/ }))
    expect(await screen.findByTestId('supplier-offerings-route-stub-settlements')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '供应商结算' })).toBeInTheDocument()

    view.unmount()
    view = renderSupplierOfferingsPage()
    expect(await screen.findByRole('heading', { name: '供货规则编排中枢' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /打开 API Keys/ }))
    expect(await screen.findByTestId('supplier-offerings-route-stub-api-keys')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()
  })

  it('suppresses hidden shared-console bridge actions and falls back to the preferred workspace when integration routes are absent from the menu', async () => {
    mockedGetSupplierResourcesOverview.mockResolvedValue({ domains: [], accounts: [], mailboxes: [] })
    mockedGetSupplierOfferings.mockResolvedValue({ items: [] })
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 7, email: 'supplier@nexus.test', role: 'supplier', created_at: '' },
      menu: [
        { label: '仪表盘', path: DASHBOARD_ROUTE },
        { label: '供应商资源', path: SUPPLIER_RESOURCES_ROUTE },
        { label: '供货规则', path: SUPPLIER_OFFERINGS_ROUTE },
      ],
    })
    const user = userEvent.setup()

    renderSupplierOfferingsPage()
    expect(await screen.findByRole('heading', { name: '供货规则编排中枢' })).toBeInTheDocument()

    const bridge = screen.getByTestId('supplier-offerings-shared-console-bridge')
    expect(within(bridge).queryByRole('button', { name: `API Keys · ${API_KEYS_ROUTE}` })).not.toBeInTheDocument()
    expect(within(bridge).queryByRole('button', { name: `Webhook 设置 · ${WEBHOOKS_ROUTE}` })).not.toBeInTheDocument()
    expect(within(bridge).queryByRole('button', { name: `API 文档 · ${DOCS_ROUTE}` })).not.toBeInTheDocument()

    const fallback = screen.getByTestId('supplier-offerings-shared-console-fallback')
    expect(fallback).toBeInTheDocument()
    expect(within(fallback).getByText('当前接入入口暂未由服务端暴露时，先回到推荐工作台继续共享控制台中的供应商主链路。')).toBeInTheDocument()
    expect(within(fallback).getByTestId('supplier-offerings-shared-console-fallback-button')).toBeInTheDocument()
    await user.click(screen.getByTestId('supplier-offerings-shared-console-fallback-button'))
    expect(await screen.findByTestId('supplier-offerings-route-stub-shared-home')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '控制台总览' })).toBeInTheDocument()
  })

  it('shows a mission fallback card and returns to dashboard when no supplier follow-up routes remain', async () => {
    mockedGetSupplierResourcesOverview.mockResolvedValue({ domains: [], accounts: [], mailboxes: [] })
    mockedGetSupplierOfferings.mockResolvedValue({ items: [] })
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 7, email: 'supplier@nexus.test', role: 'supplier', created_at: '' },
      menu: [
        { label: '仪表盘', path: DASHBOARD_ROUTE },
        { label: '供货规则', path: SUPPLIER_OFFERINGS_ROUTE },
      ],
    })
    const user = userEvent.setup()

    renderSupplierOfferingsPage()
    expect(await screen.findByRole('heading', { name: '供货规则编排中枢' })).toBeInTheDocument()

    const missionFlow = screen.getByTestId('supplier-offerings-mission-flow')
    expect(within(missionFlow).queryByRole('button', { name: /查看供应商资源/ })).not.toBeInTheDocument()
    expect(within(missionFlow).queryByRole('button', { name: /打开供应商结算/ })).not.toBeInTheDocument()
    expect(within(missionFlow).queryByRole('button', { name: /打开 API Keys/ })).not.toBeInTheDocument()

    const fallbackCard = screen.getByTestId('supplier-offerings-mission-fallback')
    expect(within(fallbackCard).getByRole('heading', { name: '返回推荐工作台' })).toBeInTheDocument()
    expect(within(fallbackCard).getByText('当服务端暂未暴露资源、结算与接入入口时，先回到推荐工作台继续共享控制台中的供应商主链路。')).toBeInTheDocument()

    await user.click(within(fallbackCard).getByTestId('supplier-offerings-mission-fallback-button'))
    expect(await screen.findByTestId('supplier-offerings-route-stub-shared-home')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '控制台总览' })).toBeInTheDocument()
  })

  it('submits create offering form and reloads data', async () => {
    mockedGetSupplierResourcesOverview.mockResolvedValue({
      domains: [{ id: 11, name: 'mail.nexus.test', region: 'global', status: 'active', catch_all: true }],
      accounts: [],
      mailboxes: [],
    })
    mockedGetSupplierOfferings
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce({
        items: [
          {
            id: 9,
            project_key: 'discord',
            project_name: 'Discord',
            domain_name: 'mail.nexus.test',
            price: 199,
            stock: 12,
            success_rate: 0.95,
            priority: 10,
            source_type: 'domain',
            protocol_mode: 'imap_pull',
          },
        ],
      })
    mockedSaveSupplierOffering.mockResolvedValue({ item: { id: 9 } })

    const user = userEvent.setup()
    renderSupplierOfferingsPage()

    const projectField = await screen.findByLabelText('项目键')
    await user.type(projectField, 'discord')
    expect(screen.getByDisplayValue('discord')).toBeInTheDocument()
    await user.click(screen.getByRole('combobox', { name: '域名池' }))
    await user.click(await screen.findByText('mail.nexus.test (#11)'))
    await user.clear(screen.getByRole('spinbutton', { name: '售价（分）' }))
    await user.type(screen.getByRole('spinbutton', { name: '售价（分）' }), '199')
    await user.clear(screen.getByRole('spinbutton', { name: '预估成功率' }))
    await user.type(screen.getByRole('spinbutton', { name: '预估成功率' }), '0.95')
    await user.clear(screen.getByRole('spinbutton', { name: '分配优先级' }))
    await user.type(screen.getByRole('spinbutton', { name: '分配优先级' }), '10')
    await user.type(screen.getByPlaceholderText('imap_pull / pop3_pull，可留空'), 'imap_pull')
    await user.click(screen.getByRole('button', { name: '保存供货规则' }))

    await waitFor(() => expect(screen.getByText('请选择域名池')).toBeInTheDocument())
  })

  it('shows error toast when loading fails', async () => {
    mockedGetSupplierResourcesOverview.mockRejectedValue({ response: { data: { error: '供应商资源加载失败' } } })
    mockedGetSupplierOfferings.mockResolvedValue({ items: [] })

    renderSupplierOfferingsPage()

    await waitFor(() => expect(mockedError).toHaveBeenCalledWith('供应商资源加载失败'))
  })
})
