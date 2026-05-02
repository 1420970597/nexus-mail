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
        <Route path={DASHBOARD_ROUTE} element={<div>共享控制台首页</div>} />
        <Route path={SUPPLIER_RESOURCES_ROUTE} element={<div>供应商资源页</div>} />
        <Route path={SUPPLIER_SETTLEMENTS_ROUTE} element={<div>供应商结算页</div>} />
        <Route path={API_KEYS_ROUTE} element={<div>API Keys 页面</div>} />
        <Route path={WEBHOOKS_ROUTE} element={<div>Webhook 页面</div>} />
        <Route path={DOCS_ROUTE} element={<div>Docs 页面</div>} />
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
        { label: '共享控制台首页', path: DASHBOARD_ROUTE },
        { label: '供应商资源', path: SUPPLIER_RESOURCES_ROUTE },
        { label: '供货规则', path: SUPPLIER_OFFERINGS_ROUTE },
        { label: '供应商结算', path: SUPPLIER_SETTLEMENTS_ROUTE },
        { label: 'API Keys', path: API_KEYS_ROUTE },
        { label: 'Webhook', path: WEBHOOKS_ROUTE },
        { label: 'Docs', path: DOCS_ROUTE },
      ],
    })
  })

  it('renders supplier mission-control shell with metrics and shared-console guidance', async () => {
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

    expect(await screen.findByText('Supplier Mission Control')).toBeInTheDocument()
    expect(screen.getByText('供货规则编排中枢')).toBeInTheDocument()
    expect(screen.getByText('供应商主任务流')).toBeInTheDocument()
    expect(screen.getByText('共享控制台联动')).toBeInTheDocument()
    expect(screen.getByText('单一登录后控制台')).toBeInTheDocument()
    expect(screen.getByText('API Keys · /api-keys')).toBeInTheDocument()
    expect(screen.getByText('Webhook 设置 · /webhooks')).toBeInTheDocument()
    expect(screen.getByText('API 文档 · /docs')).toBeInTheDocument()
    expect(screen.getByText('discord')).toBeInTheDocument()
    expect(screen.getByText('¥1.99')).toBeInTheDocument()
    expect(screen.getByText('95.0%')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getByText('domain · 1')).toBeInTheDocument()
  })

  it('navigates from mission-control actions to resource, settlement, and api key pages', async () => {
    mockedGetSupplierResourcesOverview.mockResolvedValue({ domains: [], accounts: [], mailboxes: [] })
    mockedGetSupplierOfferings.mockResolvedValue({ items: [] })
    const user = userEvent.setup()

    renderSupplierOfferingsPage()
    expect(await screen.findByText('Supplier Mission Control')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /查看供应商资源/ }))
    expect(await screen.findByText('供应商资源页')).toBeInTheDocument()

    renderSupplierOfferingsPage()
    expect(await screen.findByText('Supplier Mission Control')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /打开供应商结算/ }))
    expect(await screen.findByText('供应商结算页')).toBeInTheDocument()

    renderSupplierOfferingsPage()
    expect(await screen.findByText('Supplier Mission Control')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /打开 API Keys/ }))
    expect(await screen.findByText('API Keys 页面')).toBeInTheDocument()
  })

  it('suppresses hidden shared-console bridge actions and falls back to the preferred workspace when integration routes are absent from the menu', async () => {
    mockedGetSupplierResourcesOverview.mockResolvedValue({ domains: [], accounts: [], mailboxes: [] })
    mockedGetSupplierOfferings.mockResolvedValue({ items: [] })
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 7, email: 'supplier@nexus.test', role: 'supplier', created_at: '' },
      menu: [
        { label: '共享控制台首页', path: DASHBOARD_ROUTE },
        { label: '供应商资源', path: SUPPLIER_RESOURCES_ROUTE },
        { label: '供货规则', path: SUPPLIER_OFFERINGS_ROUTE },
      ],
    })
    const user = userEvent.setup()

    renderSupplierOfferingsPage()
    expect(await screen.findByText('Supplier Mission Control')).toBeInTheDocument()

    expect(screen.queryByText(`API Keys · ${API_KEYS_ROUTE}`)).not.toBeInTheDocument()
    expect(screen.queryByText(`Webhook 设置 · ${WEBHOOKS_ROUTE}`)).not.toBeInTheDocument()
    expect(screen.queryByText(`API 文档 · ${DOCS_ROUTE}`)).not.toBeInTheDocument()

    const fallback = screen.getByTestId('supplier-offerings-shared-console-fallback')
    expect(fallback).toBeInTheDocument()
    await user.click(fallback)
    expect(await screen.findByText('共享控制台首页')).toBeInTheDocument()
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
