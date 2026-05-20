import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppSidebar, SHARED_CONSOLE_MENU_LOADING_LABEL } from './AppSidebar'
import { API_KEYS_ROUTE, WEBHOOKS_ROUTE, resolveRouteTitle } from '../utils/consoleNavigation'
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
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [], bootstrapStatus: 'idle' })
  })

  it('shows canonical shared-shell titles for shared routes instead of stale server labels', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 2, email: 'supplier@nexus-mail.local', role: 'supplier' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
        { key: 'supplier-domains', label: '域名管理', path: '/supplier/domains' },
        { key: 'supplier-settlements', label: '供应商结算', path: '/supplier/settlements' },
      ],
      bootstrapStatus: 'ready',
    })

    await renderSidebarAndWait(<AppSidebar />)

    const sharedGroup = screen.getByTestId('app-sidebar-shared-group')
    expect(within(sharedGroup).getByRole('menuitem', { name: new RegExp(resolveRouteTitle(WEBHOOKS_ROUTE, 'supplier')) })).toBeInTheDocument()
    expect(within(sharedGroup).getByRole('menuitem', { name: new RegExp(resolveRouteTitle(API_KEYS_ROUTE, 'supplier')) })).toBeInTheDocument()
    expect(within(sharedGroup).queryByText('Webhook 设置')).not.toBeInTheDocument()
    expect(within(sharedGroup).queryByText(/^API Keys$/)).not.toBeInTheDocument()

    const supplierGroup = screen.getByTestId('app-sidebar-supplier-group')
    expect(within(supplierGroup).getByText(resolveRouteTitle('/supplier/domains', 'supplier'))).toBeInTheDocument()
    expect(within(supplierGroup).getByText(resolveRouteTitle('/supplier/settlements', 'supplier'))).toBeInTheDocument()

    const roleSummary = screen.getByRole('region', { name: '当前角色摘要' })
    expect(screen.getByText('Nexus-Mail · 统一控制台')).toBeInTheDocument()
    expect(within(roleSummary).getByRole('heading', { name: '当前角色摘要' })).toBeInTheDocument()
    expect(within(roleSummary).getByText('供应商')).toBeInTheDocument()
    expect(within(roleSummary).getByText('资源供给 / 供货规则 / 结算')).toBeInTheDocument()
    expect(screen.getByText('单一登录 · 按角色切换工作区')).toBeInTheDocument()

    const topologyCard = screen.getByRole('region', { name: '控制台拓扑' })
    expect(within(topologyCard).getByRole('heading', { name: '控制台拓扑' })).toBeInTheDocument()
    expect(topologyCard).toHaveTextContent('共享菜单 3')
    expect(topologyCard).toHaveTextContent('角色工作区 2')
    expect(topologyCard).toHaveTextContent('接入桥接 部分开放')
  })

  it('shows canonical shared-shell titles for admin shared routes', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 3, email: 'admin@nexus-mail.local', role: 'admin' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'balance', label: '余额中心', path: '/balance' },
        { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
        { key: 'admin-risk', label: '风控中心', path: '/admin/risk' },
        { key: 'admin-audit', label: '审计日志', path: '/admin/audit' },
      ],
      bootstrapStatus: 'ready',
    })

    await renderSidebarAndWait(<AppSidebar />)

    const adminGroup = screen.getByTestId('app-sidebar-admin-group')
    expect(within(adminGroup).getByText('风控中心')).toBeInTheDocument()
    expect(within(adminGroup).getByText('审计日志')).toBeInTheDocument()

    const sharedGroup = screen.getByTestId('app-sidebar-shared-group')
    expect(within(sharedGroup).getByRole('menuitem', { name: new RegExp(resolveRouteTitle(WEBHOOKS_ROUTE, 'admin')) })).toBeInTheDocument()
    expect(within(sharedGroup).getByText('余额中心')).toBeInTheDocument()
    expect(within(sharedGroup).queryByText('Webhook 设置')).not.toBeInTheDocument()

    const roleSummary = screen.getByRole('region', { name: '当前角色摘要' })
    expect(within(roleSummary).getByRole('heading', { name: '当前角色摘要' })).toBeInTheDocument()
    expect(within(roleSummary).getByText('管理员')).toBeInTheDocument()
    expect(within(roleSummary).getByText('风控 / 审计 / 运营配置')).toBeInTheDocument()
  })

  it('exposes named sidebar workspace groups and keeps supplier/admin expansions scoped to the same shared shell', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 8, email: 'admin@nexus-mail.local', role: 'admin' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'projects', label: '项目市场', path: '/projects' },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
        { key: 'supplier-domains', label: '域名管理', path: '/supplier/domains' },
        { key: 'admin-risk', label: '风控中心', path: '/admin/risk' },
      ],
      bootstrapStatus: 'ready',
    })

    await renderSidebarAndWait(<AppSidebar />)

    const sharedGroup = screen.getByTestId('app-sidebar-shared-group')
    const sharedGroupScope = within(sharedGroup)
    expect(sharedGroupScope.getByRole('menuitem', { name: /控制台总览/ })).toBeInTheDocument()
    expect(sharedGroupScope.getByRole('menuitem', { name: /项目市场/ })).toBeInTheDocument()
    expect(sharedGroupScope.getByRole('menuitem', { name: /开发者 API 接入工作台/ })).toBeInTheDocument()
    expect(sharedGroupScope.queryByRole('menuitem', { name: '域名池运营中枢' })).not.toBeInTheDocument()
    expect(sharedGroupScope.queryByRole('menuitem', { name: '风控中心' })).not.toBeInTheDocument()

    const supplierGroup = screen.getByTestId('app-sidebar-supplier-group')
    const supplierGroupScope = within(supplierGroup)
    expect(supplierGroupScope.getByRole('menuitem', { name: /域名池运营中枢/ })).toBeInTheDocument()
    expect(supplierGroupScope.queryByRole('menuitem', { name: '控制台总览' })).not.toBeInTheDocument()
    expect(supplierGroupScope.queryByRole('menuitem', { name: '风控中心' })).not.toBeInTheDocument()

    const adminGroup = screen.getByTestId('app-sidebar-admin-group')
    const adminGroupScope = within(adminGroup)
    expect(adminGroupScope.getByRole('menuitem', { name: /风控中心/ })).toBeInTheDocument()
    expect(adminGroupScope.queryByRole('menuitem', { name: '控制台总览' })).not.toBeInTheDocument()
    expect(adminGroupScope.queryByRole('menuitem', { name: '域名池运营中枢' })).not.toBeInTheDocument()
  })

  it('hides supplier and admin workspace expansions when the server menu only exposes shared routes', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 9, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'projects', label: '项目市场', path: '/projects' },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
      ],
      bootstrapStatus: 'ready',
    })

    await renderSidebarAndWait(<AppSidebar />)

    const sharedGroup = screen.getByTestId('app-sidebar-shared-group')
    expect(within(sharedGroup).getByRole('menuitem', { name: /控制台总览/ })).toBeInTheDocument()
    expect(within(sharedGroup).getByRole('menuitem', { name: /项目市场/ })).toBeInTheDocument()
    expect(within(sharedGroup).getByRole('menuitem', { name: /开发者 API 接入工作台/ })).toBeInTheDocument()
    expect(screen.queryByTestId('app-sidebar-supplier-group')).not.toBeInTheDocument()
    expect(screen.queryByTestId('app-sidebar-admin-group')).not.toBeInTheDocument()
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
      bootstrapStatus: 'ready',
    })

    await renderSidebarAndWait(<AppSidebar />, ['/supplier/domains'])

    const supplierGroup = screen.getByTestId('app-sidebar-supplier-group')
    const selectedItems = supplierGroup.querySelectorAll('.semi-navigation-item-selected')
    expect(selectedItems).toHaveLength(1)
    expect(selectedItems[0]?.textContent).toContain(resolveRouteTitle('/supplier/domains', 'supplier'))
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
      bootstrapStatus: 'ready',
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
        <Route
          path="/webhooks"
          element={
            <section data-testid="app-sidebar-route-stub-webhooks">
              <h1>开发者 Webhook 接入工作台</h1>
            </section>
          }
        />
      </Routes>,
      ['/'],
    )
    await screen.findByRole('heading', { name: 'Nexus-Mail' })

    const menu = screen.getByRole('menu')
    await user.click(within(menu).getByRole('menuitem', { name: new RegExp(resolveRouteTitle(WEBHOOKS_ROUTE, 'user')) }))
    expect(await screen.findByTestId('app-sidebar-route-stub-webhooks')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '开发者 Webhook 接入工作台' })).toBeInTheDocument()
  })

  it('shows loading copy inside a named shared-menu region while waiting for server menu items', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 5, email: 'loading@nexus-mail.local', role: 'user' },
      menu: [],
      bootstrapStatus: 'loading',
    })

    await renderSidebarAndWait(<AppSidebar />)

    const loadingRegion = screen.getByRole('region', { name: '共享菜单加载中' })
    expect(within(loadingRegion).getByRole('heading', { name: '共享菜单加载中' })).toBeInTheDocument()
    expect(within(loadingRegion).getByText(SHARED_CONSOLE_MENU_LOADING_LABEL)).toBeInTheDocument()
    expect(within(loadingRegion).queryByText('API 文档')).not.toBeInTheDocument()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
