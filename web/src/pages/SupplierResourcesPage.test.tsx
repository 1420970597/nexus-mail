import { render, screen, within, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import '@testing-library/jest-dom'
import { SupplierResourcesPage } from './SupplierResourcesPage'
import * as activationService from '../services/activation'
import {
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
        <Route path={SUPPLIER_DOMAINS_ROUTE} element={<div>供应商域名页面</div>} />
        <Route path={SUPPLIER_OFFERINGS_ROUTE} element={<div>供应商供货页面</div>} />
        <Route path={SUPPLIER_SETTLEMENTS_ROUTE} element={<div>供应商结算页面</div>} />
        <Route path={DASHBOARD_ROUTE} element={<div>共享控制台首页</div>} />
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
        { key: 'dashboard', label: '共享控制台首页', path: DASHBOARD_ROUTE },
        { key: 'supplier-resources', label: '供应商资源', path: SUPPLIER_RESOURCES_ROUTE },
        { key: 'supplier-domains', label: '域名管理', path: SUPPLIER_DOMAINS_ROUTE },
        { key: 'supplier-offerings', label: '供货规则', path: SUPPLIER_OFFERINGS_ROUTE },
        { key: 'supplier-settlements', label: '供应商结算', path: SUPPLIER_SETTLEMENTS_ROUTE },
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

  it('renders the supplier resource mission control shell and shared-console guidance', async () => {
    renderPage()

    expect(await screen.findByText('Supplier Resource Mission Control')).toBeInTheDocument()
    expect(screen.getByText('在同一套深色共享控制台里统一维护域名池、邮箱池与第三方邮箱账号池，让供给准备、健康检查与后续供货规则保持单壳闭环。')).toBeInTheDocument()
    expect(screen.getByText('供应商任务流')).toBeInTheDocument()
    expect(screen.getByText('控制台能力矩阵')).toBeInTheDocument()
    expect(screen.getByText('先维护域名池与 Catch-All')).toBeInTheDocument()
    expect(screen.getByText('继续收敛供货规则')).toBeInTheDocument()
    expect(screen.getByText('最后观察结算与争议')).toBeInTheDocument()
    expect(screen.getByText('单一供应商工作台')).toBeInTheDocument()
    expect(screen.getByText('角色差异但不拆后台')).toBeInTheDocument()
    expect(screen.getAllByText('域名池').length).toBeGreaterThan(0)
    expect(screen.getByText('健康账号')).toBeInTheDocument()
    expect(screen.getByText('可用邮箱池')).toBeInTheDocument()
  })

  it('shows loaded resource summaries and records from the real overview payload', async () => {
    renderPage()

    expect(await screen.findByText('mail.nexus.test')).toBeInTheDocument()
    expect(screen.getByText('agent-001@mail.nexus.test')).toBeInTheDocument()
    expect(screen.getByText('gmail')).toBeInTheDocument()
    expect(screen.getByText('已开启')).toBeInTheDocument()
    expect(screen.getByText('healthy')).toBeInTheDocument()
    expect(screen.getByText('global')).toBeInTheDocument()
  })

  it('renders the three resource save actions for supplier workflows', async () => {
    renderPage()

    await screen.findByText('Supplier Resource Mission Control')

    expect(screen.getByRole('button', { name: '保存域名' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '保存账号' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '保存邮箱' })).toBeInTheDocument()
  })

  it('navigates from mission-control actions to supplier domains, offerings, and settlements pages', async () => {
    const user = userEvent.setup()

    renderPage()
    expect(await screen.findByText('Supplier Resource Mission Control')).toBeInTheDocument()

    const missionFlow = screen.getByTestId('supplier-resources-mission-flow')
    await user.click(within(missionFlow).getByRole('button', { name: /前往域名管理/ }))
    expect(await screen.findByText('供应商域名页面')).toBeInTheDocument()

    cleanup()
    renderPage()
    expect(await screen.findByText('Supplier Resource Mission Control')).toBeInTheDocument()
    await user.click(within(screen.getByTestId('supplier-resources-mission-flow')).getByRole('button', { name: /查看供货规则/ }))
    expect(await screen.findByText('供应商供货页面')).toBeInTheDocument()

    cleanup()
    renderPage()
    expect(await screen.findByText('Supplier Resource Mission Control')).toBeInTheDocument()
    await user.click(within(screen.getByTestId('supplier-resources-mission-flow')).getByRole('button', { name: /打开供应商结算/ }))
    expect(await screen.findByText('供应商结算页面')).toBeInTheDocument()
  })

  it('suppresses unavailable supplier CTAs and falls back to the preferred workspace when downstream routes are absent', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 8, email: 'supplier@nexus.test', role: 'supplier', created_at: '' },
      menu: [
        { key: 'dashboard', label: '共享控制台首页', path: DASHBOARD_ROUTE },
        { key: 'supplier-resources', label: '供应商资源', path: SUPPLIER_RESOURCES_ROUTE },
      ],
    })

    renderPage()

    expect(await screen.findByText('Supplier Resource Mission Control')).toBeInTheDocument()
    const missionFlow = screen.getByTestId('supplier-resources-mission-flow')
    expect(within(missionFlow).queryByRole('button', { name: '前往域名管理' })).not.toBeInTheDocument()
    expect(within(missionFlow).queryByRole('button', { name: '查看供货规则' })).not.toBeInTheDocument()
    expect(within(missionFlow).queryByRole('button', { name: '打开供应商结算' })).not.toBeInTheDocument()
    expect(screen.getByTestId('supplier-resources-shared-console-fallback')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /返回推荐工作台/ }))
    expect(await screen.findByText('共享控制台首页')).toBeInTheDocument()
  })

  it('hides the fallback slice when supplier resources is the only visible supplier route', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 9, email: 'supplier@nexus.test', role: 'supplier', created_at: '' },
      menu: [{ key: 'supplier-resources', label: '供应商资源', path: SUPPLIER_RESOURCES_ROUTE }],
    })

    renderPage()

    expect(await screen.findByText('Supplier Resource Mission Control')).toBeInTheDocument()
    expect(screen.queryByTestId('supplier-resources-shared-console-fallback')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '返回推荐工作台' })).not.toBeInTheDocument()
  })

  it('submits supplier domain, account, and mailbox actions then reloads overview data', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText('Supplier Resource Mission Control')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('mail.nexus.example'), 'us-mail.nexus.test')
    await user.clear(screen.getByPlaceholderText('global / hk / us'))
    await user.type(screen.getByPlaceholderText('global / hk / us'), 'us')
    await user.click(screen.getByRole('button', { name: '保存域名' }))

    expect(mockedCreateSupplierDomain).toHaveBeenCalledWith({
      name: 'us-mail.nexus.test',
      region: 'us',
      catch_all: true,
      status: 'active',
    })

    await user.clear(screen.getByPlaceholderText('outlook / gmail / qq / proton'))
    await user.type(screen.getByPlaceholderText('outlook / gmail / qq / proton'), 'outlook')
    await user.type(screen.getByPlaceholderText('supplier@example.com'), 'ops@example.com')
    await user.click(screen.getByRole('button', { name: '保存账号' }))

    expect(mockedCreateSupplierAccount).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'outlook',
      identifier: 'ops@example.com',
      source_type: 'public_mailbox_account',
      auth_mode: 'oauth2',
      protocol_mode: 'imap_pull',
      status: 'active',
    }))

    await user.type(screen.getByPlaceholderText('openai'), 'discord')
    await user.type(screen.getByPlaceholderText('可选，与 account_id 至少填一项'), '1')
    await user.type(screen.getByPlaceholderText('agent-001'), 'agent-002')
    await user.click(screen.getByRole('button', { name: '保存邮箱' }))

    expect(mockedCreateSupplierMailbox).toHaveBeenCalledWith(expect.objectContaining({
      project_key: 'discord',
      domain_id: 1,
      local_part: 'agent-002',
      source_type: 'self_hosted_domain',
      status: 'available',
    }))
    expect(mockedGetSupplierResourcesOverview).toHaveBeenCalledTimes(4)
  })
})
