import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '@testing-library/jest-dom'
import { SupplierResourcesPage } from './SupplierResourcesPage'
import * as activationService from '../services/activation'

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
    <MemoryRouter>
      <SupplierResourcesPage />
    </MemoryRouter>,
  )
}

describe('SupplierResourcesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
})
