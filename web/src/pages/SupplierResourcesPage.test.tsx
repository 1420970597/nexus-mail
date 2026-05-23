import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import '@testing-library/jest-dom'
import { SupplierResourcesPage } from './SupplierResourcesPage'
import * as activationService from '../services/activation'
import {
  API_KEYS_ROUTE,
  WEBHOOKS_ROUTE,
  DOCS_ROUTE,
  SUPPLIER_DOMAINS_ROUTE,
  SUPPLIER_OFFERINGS_ROUTE,
  SUPPLIER_RESOURCES_ROUTE,
  SUPPLIER_SETTLEMENTS_ROUTE,
  DASHBOARD_ROUTE,
} from '../utils/consoleNavigation'
import { useAuthStore } from '../store/authStore'

vi.mock('../services/activation', async () => {
  const actual = await vi.importActual<typeof import('../services/activation')>('../services/activation')
  return {
    ...actual,
    getSupplierResourcesOverview: vi.fn(),
    createSupplierDomain: vi.fn(),
    createSupplierAccount: vi.fn(),
    createSupplierMailbox: vi.fn(),
  }
})

const mockedGetSupplierResourcesOverview = vi.mocked(activationService.getSupplierResourcesOverview)
const mockedCreateSupplierDomain = vi.mocked(activationService.createSupplierDomain)
const mockedCreateSupplierAccount = vi.mocked(activationService.createSupplierAccount)
const mockedCreateSupplierMailbox = vi.mocked(activationService.createSupplierMailbox)

