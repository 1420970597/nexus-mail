import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppSidebar } from './AppSidebar'
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
      menu: [],
    })

    await renderSidebarAndWait(<AppSidebar />)

    expect(screen.getByText('域名管理')).toBeInTheDocument()
    expect(screen.queryByText('Webhook 设置')).not.toBeInTheDocument()
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
      menu: [],
    })

    await renderSidebarAndWait(<AppSidebar />)

    expect(screen.getByText('风控中心')).toBeInTheDocument()
    expect(screen.getByText('审计日志')).toBeInTheDocument()
    expect(screen.getByText('Webhook 设置')).toBeInTheDocument()
    expect(screen.getByText('余额中心')).toBeInTheDocument()
    expect(screen.getByText('管理员')).toBeInTheDocument()
    expect(screen.getByText('风控 / 审计 / 运营配置')).toBeInTheDocument()
  })

  it('renders docs entry for base user navigation shell', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 4, email: 'user@nexus-mail.local', role: 'user' },
      menu: [],
    })

    renderSidebar(
      <Routes>
        <Route path="*" element={<AppSidebar />} />
        <Route path="/docs" element={<div>Docs Page</div>} />
      </Routes>,
      ['/'],
    )

    expect(screen.getByText('用户')).toBeInTheDocument()
    expect(screen.getByText('采购 / API 接入 / Webhook')).toBeInTheDocument()
    expect(screen.getByText('API 文档')).toBeInTheDocument()
    await user.click(screen.getByText('API 文档'))
    await waitFor(() => expect(screen.getByText('Docs Page')).toBeInTheDocument())
  })
})
