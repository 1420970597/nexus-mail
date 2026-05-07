import { render, screen, within } from '@testing-library/react'
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
  await screen.findByRole('heading', { name: 'Nexus-Mail' })
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

    const sharedGroup = screen.getByTestId('app-sidebar-shared-group')
    expect(within(sharedGroup).getByText('基础工作台')).toBeInTheDocument()
    expect(within(sharedGroup).getByText('Webhook 设置')).toBeInTheDocument()
    expect(within(sharedGroup).queryByText('风控中心')).not.toBeInTheDocument()

    const supplierGroup = screen.getByTestId('app-sidebar-supplier-group')
    expect(within(supplierGroup).getByText('供应商扩展')).toBeInTheDocument()
    expect(within(supplierGroup).getByText('域名管理')).toBeInTheDocument()
    expect(within(supplierGroup).getByText('供应商结算')).toBeInTheDocument()

    const roleSummary = screen.getByTestId('app-sidebar-role-summary')
    expect(screen.getByText('Nexus-Mail · 统一控制台')).toBeInTheDocument()
    expect(within(roleSummary).getByText('供应商')).toBeInTheDocument()
    expect(within(roleSummary).getByText('资源供给 / 供货规则 / 结算')).toBeInTheDocument()
    expect(screen.getByText('单一登录 · 按角色切换工作区')).toBeInTheDocument()
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

    const adminGroup = screen.getByTestId('app-sidebar-admin-group')
    expect(within(adminGroup).getByText('风控中心')).toBeInTheDocument()
    expect(within(adminGroup).getByText('审计日志')).toBeInTheDocument()

    const sharedGroup = screen.getByTestId('app-sidebar-shared-group')
    expect(within(sharedGroup).getByText('Webhook 设置')).toBeInTheDocument()
    expect(within(sharedGroup).getByText('余额中心')).toBeInTheDocument()

    const roleSummary = screen.getByTestId('app-sidebar-role-summary')
    expect(within(roleSummary).getByText('管理员')).toBeInTheDocument()
    expect(within(roleSummary).getByText('风控 / 审计 / 运营配置')).toBeInTheDocument()
  })

  it('marks the current route as selected inside the navigation menu', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 6, email: 'supplier@nexus-mail.local', role: 'supplier' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'supplier-domains', label: '域名管理', path: '/supplier/domains' },
        { key: 'supplier-settlements', label: '供应商结算', path: '/supplier/settlements' },
      ],
    })

    await renderSidebarAndWait(<AppSidebar />, ['/supplier/domains'])

    const supplierGroup = screen.getByTestId('app-sidebar-supplier-group')
    const selectedItems = supplierGroup.querySelectorAll('.semi-navigation-item-selected')
    expect(selectedItems).toHaveLength(1)
    expect(selectedItems[0]?.textContent).toContain('域名管理')
  })

  it('navigates to the clicked menu item inside the shared sidebar', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 7, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'projects', label: '项目市场', path: '/projects' },
        { key: 'webhooks', label: 'Webhook 设置', path: '/webhooks' },
      ],
    })

    renderSidebar(
      <Routes>
        <Route path="*" element={<AppSidebar />} />
        <Route
          path="/projects"
          element={
            <section data-testid="app-sidebar-route-stub-projects">
              <h1>项目市场</h1>
            </section>
          }
        />
        <Route path="/webhooks" element={<section data-testid="app-sidebar-route-stub-webhooks"><h1>Webhook 设置</h1></section>} />
      </Routes>,
      ['/'],
    )
    await screen.findByRole('heading', { name: 'Nexus-Mail' })

    const menu = screen.getByRole('menu')
    await user.click(within(menu).getByRole('menuitem', { name: /Webhook 设置/ }))
    expect(await screen.findByTestId('app-sidebar-route-stub-webhooks')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Webhook 设置' })).toBeInTheDocument()
  })

  it('shows loading copy while waiting for server menu items', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 5, email: 'loading@nexus-mail.local', role: 'user' },
      menu: [],
    })

    await renderSidebarAndWait(<AppSidebar />)

    const loadingCard = screen.getByTestId('app-sidebar-loading-card')
    expect(within(loadingCard).getByText(SHARED_CONSOLE_MENU_LOADING_LABEL)).toBeInTheDocument()
    expect(within(loadingCard).queryByText('API 文档')).not.toBeInTheDocument()
  })
})
