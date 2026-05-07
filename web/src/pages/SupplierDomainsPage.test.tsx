import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import '@testing-library/jest-dom'
import { SupplierDomainsPage } from './SupplierDomainsPage'
import * as activationService from '../services/activation'
import { useAuthStore } from '../store/authStore'
import {
  API_KEYS_ROUTE,
  DASHBOARD_ROUTE,
  DOCS_ROUTE,
  SUPPLIER_DOMAINS_ROUTE,
  SUPPLIER_OFFERINGS_ROUTE,
  SUPPLIER_RESOURCES_ROUTE,
  SUPPLIER_SETTLEMENTS_ROUTE,
  WEBHOOKS_ROUTE,
} from '../utils/consoleNavigation'
import { Toast } from '@douyinfe/semi-ui'

vi.mock('../services/activation', () => ({
  getSupplierResourcesOverview: vi.fn(),
  createSupplierDomain: vi.fn(),
}))

vi.mock('@douyinfe/semi-ui', async () => {
  const actual = await vi.importActual<typeof import('@douyinfe/semi-ui')>('@douyinfe/semi-ui')
  return {
    ...actual,
    Toast: {
      success: vi.fn(),
      error: vi.fn(),
    },
  }
})

const mockedGetSupplierResourcesOverview = vi.mocked(activationService.getSupplierResourcesOverview)
const mockedCreateSupplierDomain = vi.mocked(activationService.createSupplierDomain)
const mockedSuccess = vi.mocked(Toast.success)
const mockedError = vi.mocked(Toast.error)

function seedSupplierMenu(paths: string[]) {
  useAuthStore.setState({
    token: 'token',
    refreshToken: 'refresh-token',
    user: { id: 1, email: 'supplier@nexus-mail.local', role: 'supplier' },
    menu: paths.map((path) => ({ key: path, label: path, path })),
  })
}

function renderSupplierDomainsPage(initialEntry = SUPPLIER_DOMAINS_ROUTE) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path={SUPPLIER_DOMAINS_ROUTE} element={<SupplierDomainsPage />} />
        <Route
          path={SUPPLIER_RESOURCES_ROUTE}
          element={(
            <section data-testid="supplier-domains-route-stub-resources">
              <h1>供应商资源</h1>
            </section>
          )}
        />
        <Route
          path={SUPPLIER_OFFERINGS_ROUTE}
          element={(
            <section data-testid="supplier-domains-route-stub-offerings">
              <h1>供货规则编排中枢</h1>
            </section>
          )}
        />
        <Route
          path={SUPPLIER_SETTLEMENTS_ROUTE}
          element={(
            <section data-testid="supplier-domains-route-stub-settlements">
              <h1>供应商资金与争议指挥台</h1>
            </section>
          )}
        />
        <Route
          path={API_KEYS_ROUTE}
          element={(
            <section data-testid="supplier-domains-route-stub-api-keys">
              <h1>开发者 API 接入工作台</h1>
            </section>
          )}
        />
        <Route
          path={WEBHOOKS_ROUTE}
          element={(
            <section data-testid="supplier-domains-route-stub-webhooks">
              <h1>Webhook 设置</h1>
            </section>
          )}
        />
        <Route
          path={DOCS_ROUTE}
          element={(
            <section data-testid="supplier-domains-route-stub-docs">
              <h1>API 文档</h1>
            </section>
          )}
        />
        <Route
          path={DASHBOARD_ROUTE}
          element={(
            <section data-testid="supplier-domains-route-stub-shared-home">
              <h1>控制台总览</h1>
            </section>
          )}
        />
      </Routes>
    </MemoryRouter>,
  )
}

function getDomainTableRow(domainName: string) {
  const tableCard = screen.getByTestId('supplier-domains-table-card')
  const cell = within(tableCard).getByText(domainName)
  const row = cell.closest('tr') ?? cell.closest('[role="row"]')
  expect(row).not.toBeNull()
  return row as HTMLElement
}

async function expectMetricCard(testId: string, title: string, value: string, description: string) {
  const card = screen.getByTestId(testId)
  expect(within(card).getByText(title)).toBeInTheDocument()
  expect(await within(card).findByRole('heading', { name: value })).toBeInTheDocument()
  expect(within(card).getByText(description)).toBeInTheDocument()
}

