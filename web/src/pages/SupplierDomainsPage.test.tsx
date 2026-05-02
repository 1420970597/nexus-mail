import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SupplierDomainsPage } from './SupplierDomainsPage'
import {
  API_KEYS_ROUTE,
  DOCS_ROUTE,
  SUPPLIER_DOMAINS_ROUTE,
  SUPPLIER_OFFERINGS_ROUTE,
  SUPPLIER_RESOURCES_ROUTE,
  SUPPLIER_SETTLEMENTS_ROUTE,
  WEBHOOKS_ROUTE,
} from '../utils/consoleNavigation'

const mockedGetSupplierResourcesOverview = vi.fn()
const mockedCreateSupplierDomain = vi.fn()
const mockedSuccess = vi.fn()
const mockedError = vi.fn()

vi.mock('../services/activation', () => ({
  getSupplierResourcesOverview: (...args: any[]) => mockedGetSupplierResourcesOverview(...args),
  createSupplierDomain: (...args: any[]) => mockedCreateSupplierDomain(...args),
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

function renderSupplierDomainsPage() {
  return render(
    <MemoryRouter initialEntries={[SUPPLIER_DOMAINS_ROUTE]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path={SUPPLIER_DOMAINS_ROUTE} element={<SupplierDomainsPage />} />
        <Route path={SUPPLIER_RESOURCES_ROUTE} element={<div>供应商资源页</div>} />
        <Route path={SUPPLIER_OFFERINGS_ROUTE} element={<div>供应商供货页</div>} />
        <Route path={SUPPLIER_SETTLEMENTS_ROUTE} element={<div>供应商结算页</div>} />
        <Route path={API_KEYS_ROUTE} element={<div>API Keys 页面</div>} />
        <Route path={WEBHOOKS_ROUTE} element={<div>Webhook 页面</div>} />
        <Route path={DOCS_ROUTE} element={<div>Docs 页面</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SupplierDomainsPage', () => {
  beforeEach(() => {
    mockedGetSupplierResourcesOverview.mockReset()
    mockedCreateSupplierDomain.mockReset()
    mockedSuccess.mockReset()
    mockedError.mockReset()
  })

  it('renders supplier domain mission-control shell and shared-console guidance', async () => {
    mockedGetSupplierResourcesOverview.mockResolvedValue({
      domains: [
        { id: 1, name: 'mail.nexus.test', region: 'global', status: 'active', catch_all: true },
        { id: 2, name: 'otp.nexus.test', region: 'hk', status: 'inactive', catch_all: false },
      ],
      accounts: [],
      mailboxes: [],
    })

    renderSupplierDomainsPage()

    expect(await screen.findByText('Supplier Domain Mission Control')).toBeInTheDocument()
    expect(screen.getByText('域名池运营中枢')).toBeInTheDocument()
    expect(screen.getByText('供应商主任务流')).toBeInTheDocument()
    expect(screen.getByText('控制台能力矩阵')).toBeInTheDocument()
    expect(screen.getByText('共享控制台联动')).toBeInTheDocument()
    expect(screen.getByText('单一供应商工作台')).toBeInTheDocument()
    expect(screen.getByText('域名 readiness 优先')).toBeInTheDocument()
    expect(screen.getByText('角色扩展但不伪造升级')).toBeInTheDocument()
    expect(screen.getByText('先确认域名池与 Catch-All 覆盖')).toBeInTheDocument()
    expect(screen.getByText('继续补齐邮箱池与账号映射')).toBeInTheDocument()
    expect(screen.getByText('再进入供货规则编排')).toBeInTheDocument()
    expect(screen.getByText(`API Keys · ${API_KEYS_ROUTE}`)).toBeInTheDocument()
    expect(screen.getByText(`Webhook 设置 · ${WEBHOOKS_ROUTE}`)).toBeInTheDocument()
    expect(screen.getByText(`API 文档 · ${DOCS_ROUTE}`)).toBeInTheDocument()
  })

  it('shows loaded domain summaries and records from the real overview payload', async () => {
    mockedGetSupplierResourcesOverview.mockResolvedValue({
      domains: [
        { id: 1, name: 'mail-1.nexus.test', region: 'global', status: 'active', catch_all: true },
        { id: 2, name: 'mail-2.nexus.test', region: 'global', status: 'inactive', catch_all: false },
        { id: 3, name: 'mail-3.nexus.test', region: 'hk', status: 'active', catch_all: true },
        { id: 4, name: 'mail-4.nexus.test', region: '', status: 'active', catch_all: false },
      ],
      accounts: [],
      mailboxes: [],
    })

    renderSupplierDomainsPage()

    expect(await screen.findByText('mail-1.nexus.test')).toBeInTheDocument()
    expect(screen.getByText('当前供应商域名池记录。')).toBeInTheDocument()
    expect(screen.getByText('可继续参与供货编排的域名数量。')).toBeInTheDocument()
    expect(screen.getByText('支持泛收件的域名数量。')).toBeInTheDocument()
    expect(screen.getByText('去重后的 region 数量。')).toBeInTheDocument()
    expect(screen.getByText('global · 2')).toBeInTheDocument()
    expect(screen.getByText('hk · 1')).toBeInTheDocument()
    expect(screen.getByText('unknown · 1')).toBeInTheDocument()
    expect(screen.getAllByText('已开启').length).toBeGreaterThan(0)
  })

  it('navigates from mission-control actions to resource, offering, api key, and settlement pages', async () => {
    mockedGetSupplierResourcesOverview.mockResolvedValue({ domains: [], accounts: [], mailboxes: [] })
    const user = userEvent.setup()

    renderSupplierDomainsPage()
    expect(await screen.findByText('Supplier Domain Mission Control')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /查看供应商资源/ }))
    expect(await screen.findByText('供应商资源页')).toBeInTheDocument()

    renderSupplierDomainsPage()
    expect(await screen.findByText('Supplier Domain Mission Control')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /继续维护供货规则/ }))
    expect(await screen.findByText('供应商供货页')).toBeInTheDocument()

    renderSupplierDomainsPage()
    expect(await screen.findByText('Supplier Domain Mission Control')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: `打开 API Keys · ${API_KEYS_ROUTE}` }))
    expect(await screen.findByText('API Keys 页面')).toBeInTheDocument()

    renderSupplierDomainsPage()
    expect(await screen.findByText('Supplier Domain Mission Control')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: `打开 供应商结算 · ${SUPPLIER_SETTLEMENTS_ROUTE}` }))
    expect(await screen.findByText('供应商结算页')).toBeInTheDocument()
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

    await waitFor(() => {
      expect(mockedCreateSupplierDomain).toHaveBeenCalledWith({
        name: 'otp.nexus.test',
        region: 'hk',
        catch_all: true,
        status: 'active',
      })
    })
    await waitFor(() => expect(mockedSuccess).toHaveBeenCalled())
    await waitFor(() => expect(mockedGetSupplierResourcesOverview).toHaveBeenCalledTimes(2))
  })

  it('shows error state when overview loading fails', async () => {
    mockedGetSupplierResourcesOverview.mockRejectedValue({ response: { data: { error: 'overview failed' } } })

    renderSupplierDomainsPage()

    await waitFor(() => expect(mockedError).toHaveBeenCalledWith('overview failed'))
    expect(await screen.findByText('暂无域名池记录，可先在右侧创建第一条域名。')).toBeInTheDocument()
    expect(screen.getByText('暂无可统计区域。')).toBeInTheDocument()
  })
})