function seedOverview() {
  mockedGetSupplierResourcesOverview.mockResolvedValue({
    domains: [
      { id: 1, name: 'mail.nexus.test', region: 'global', status: 'active', catch_all: true },
      { id: 2, name: 'hk-mail.nexus.test', region: 'hk', status: 'inactive', catch_all: false },
    ],
    mailboxes: [
      { id: 11, address: 'agent-001@mail.nexus.test', source_type: 'self_hosted_domain', status: 'available', project_key: 'openai', provider: '' },
    ],
    accounts: [
      {
        id: 21,
        provider: 'gmail',
        source_type: 'public_mailbox_account',
        auth_mode: 'oauth2',
        protocol_mode: 'imap_pull',
        identifier: 'supplier@example.com',
        status: 'active',
        health_status: 'healthy',
        bridge_endpoint: '',
      },
    ],
  })
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[SUPPLIER_RESOURCES_ROUTE]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path={SUPPLIER_RESOURCES_ROUTE} element={<SupplierResourcesPage />} />
        <Route
          path={SUPPLIER_DOMAINS_ROUTE}
          element={(
            <section data-testid="supplier-resources-route-stub-domains" role="region" aria-label="共享控制台 - 域名池运营中枢">
              <h1>域名池运营中枢</h1>
            </section>
          )}
        />
        <Route
          path={SUPPLIER_OFFERINGS_ROUTE}
          element={(
            <section data-testid="supplier-resources-route-stub-offerings" role="region" aria-label="共享控制台 - 供货规则编排中枢">
              <h1>供货规则编排中枢</h1>
            </section>
          )}
        />
        <Route
          path={SUPPLIER_SETTLEMENTS_ROUTE}
          element={(
            <section data-testid="supplier-resources-route-stub-settlements" role="region" aria-label="共享控制台 - 供应商资金与争议指挥台">
              <h1>供应商资金与争议指挥台</h1>
            </section>
          )}
        />
        <Route
          path={API_KEYS_ROUTE}
          element={(
            <section data-testid="supplier-resources-route-stub-api-keys" role="region" aria-label="共享控制台 - API Keys">
              <h1>开发者 API 接入工作台</h1>
            </section>
          )}
        />
        <Route
          path={WEBHOOKS_ROUTE}
          element={(
            <section data-testid="supplier-resources-route-stub-webhooks" role="region" aria-label="共享控制台 - Webhooks">
              <h1>供给事件回调工作台</h1>
            </section>
          )}
        />
        <Route
          path={DOCS_ROUTE}
          element={(
            <section data-testid="supplier-resources-route-stub-docs" role="region" aria-label="共享控制台 - API 文档">
              <h1>API 文档与接入控制台</h1>
            </section>
          )}
        />
        <Route
          path={DASHBOARD_ROUTE}
          element={(
            <section data-testid="supplier-resources-route-stub-shared-home" role="region" aria-label="共享控制台首页">
              <h1>控制台总览</h1>
            </section>
          )}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SupplierResourcesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 7, email: 'supplier@nexus.test', role: 'supplier', created_at: '' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: DASHBOARD_ROUTE },
        { key: 'supplier-resources', label: '供应商资源', path: SUPPLIER_RESOURCES_ROUTE },
        { key: 'supplier-domains', label: '域名管理', path: SUPPLIER_DOMAINS_ROUTE },
        { key: 'supplier-offerings', label: '供货规则', path: SUPPLIER_OFFERINGS_ROUTE },
        { key: 'supplier-settlements', label: '供应商结算', path: SUPPLIER_SETTLEMENTS_ROUTE },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
        { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
        { key: 'docs', label: 'API 文档', path: DOCS_ROUTE },
      ],
    })
    seedOverview()
    mockedCreateSupplierDomain.mockResolvedValue({
      domain: { id: 3, name: 'new-mail.nexus.test', region: 'us', status: 'active', catch_all: true },
    })
    mockedCreateSupplierAccount.mockResolvedValue({
      account: {
        id: 22,
        provider: 'outlook',
        source_type: 'public_mailbox_account',
        auth_mode: 'oauth2',
        protocol_mode: 'imap_pull',
        identifier: 'ops@example.com',
        status: 'active',
      },
    })
    mockedCreateSupplierMailbox.mockResolvedValue({
      mailbox: {
        id: 12,
        address: 'agent-002@mail.nexus.test',
        source_type: 'self_hosted_domain',
        status: 'available',
        project_key: 'discord',
        provider: '',
      },
    })
  })

  it('renders the supplier resource mission control shell and shared-console bridge guidance', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: '供应商资源' })).toBeInTheDocument()
    const heroCard = screen.getByRole('region', { name: '供应商资源' })
    expect(within(heroCard).getByText('资源运营中枢')).toBeInTheDocument()
    const missionFlow = screen.getByRole('region', { name: '供应商任务流' })
    expect(within(missionFlow).getByRole('heading', { name: '先维护域名池与 Catch-All' })).toBeInTheDocument()
    expect(within(missionFlow).getByRole('heading', { name: '继续收敛供货规则' })).toBeInTheDocument()
    expect(within(missionFlow).getByRole('heading', { name: '最后观察结算与争议' })).toBeInTheDocument()
    const sharedConsoleBridge = screen.getByRole('region', { name: '共享接入桥接' })
    expect(sharedConsoleBridge).toHaveAttribute('aria-labelledby', 'supplier-resources-shared-console-bridge-heading')
    expect(within(sharedConsoleBridge).getByRole('heading', { name: '共享接入桥接' })).toBeInTheDocument()
    expect(within(sharedConsoleBridge).getByText('资源准备、接入核对与文档回放继续留在同一套供应商共享控制台里，不拆成第二套后台。')).toBeInTheDocument()
    const capabilityMatrix = screen.getByRole('region', { name: '控制台能力矩阵' })
    expect(capabilityMatrix).toHaveAttribute('aria-labelledby', 'supplier-resources-capability-matrix-heading')
    expect(within(capabilityMatrix).getByRole('heading', { name: '控制台能力矩阵' })).toBeInTheDocument()
    expect(within(capabilityMatrix).getByText('统一资源入口')).toBeInTheDocument()
    expect(within(capabilityMatrix).getByText('共享接入桥接')).toBeInTheDocument()
    expect(within(capabilityMatrix).getByText('服务端菜单扩展')).toBeInTheDocument()
    expect(within(capabilityMatrix).getByText('域名池、账号健康与共享接入入口继续由同一登录后的菜单真值驱动。')).toBeInTheDocument()
    expect(within(sharedConsoleBridge).getByRole('button', { name: /打开 API Keys/ })).toBeInTheDocument()
    expect(within(sharedConsoleBridge).getByRole('button', { name: /继续配置 Webhook/ })).toBeInTheDocument()
    expect(within(sharedConsoleBridge).getByRole('button', { name: /查看 API 文档/ })).toBeInTheDocument()

    const healthyAccountsMetric = screen.getByTestId('supplier-resources-metric-healthy-accounts')
    expect(within(healthyAccountsMetric).getByText('健康账号')).toBeInTheDocument()
    expect(within(healthyAccountsMetric).getByText('1')).toBeInTheDocument()

    const availableMailboxesMetric = screen.getByTestId('supplier-resources-metric-available-mailboxes')
    expect(within(availableMailboxesMetric).getByText('可用邮箱池')).toBeInTheDocument()
    expect(within(availableMailboxesMetric).getByText('1')).toBeInTheDocument()
  })

  it('promotes the shared bridge and capability matrix cards themselves into named regions', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: '供应商资源' })).toBeInTheDocument()

    const sharedConsoleBridge = screen.getByRole('region', { name: '共享接入桥接' })
    expect(sharedConsoleBridge).toHaveAttribute('aria-labelledby', 'supplier-resources-shared-console-bridge-heading')
    expect(within(sharedConsoleBridge).getByRole('heading', { name: '共享接入桥接' })).toHaveAttribute(
      'id',
      'supplier-resources-shared-console-bridge-heading',
    )

    const capabilityMatrix = screen.getByRole('region', { name: '控制台能力矩阵' })
    expect(capabilityMatrix).toHaveAttribute('aria-labelledby', 'supplier-resources-capability-matrix-heading')
    expect(within(capabilityMatrix).getByRole('heading', { name: '控制台能力矩阵' })).toHaveAttribute(
      'id',
      'supplier-resources-capability-matrix-heading',
    )
  })

  it('shows loaded resource summaries and records from the real overview payload', async () => {
    renderPage()

    const domainsTable = await screen.findByTestId('supplier-resources-domains-table-card')
    expect(within(domainsTable).getByText('mail.nexus.test')).toBeInTheDocument()
    expect(within(domainsTable).getByText('global')).toBeInTheDocument()
    expect(within(domainsTable).getByText('已开启')).toBeInTheDocument()

    const accountsTable = screen.getByTestId('supplier-resources-accounts-table-card')
    expect(within(accountsTable).getByText('gmail')).toBeInTheDocument()
    expect(within(accountsTable).getByText('healthy')).toBeInTheDocument()

    const mailboxesTable = screen.getByTestId('supplier-resources-mailboxes-table-card')
    expect(within(mailboxesTable).getByText('agent-001@mail.nexus.test')).toBeInTheDocument()
  })

  it('renders the resource preparation workbench with dark shared-console setup stages', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: '供应商资源' })).toBeInTheDocument()

    const setupWorkbench = screen.getByTestId('supplier-resources-setup-workbench')
    const setupScope = within(setupWorkbench)
    expect(setupScope.getByRole('heading', { name: '资源准备工作台' })).toBeInTheDocument()
    expect(setupScope.getByText('保持域名、账号与邮箱池录入留在同一套供应商共享控制台中，再继续供货规则与结算链路。')).toBeInTheDocument()
    expect(setupScope.getByText('STEP 01')).toBeInTheDocument()
    expect(setupScope.getByRole('heading', { name: '域名池录入' })).toBeInTheDocument()
    expect(setupScope.getByText('STEP 02')).toBeInTheDocument()
    expect(setupScope.getByRole('heading', { name: '第三方账号接入' })).toBeInTheDocument()
    expect(setupScope.getByText('STEP 03')).toBeInTheDocument()
    expect(setupScope.getByRole('heading', { name: '邮箱池映射' })).toBeInTheDocument()
    expect(setupScope.queryByText('新增域名池')).not.toBeInTheDocument()
    expect(setupScope.queryByText('新增第三方邮箱账号')).not.toBeInTheDocument()
    expect(setupScope.queryByText('新增邮箱池 / 别名池')).not.toBeInTheDocument()
  })

  it('renders the three resource save actions for supplier workflows', async () => {
    renderPage()

    await screen.findByRole('heading', { name: '供应商资源' })

    expect(screen.getByRole('button', { name: '保存域名' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '保存账号' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '保存邮箱' })).toBeInTheDocument()
  })

  it('keeps mission-control navigation inside local named route-stub regions', async () => {
    const user = userEvent.setup()

    let view = renderPage()
    expect(await screen.findByRole('heading', { name: '供应商资源' })).toBeInTheDocument()

    const missionFlow = screen.getByRole('region', { name: '供应商任务流' })
    await user.click(within(missionFlow).getByRole('button', { name: /前往域名管理/ }))
    const domainsRegion = await screen.findByRole('region', { name: '共享控制台 - 域名池运营中枢' })
    expect(within(domainsRegion).getByRole('heading', { name: '域名池运营中枢' })).toBeInTheDocument()

    view.unmount()
    view = renderPage()
    expect(await screen.findByRole('heading', { name: '供应商资源' })).toBeInTheDocument()
    const refreshedMissionFlow = screen.getByRole('region', { name: '供应商任务流' })
    await user.click(within(refreshedMissionFlow).getByRole('button', { name: /查看供货规则/ }))
    const offeringsRegion = await screen.findByRole('region', { name: '共享控制台 - 供货规则编排中枢' })
    expect(within(offeringsRegion).getByRole('heading', { name: '供货规则编排中枢' })).toBeInTheDocument()

    view.unmount()
    view = renderPage()
    expect(await screen.findByRole('heading', { name: '供应商资源' })).toBeInTheDocument()
    const finalMissionFlow = screen.getByRole('region', { name: '供应商任务流' })
    await user.click(within(finalMissionFlow).getByRole('button', { name: /打开供应商结算/ }))
    const settlementsRegion = await screen.findByRole('region', { name: '共享控制台 - 供应商资金与争议指挥台' })
    expect(within(settlementsRegion).getByRole('heading', { name: '供应商资金与争议指挥台' })).toBeInTheDocument()
  })

  it('keeps shared-console bridge navigation inside local named route-stub regions', async () => {
    const user = userEvent.setup()

    let view = renderPage()
    expect(await screen.findByRole('heading', { name: '供应商资源' })).toBeInTheDocument()

    let bridge = screen.getByRole('region', { name: '共享接入桥接' })
    await user.click(within(bridge).getByRole('button', { name: /打开 API Keys/ }))
    const apiKeysRegion = await screen.findByRole('region', { name: '共享控制台 - API Keys' })
    expect(within(apiKeysRegion).getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()

    view.unmount()
    view = renderPage()
    expect(await screen.findByRole('heading', { name: '供应商资源' })).toBeInTheDocument()
    bridge = screen.getByRole('region', { name: '共享接入桥接' })
    await user.click(within(bridge).getByRole('button', { name: /继续配置 Webhook/ }))
    const webhooksRegion = await screen.findByRole('region', { name: '共享控制台 - Webhooks' })
    expect(within(webhooksRegion).getByRole('heading', { name: '供给事件回调工作台' })).toBeInTheDocument()

    view.unmount()
    view = renderPage()
    expect(await screen.findByRole('heading', { name: '供应商资源' })).toBeInTheDocument()
    bridge = screen.getByRole('region', { name: '共享接入桥接' })
    await user.click(within(bridge).getByRole('button', { name: /查看 API 文档/ }))
    const docsRegion = await screen.findByRole('region', { name: '共享控制台 - API 文档' })
    expect(within(docsRegion).getByRole('heading', { name: 'API 文档与接入控制台' })).toBeInTheDocument()
  })

  it('suppresses unavailable supplier and shared-console CTAs then falls back via the preferred local named route stub', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 8, email: 'supplier@nexus.test', role: 'supplier', created_at: '' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: DASHBOARD_ROUTE },
        { key: 'supplier-resources', label: '供应商资源', path: SUPPLIER_RESOURCES_ROUTE },
      ],
    })

    renderPage()

    expect(await screen.findByRole('heading', { name: '供应商资源' })).toBeInTheDocument()
    const missionFlow = screen.getByRole('region', { name: '供应商任务流' })
    expect(within(missionFlow).queryByRole('button', { name: '前往域名管理' })).not.toBeInTheDocument()
    expect(within(missionFlow).queryByRole('button', { name: '查看供货规则' })).not.toBeInTheDocument()
    expect(within(missionFlow).queryByRole('button', { name: '打开供应商结算' })).not.toBeInTheDocument()
    const missionFallback = screen.getByRole('region', { name: '返回共享工作台继续供应商主链路' })
    expect(within(missionFallback).getByRole('heading', { name: '返回共享工作台继续供应商主链路' })).toBeInTheDocument()

    const bridge = screen.getByRole('region', { name: '共享接入桥接' })
    expect(within(bridge).queryByRole('button', { name: /打开 API Keys/ })).not.toBeInTheDocument()
    expect(within(bridge).queryByRole('button', { name: /继续配置 Webhook/ })).not.toBeInTheDocument()
    expect(within(bridge).queryByRole('button', { name: /查看 API 文档/ })).not.toBeInTheDocument()
    const sharedConsoleFallback = screen.getByRole('region', { name: '返回共享工作台' })
    expect(within(sharedConsoleFallback).getByRole('heading', { name: '返回共享工作台' })).toBeInTheDocument()
    expect(within(sharedConsoleFallback).getByText('当前共享接入入口暂未由服务端暴露时，先回到共享工作台继续供应商主链路，再根据后续授予的菜单继续完成接入配置。')).toBeInTheDocument()
    expect(within(sharedConsoleFallback).getByTestId('supplier-resources-shared-console-fallback-button')).toBeInTheDocument()

    await user.click(within(sharedConsoleFallback).getByTestId('supplier-resources-shared-console-fallback-button'))
    const sharedHomeRegion = await screen.findByRole('region', { name: '共享控制台首页' })
    expect(within(sharedHomeRegion).getByRole('heading', { name: '控制台总览' })).toBeInTheDocument()
  })

  it('hides shared-console fallback when at least one bridge route remains visible', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 10, email: 'supplier@nexus.test', role: 'supplier', created_at: '' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: DASHBOARD_ROUTE },
        { key: 'supplier-resources', label: '供应商资源', path: SUPPLIER_RESOURCES_ROUTE },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
      ],
    })

    renderPage()

    expect(await screen.findByRole('heading', { name: '供应商资源' })).toBeInTheDocument()
    const bridge = screen.getByRole('region', { name: '共享接入桥接' })
    expect(within(bridge).getByRole('button', { name: /打开 API Keys/ })).toBeInTheDocument()
    expect(within(bridge).queryByRole('button', { name: /继续配置 Webhook/ })).not.toBeInTheDocument()
    expect(within(bridge).queryByRole('button', { name: /查看 API 文档/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '返回共享工作台' })).not.toBeInTheDocument()
  })

  it('hides both fallback slices when supplier resources is the only visible supplier route', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 9, email: 'supplier@nexus.test', role: 'supplier', created_at: '' },
      menu: [{ key: 'supplier-resources', label: '供应商资源', path: SUPPLIER_RESOURCES_ROUTE }],
    })

    renderPage()

    expect(await screen.findByRole('heading', { name: '供应商资源' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '返回共享工作台继续供应商主链路' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '返回共享工作台' })).not.toBeInTheDocument()
  })

  it('keeps the shared-console fallback button scoped to the shared fallback region when supplier follow-up routes are absent', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 11, email: 'supplier@nexus.test', role: 'supplier', created_at: '' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: DASHBOARD_ROUTE },
        { key: 'supplier-resources', label: '供应商资源', path: SUPPLIER_RESOURCES_ROUTE },
      ],
    })

    renderPage()

    expect(await screen.findByRole('heading', { name: '供应商资源' })).toBeInTheDocument()

    const missionFallback = screen.getByRole('region', { name: '返回共享工作台继续供应商主链路' })
    expect(within(missionFallback).getByText('返回共享工作台继续供应商主链路')).toBeInTheDocument()
    expect(within(missionFallback).queryByRole('button', { name: '返回共享工作台' })).not.toBeInTheDocument()

    const sharedConsoleFallback = screen.getByRole('region', { name: '返回共享工作台' })
    expect(within(sharedConsoleFallback).getByText('当前共享接入入口暂未由服务端暴露时，先回到共享工作台继续供应商主链路，再根据后续授予的菜单继续完成接入配置。')).toBeInTheDocument()
    expect(within(sharedConsoleFallback).getByTestId('supplier-resources-shared-console-fallback-button')).toBeInTheDocument()

    await user.click(within(sharedConsoleFallback).getByTestId('supplier-resources-shared-console-fallback-button'))
    const sharedHomeRegion = await screen.findByRole('region', { name: '共享控制台首页' })
    expect(within(sharedHomeRegion).getByRole('heading', { name: '控制台总览' })).toBeInTheDocument()
  })

  it('renders Chinese runtime labels for account and mailbox forms plus the localized accounts column title', async () => {
    renderPage()

    await screen.findByRole('heading', { name: '供应商资源' })
    const setupWorkbench = screen.getByTestId('supplier-resources-setup-workbench')
    expect(within(setupWorkbench).getByRole('heading', { name: '第三方账号接入' })).toBeInTheDocument()
    expect(within(setupWorkbench).getByRole('heading', { name: '邮箱池映射' })).toBeInTheDocument()

    expect(screen.getByLabelText('服务商')).toBeInTheDocument()
    expect(screen.getByLabelText('刷新令牌')).toBeInTheDocument()
    expect(screen.getByLabelText('密钥引用')).toBeInTheDocument()
    expect(screen.getByLabelText('桥接端点')).toBeInTheDocument()
    expect(screen.getByLabelText('桥接标识')).toBeInTheDocument()
    expect(screen.getByLabelText('本地前缀')).toBeInTheDocument()

    expect(screen.getByPlaceholderText('OAuth2 必填，授权码/App Password 可留空')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('env://NEXUS_QQ_AUTH_CODE')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('127.0.0.1:1143')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('proton-bridge')).toBeInTheDocument()
    expect(screen.queryByLabelText('Provider')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Refresh Token')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Secret Ref')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Bridge Endpoint')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Bridge Label')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('local part')).not.toBeInTheDocument()

    const accountsTable = screen.getByTestId('supplier-resources-accounts-table-card')
    expect(within(accountsTable).getByText('服务商')).toBeInTheDocument()
    expect(within(accountsTable).queryByText('Provider')).not.toBeInTheDocument()
  })

  it('submits supplier domain, account, and mailbox actions then reloads overview data', async () => {
    const user = userEvent.setup()

    renderPage()

    expect(await screen.findByRole('heading', { name: '供应商资源' })).toBeInTheDocument()

    const domainNameInput = screen.getByPlaceholderText('mail.nexus.example')
    const regionInput = screen.getByPlaceholderText('global / hk / us')
    await user.click(domainNameInput)
    await user.paste('us-mail.nexus.test')
    await user.clear(regionInput)
    await user.click(regionInput)
    await user.paste('us')
    await user.click(screen.getByRole('button', { name: '保存域名' }))

    await waitFor(() =>
      expect(mockedCreateSupplierDomain).toHaveBeenCalledWith({
        name: 'us-mail.nexus.test',
        region: 'us',
        catch_all: true,
        status: 'active',
      }),
    )

    const providerInput = screen.getByPlaceholderText('outlook / gmail / qq / proton')
    const identifierInput = screen.getByPlaceholderText('supplier@example.com')
    await user.click(providerInput)
    await user.paste('outlook')
    await user.click(identifierInput)
    await user.paste('ops@example.com')
    await user.click(screen.getByRole('button', { name: '保存账号' }))

    await waitFor(() =>
      expect(mockedCreateSupplierAccount).toHaveBeenCalledWith(expect.objectContaining({
        provider: 'outlook',
        identifier: 'ops@example.com',
        source_type: 'public_mailbox_account',
        auth_mode: 'oauth2',
        protocol_mode: 'imap_pull',
        status: 'active',
      })),
    )

    const projectKeyInput = screen.getByPlaceholderText('openai')
    const relationInput = screen.getByPlaceholderText('可选，与 account_id 至少填一项')
    const localPartInput = screen.getByPlaceholderText('agent-001')
    await user.clear(projectKeyInput)
    await user.click(projectKeyInput)
    await user.paste('discord')
    await user.click(relationInput)
    await user.paste('1')
    await user.click(localPartInput)
    await user.paste('agent-002')
    await user.click(screen.getByRole('button', { name: '保存邮箱' }))

    await waitFor(() =>
      expect(mockedCreateSupplierMailbox).toHaveBeenCalledWith(expect.objectContaining({
        project_key: 'discord',
        domain_id: 1,
        local_part: 'agent-002',
        source_type: 'self_hosted_domain',
        status: 'available',
      })),
    )
    expect(mockedGetSupplierResourcesOverview).toHaveBeenCalledTimes(4)
  }, 10000)
})