describe('SupplierDomainsPage', () => {
  beforeEach(() => {
    seedSupplierMenu([
      DASHBOARD_ROUTE,
      SUPPLIER_DOMAINS_ROUTE,
      SUPPLIER_RESOURCES_ROUTE,
      SUPPLIER_OFFERINGS_ROUTE,
      SUPPLIER_SETTLEMENTS_ROUTE,
      API_KEYS_ROUTE,
      WEBHOOKS_ROUTE,
      DOCS_ROUTE,
    ])
    mockedGetSupplierResourcesOverview.mockReset()
    mockedCreateSupplierDomain.mockReset()
    mockedSuccess.mockReset()
    mockedError.mockReset()
    mockedGetSupplierResourcesOverview.mockResolvedValue({
      domains: [
        { id: 1, name: 'mail-1.nexus.test', region: 'hk', status: 'active', catch_all: true },
        { id: 2, name: 'mail-2.nexus.test', region: 'us', status: 'inactive', catch_all: false },
        { id: 3, name: 'mail-3.nexus.test', region: 'global', status: 'active', catch_all: true },
        { id: 4, name: 'mail-4.nexus.test', region: 'eu', status: 'inactive', catch_all: false },
      ],
      accounts: [],
      mailboxes: [],
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })
  })

  it('renders supplier domain heading, scoped overview metrics, mission flow, and shared-console bridge actions', async () => {
    renderSupplierDomainsPage()

    expect(await screen.findByRole('heading', { name: '域名池运营中枢' })).toBeInTheDocument()
    const heroCard = screen.getByTestId('supplier-domains-hero-card')
    expect(within(heroCard).getByText('域名运营中枢')).toBeInTheDocument()

    const missionSection = screen.getByTestId('supplier-domains-mission-section')
    expect(within(missionSection).getByRole('heading', { name: '供应商主任务流' })).toBeInTheDocument()
    const missionFlow = screen.getByTestId('supplier-domains-mission-flow')
    expect(within(missionFlow).getByRole('button', { name: /查看供应商资源/ })).toBeInTheDocument()
    expect(within(missionFlow).getByRole('button', { name: /继续维护供货规则/ })).toBeInTheDocument()

    const capabilityMatrix = screen.getByTestId('supplier-domains-capability-matrix')
    expect(within(capabilityMatrix).getByRole('heading', { name: '控制台能力矩阵' })).toBeInTheDocument()
    expect(within(capabilityMatrix).getByText('单一供应商工作台')).toBeInTheDocument()
    expect(within(capabilityMatrix).getByText('域名 readiness 优先')).toBeInTheDocument()
    expect(within(capabilityMatrix).getByText('角色扩展但不伪造升级')).toBeInTheDocument()

    await expectMetricCard('supplier-domains-metric-total', '域名总数', '4', '当前供应商域名池记录。')
    await expectMetricCard('supplier-domains-metric-active', 'Active 域名', '2', '可继续参与供货编排的域名数量。')
    await expectMetricCard('supplier-domains-metric-catch-all', 'Catch-All 已开启', '2', '支持泛收件的域名数量。')
    await expectMetricCard('supplier-domains-metric-regions', '覆盖区域', '4', '去重后的 region 数量。')

    const bridge = screen.getByTestId('supplier-domains-shared-console-bridge')
    expect(within(bridge).getByRole('button', { name: `打开 API Keys · ${API_KEYS_ROUTE}` })).toBeInTheDocument()
    expect(within(bridge).getByRole('button', { name: `打开 Webhook 设置 · ${WEBHOOKS_ROUTE}` })).toBeInTheDocument()
    expect(within(bridge).getByRole('button', { name: `打开 API 文档 · ${DOCS_ROUTE}` })).toBeInTheDocument()

    const regionMetrics = screen.getByTestId('supplier-domains-region-metrics')
    expect(within(regionMetrics).getByText('hk · 1')).toBeInTheDocument()
    expect(within(regionMetrics).getByText('us · 1')).toBeInTheDocument()
    expect(within(regionMetrics).getByText('global · 1')).toBeInTheDocument()
    expect(within(regionMetrics).getByText('eu · 1')).toBeInTheDocument()

    expect(screen.getByText('mail-1.nexus.test')).toBeInTheDocument()
    expect(screen.getByText('mail-4.nexus.test')).toBeInTheDocument()
    const catchAllEnabledRows = [getDomainTableRow('mail-1.nexus.test'), getDomainTableRow('mail-3.nexus.test')]
    const catchAllDisabledRows = [getDomainTableRow('mail-2.nexus.test'), getDomainTableRow('mail-4.nexus.test')]
    catchAllEnabledRows.forEach((row) => {
      expect(within(row).getByText('已开启')).toBeInTheDocument()
    })
    catchAllDisabledRows.forEach((row) => {
      expect(within(row).getByText('未开启')).toBeInTheDocument()
    })
  })

  it('navigates from mission-control actions to resource, offering, api key, and settlement pages', async () => {
    mockedGetSupplierResourcesOverview.mockResolvedValue({ domains: [], accounts: [], mailboxes: [] })
    const user = userEvent.setup()

    let view = renderSupplierDomainsPage()
    expect(await screen.findByRole('heading', { name: '域名池运营中枢' })).toBeInTheDocument()

    const missionFlow = screen.getByTestId('supplier-domains-mission-flow')
    await user.click(within(missionFlow).getByRole('button', { name: /查看供应商资源/ }))
    expect(await screen.findByTestId('supplier-domains-route-stub-resources')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '供应商资源' })).toBeInTheDocument()

    view.unmount()
    view = renderSupplierDomainsPage()
    expect(await screen.findByRole('heading', { name: '域名池运营中枢' })).toBeInTheDocument()
    await user.click(within(screen.getByTestId('supplier-domains-mission-flow')).getByRole('button', { name: /继续维护供货规则/ }))
    expect(await screen.findByTestId('supplier-domains-route-stub-offerings')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '供货规则编排中枢' })).toBeInTheDocument()

    view.unmount()
    view = renderSupplierDomainsPage()
    expect(await screen.findByRole('heading', { name: '域名池运营中枢' })).toBeInTheDocument()
    const bridge = screen.getByTestId('supplier-domains-shared-console-bridge')
    await user.click(within(bridge).getByRole('button', { name: `打开 API Keys · ${API_KEYS_ROUTE}` }))
    expect(await screen.findByTestId('supplier-domains-route-stub-api-keys')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()

    view.unmount()
    view = renderSupplierDomainsPage()
    expect(await screen.findByRole('heading', { name: '域名池运营中枢' })).toBeInTheDocument()
    await user.click(within(screen.getByTestId('supplier-domains-shared-console-bridge')).getByRole('button', { name: `打开 供应商结算 · ${SUPPLIER_SETTLEMENTS_ROUTE}` }))
    expect(await screen.findByTestId('supplier-domains-route-stub-settlements')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '供应商资金与争议指挥台' })).toBeInTheDocument()
  })

  it('suppresses unavailable supplier and shared-console CTAs, then falls back to dashboard', async () => {
    mockedGetSupplierResourcesOverview.mockResolvedValue({ domains: [], accounts: [], mailboxes: [] })
    seedSupplierMenu([DASHBOARD_ROUTE, SUPPLIER_DOMAINS_ROUTE])
    const user = userEvent.setup()

    let view = renderSupplierDomainsPage()

    expect(await screen.findByRole('heading', { name: '域名池运营中枢' })).toBeInTheDocument()
    const missionFlow = screen.getByTestId('supplier-domains-mission-flow')
    expect(within(missionFlow).queryByRole('button', { name: '查看供应商资源' })).not.toBeInTheDocument()
    expect(within(missionFlow).queryByRole('button', { name: '继续维护供货规则' })).not.toBeInTheDocument()
    expect(within(missionFlow).queryByRole('button', { name: /留在域名管理/ })).not.toBeInTheDocument()

    const missionFallback = screen.getByTestId('supplier-domains-mission-fallback')
    await user.click(within(missionFallback).getByRole('button', { name: /返回推荐工作台/ }))
    expect(await screen.findByTestId('supplier-domains-route-stub-shared-home')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '控制台总览' })).toBeInTheDocument()

    view.unmount()
    view = renderSupplierDomainsPage()
    expect(await screen.findByRole('heading', { name: '域名池运营中枢' })).toBeInTheDocument()
    const bridge = screen.getByTestId('supplier-domains-shared-console-bridge')
    expect(within(bridge).queryByRole('button', { name: `打开 API Keys · ${API_KEYS_ROUTE}` })).not.toBeInTheDocument()
    expect(within(bridge).queryByRole('button', { name: `打开 Webhook 设置 · ${WEBHOOKS_ROUTE}` })).not.toBeInTheDocument()
    expect(within(bridge).queryByRole('button', { name: `打开 API 文档 · ${DOCS_ROUTE}` })).not.toBeInTheDocument()
    expect(within(bridge).queryByRole('button', { name: `打开 供应商结算 · ${SUPPLIER_SETTLEMENTS_ROUTE}` })).not.toBeInTheDocument()

    const fallback = screen.getByTestId('supplier-domains-shared-console-fallback')
    await user.click(within(fallback).getByRole('button', { name: /返回推荐工作台/ }))
    expect(await screen.findByTestId('supplier-domains-route-stub-shared-home')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '控制台总览' })).toBeInTheDocument()
  })

  it('shows explicit overview failure state instead of empty-state copy when overview loading fails', async () => {
    mockedGetSupplierResourcesOverview.mockRejectedValue({ response: { data: { error: 'overview failed' } } })

    renderSupplierDomainsPage()

    await waitFor(() => expect(mockedError).toHaveBeenCalledWith('overview failed'))
    expect(await screen.findByText('overview failed，请先恢复真实 /supplier/resources/overview 后再继续域名运营。')).toBeInTheDocument()
    const tableCard = screen.getByTestId('supplier-domains-table-card')
    expect(within(tableCard).queryByText('当前暂无域名池记录，请稍后再试。')).not.toBeInTheDocument()
    const metricsRegion = screen.getByTestId('supplier-domains-region-metrics')
    expect(within(metricsRegion).getByText('域名池加载失败时暂停显示区域统计，请先恢复上游概览接口。')).toBeInTheDocument()
    expect(within(metricsRegion).queryByText('暂无可统计区域。')).not.toBeInTheDocument()
  })

  it('hides fallback when current page is the only visible supplier workspace', async () => {
    mockedGetSupplierResourcesOverview.mockResolvedValue({ domains: [], accounts: [], mailboxes: [] })
    seedSupplierMenu([SUPPLIER_DOMAINS_ROUTE])

    renderSupplierDomainsPage()

    expect(await screen.findByRole('heading', { name: '域名池运营中枢' })).toBeInTheDocument()
    expect(screen.queryByTestId('supplier-domains-mission-fallback')).not.toBeInTheDocument()
    expect(screen.queryByTestId('supplier-domains-shared-console-fallback')).not.toBeInTheDocument()
  })

  it('submits create domain form and reloads data', async () => {
    mockedGetSupplierResourcesOverview
      .mockResolvedValueOnce({ domains: [], accounts: [], mailboxes: [] })
      .mockResolvedValueOnce({
        domains: [{ id: 2, name: 'otp.nexus.test', region: 'hk', status: 'active', catch_all: true }],
        accounts: [],
        mailboxes: [],
      })
    mockedCreateSupplierDomain.mockResolvedValue({
      domain: { id: 2, name: 'otp.nexus.test', region: 'hk', status: 'active', catch_all: true },
    })

    const user = userEvent.setup()
    renderSupplierDomainsPage()

    const nameInput = await screen.findByPlaceholderText('mail.nexus.example')
    await user.type(nameInput, 'otp.nexus.test')
    await user.clear(screen.getByPlaceholderText('global / hk / us'))
    await user.type(screen.getByPlaceholderText('global / hk / us'), 'hk')
    await user.click(screen.getByRole('button', { name: '保存域名' }))

    await waitFor(() =>
      expect(mockedCreateSupplierDomain).toHaveBeenCalledWith({
        name: 'otp.nexus.test',
        region: 'hk',
        catch_all: true,
        status: 'active',
      }),
    )
    expect(mockedSuccess).toHaveBeenCalledWith('域名池已新增')
    expect(await screen.findByText('otp.nexus.test')).toBeInTheDocument()
  })

  it('normalizes blank region to global on submit', async () => {
    mockedGetSupplierResourcesOverview.mockResolvedValue({ domains: [], accounts: [], mailboxes: [] })
    mockedCreateSupplierDomain.mockResolvedValue({
      domain: { id: 5, name: 'fallback-region.nexus.test', region: 'global', status: 'active', catch_all: true },
    })
    const user = userEvent.setup()

    renderSupplierDomainsPage()

    await user.type(await screen.findByPlaceholderText('mail.nexus.example'), 'fallback-region.nexus.test')
    await user.click(screen.getByRole('button', { name: '保存域名' }))

    await waitFor(() =>
      expect(mockedCreateSupplierDomain).toHaveBeenCalledWith({
        name: 'fallback-region.nexus.test',
        region: 'global',
        catch_all: true,
        status: 'active',
      }),
    )
  })
})
