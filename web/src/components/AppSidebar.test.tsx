import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppSidebar, SHARED_CONSOLE_MENU_LOADING_LABEL } from './AppSidebar'
import { useAuthStore } from '../store/authStore'

function renderSidebar(ui: React.ReactNode, initialEntries: string[] = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {ui}
    </MemoryRouter>,
  )
}

async function renderSidebarAndWait(ui: React.ReactNode, initialEntries: string[] = ['/']) {
  renderSidebar(ui, initialEntries)
  await waitFor(() => expect(screen.getByText('Nexus-Mail')).toBeInTheDocument())
}

describe('AppSidebar', () => {
  afterEach(() => {
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })
  })

  it('shows supplier domain, webhook and settlement menu for supplier role', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 2, email: 'supplier@nexus-mail.local', role: 'supplier' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'webhooks', label: 'Webhook 设置', path: '/webhooks' },
        { key: 'supplier-domains', label: '域名管理', path: '/supplier/domains' },
        { key: 'supplier-settlements', label: '供应商结算', path: '/supplier/settlements' },
      ],
    })

    await renderSidebarAndWait(<AppSidebar />)

    expect(screen.getByText('域名管理')).toBeInTheDocument()
    expect(screen.getByText('Webhook 设置')).toBeInTheDocument()
    expect(screen.getByText('供应商结算')).toBeInTheDocument()
    expect(screen.getByText('供应商')).toBeInTheDocument()
    expect(screen.getByText('资源供给 / 供货规则 / 结算')).toBeInTheDocument()
    expect(screen.queryByText('风控中心')).not.toBeInTheDocument()
  })

  it('shows admin risk control menu for admin role', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 3, email: 'admin@nexus-mail.local', role: 'admin' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'balance', label: '余额中心', path: '/balance' },
        { key: 'webhooks', label: 'Webhook 设置', path: '/webhooks' },
        { key: 'admin-risk', label: '风控中心', path: '/admin/risk' },
        { key: 'admin-audit', label: '审计日志', path: '/admin/audit' },
      ],
    })

    await renderSidebarAndWait(<AppSidebar />)

    expect(screen.getByText('风控中心')).toBeInTheDocument()
    expect(screen.getByText('审计日志')).toBeInTheDocument()
    expect(screen.getByText('Webhook 设置')).toBeInTheDocument()
    expect(screen.getByText('余额中心')).toBeInTheDocument()
    expect(screen.getByText('管理员')).toBeInTheDocument()
    expect(screen.getByText('风控 / 审计 / 运营配置')).toBeInTheDocument()
  })

  it('shows loading copy while waiting for server menu items', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 5, email: 'loading@nexus-mail.local', role: 'user' },
      menu: [],
    })

    await renderSidebarAndWait(<AppSidebar />)

    expect(screen.getByText(SHARED_CONSOLE_MENU_LOADING_LABEL)).toBeInTheDocument()
    expect(screen.queryByText('API 文档')).not.toBeInTheDocument()
  })
})
