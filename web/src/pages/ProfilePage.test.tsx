import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProfilePage } from './ProfilePage'
import { useAuthStore } from '../store/authStore'
import { API_KEYS_ROUTE, DOCS_ROUTE, ORDERS_ROUTE, PROFILE_ROUTE, PROJECTS_ROUTE, SETTINGS_ROUTE, WEBHOOKS_ROUTE } from '../utils/consoleNavigation'

function renderProfilePage(initialEntry = PROFILE_ROUTE) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path={PROFILE_ROUTE} element={<ProfilePage />} />
        <Route
          path={PROJECTS_ROUTE}
          element={(
            <section data-testid="projects-route-stub">
              <h1>项目市场</h1>
            </section>
          )}
        />
        <Route
          path={ORDERS_ROUTE}
          element={(
            <section data-testid="orders-route-stub">
              <h1>订单中心</h1>
            </section>
          )}
        />
        <Route
          path={API_KEYS_ROUTE}
          element={(
            <section data-testid="api-keys-route-stub">
              <h1>开发者 API 接入工作台</h1>
            </section>
          )}
        />
        <Route
          path={WEBHOOKS_ROUTE}
          element={(
            <section data-testid="webhooks-route-stub">
              <h1>开发者 Webhook 接入工作台</h1>
            </section>
          )}
        />
        <Route
          path={DOCS_ROUTE}
          element={(
            <section data-testid="api-docs-route-stub">
              <h1>API 文档与接入控制台</h1>
            </section>
          )}
        />
        <Route
          path={SETTINGS_ROUTE}
          element={(
            <section data-testid="settings-route-stub">
              <h1>设置中心</h1>
            </section>
          )}
        />
        <Route
          path="/supplier/domains"
          element={(
            <section data-testid="supplier-domains-route-stub">
              <h1>域名池运营中枢</h1>
            </section>
          )}
        />
        <Route
          path="/admin/risk"
          element={(
            <section data-testid="admin-risk-route-stub">
              <h1>风控中心</h1>
            </section>
          )}
        />
        <Route
          path="/"
          element={(
            <section data-testid="shared-console-home-route-stub">
              <h1>控制台总览</h1>
            </section>
          )}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProfilePage', () => {
  afterEach(() => {
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })
  })

  it('scopes the user-facing shared-console bridge navigation to the capability region and keeps the account shell aligned with the dark single-console mission control', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 1, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'projects', label: '项目市场', path: PROJECTS_ROUTE },
        { key: 'orders', label: '订单中心', path: ORDERS_ROUTE },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
        { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
        { key: 'docs', label: 'API 文档', path: DOCS_ROUTE },
        { key: 'profile', label: '个人资料', path: PROFILE_ROUTE },
      ],
    })

    let view = renderProfilePage()

    expect(await screen.findByRole('heading', { name: '个人资料' })).toBeInTheDocument()
    const heroCard = screen.getByTestId('profile-hero-card')
    expect(within(heroCard).getByText('个人资料中枢')).toBeInTheDocument()
    const roleFocusCard = screen.getByTestId('profile-role-focus-card')
    expect(within(roleFocusCard).getByRole('heading', { name: '用户接入焦点' })).toBeInTheDocument()
    expect(within(roleFocusCard).getByRole('heading', { name: '采购与订单串联' })).toBeInTheDocument()
    expect(within(roleFocusCard).getByRole('heading', { name: '集成准备' })).toBeInTheDocument()

    const capabilityRegion = screen.getByTestId('profile-capability-bridge')
    expect(within(capabilityRegion).getByText('控制台桥接能力')).toBeInTheDocument()
    expect(within(capabilityRegion).getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()
    expect(within(capabilityRegion).getByRole('button', { name: '打开 Webhook 设置' })).toBeInTheDocument()
    expect(within(capabilityRegion).getByRole('button', { name: '打开 API 文档' })).toBeInTheDocument()

    const capabilityMatrix = screen.getByTestId('profile-capability-matrix')
    expect(within(capabilityMatrix).getByText('控制台能力矩阵')).toBeInTheDocument()
    expect(within(capabilityMatrix).getByText('统一身份入口')).toBeInTheDocument()
    expect(within(capabilityMatrix).getByText('共享接入桥接')).toBeInTheDocument()
    expect(within(capabilityMatrix).getByText('角色菜单扩展')).toBeInTheDocument()

    const roleExpansionCard = screen.getByTestId('profile-role-expansion-card')
    expect(within(roleExpansionCard).getByText('深色共享账号中枢')).toBeInTheDocument()
    expect(within(roleExpansionCard).getByText('最小权限')).toBeInTheDocument()
    expect(within(roleExpansionCard).getByText('Webhook / API')).toBeInTheDocument()
    expect(within(roleExpansionCard).getByText('单一文档入口')).toBeInTheDocument()

    await user.click(within(capabilityRegion).getByRole('button', { name: '打开 API Keys' }))
    expect(await screen.findByTestId('api-keys-route-stub')).toBeInTheDocument()

    view.unmount()
    view = renderProfilePage()
    const webhookRegion = screen.getByTestId('profile-capability-bridge')
    await user.click(within(webhookRegion).getByRole('button', { name: '打开 Webhook 设置' }))
    const webhooksRouteStub = await screen.findByTestId('webhooks-route-stub')
    expect(within(webhooksRouteStub).getByRole('heading', { name: '开发者 Webhook 接入工作台' })).toBeInTheDocument()

    view.unmount()
    view = renderProfilePage()
    const docsRegion = screen.getByTestId('profile-capability-bridge')
    await user.click(within(docsRegion).getByRole('button', { name: '打开 API 文档' }))
    const docsRouteStub = await screen.findByTestId('api-docs-route-stub')
    expect(within(docsRouteStub).getByRole('heading', { name: 'API 文档与接入控制台' })).toBeInTheDocument()
  })

  it('keeps the supplier return card isolated from user-only focus copy when settings is available', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 8, email: 'supplier@nexus-mail.local', role: 'supplier' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'profile', label: '个人资料', path: PROFILE_ROUTE },
        { key: 'settings', label: '设置中心', path: SETTINGS_ROUTE },
        { key: 'supplier-domains', label: '域名管理', path: '/supplier/domains' },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
      ],
    })

    renderProfilePage()

    const sharedConsoleReturn = screen.getByTestId('profile-shared-console-return')
    expect(screen.getByRole('heading', { name: '供应商运营焦点' })).toBeInTheDocument()
    expect(within(sharedConsoleReturn).getByRole('button', { name: '返回共享工作台' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '采购与订单串联' })).not.toBeInTheDocument()

    await user.click(within(sharedConsoleReturn).getByRole('button', { name: '返回共享工作台' }))
    expect(await screen.findByTestId('settings-route-stub')).toBeInTheDocument()
  })

  it('scopes the user fallback CTA to the shared-console return region when project access is hidden', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 6, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'profile', label: '个人资料', path: PROFILE_ROUTE },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
      ],
    })

    renderProfilePage()

    const sharedConsoleReturn = screen.getByTestId('profile-shared-console-return')
    expect(within(sharedConsoleReturn).getByText('回到推荐工作台继续主链路')).toBeInTheDocument()
    expect(within(sharedConsoleReturn).getByRole('button', { name: '返回推荐工作台' })).toBeInTheDocument()

    await user.click(within(sharedConsoleReturn).getByRole('button', { name: '返回推荐工作台' }))
    expect(await screen.findByTestId('shared-console-home-route-stub')).toBeInTheDocument()
  })

  it('scopes the supplier fallback CTA to the dedicated fallback region when settings is hidden', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 10, email: 'supplier@nexus-mail.local', role: 'supplier' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'profile', label: '个人资料', path: PROFILE_ROUTE },
        { key: 'supplier-domains', label: '域名管理', path: '/supplier/domains' },
      ],
    })

    renderProfilePage()

    const sharedConsoleReturn = screen.getByTestId('profile-shared-console-return')
    expect(within(sharedConsoleReturn).getByText('回到推荐工作台继续角色扩展链路')).toBeInTheDocument()
    expect(within(sharedConsoleReturn).getByRole('button', { name: '返回共享工作台' })).toBeInTheDocument()

    await user.click(within(sharedConsoleReturn).getByRole('button', { name: '返回共享工作台' }))
    expect(await screen.findByTestId('shared-console-home-route-stub')).toBeInTheDocument()
  })

  it('scopes the admin fallback CTA to the dedicated fallback region when settings is hidden', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 11, email: 'admin@nexus-mail.local', role: 'admin' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'profile', label: '个人资料', path: PROFILE_ROUTE },
        { key: 'admin-risk', label: '风控中心', path: '/admin/risk' },
      ],
    })

    renderProfilePage()

    const sharedConsoleReturn = screen.getByTestId('profile-shared-console-return')
    expect(within(sharedConsoleReturn).getByText('回到推荐工作台继续角色扩展链路')).toBeInTheDocument()
    expect(within(sharedConsoleReturn).getByRole('button', { name: '返回共享工作台' })).toBeInTheDocument()

    await user.click(within(sharedConsoleReturn).getByRole('button', { name: '返回共享工作台' }))
    expect(await screen.findByTestId('shared-console-home-route-stub')).toBeInTheDocument()
  })

  it('hides the shared-console return CTA when admin stays on profile as the only visible route', () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 12, email: 'admin@nexus-mail.local', role: 'admin' },
      menu: [{ key: 'profile', label: '个人资料', path: PROFILE_ROUTE }],
    })

    renderProfilePage()

    expect(screen.queryByTestId('profile-shared-console-return')).not.toBeInTheDocument()
  })

  it('keeps the admin return card isolated from user-only focus copy when settings is available', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 9, email: 'admin@nexus-mail.local', role: 'admin' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'profile', label: '个人资料', path: PROFILE_ROUTE },
        { key: 'settings', label: '设置中心', path: SETTINGS_ROUTE },
        { key: 'admin-risk', label: '风控中心', path: '/admin/risk' },
      ],
    })

    renderProfilePage()

    const sharedConsoleReturn = screen.getByTestId('profile-shared-console-return')
    expect(screen.getByRole('heading', { name: '管理员运营焦点' })).toBeInTheDocument()
    expect(within(sharedConsoleReturn).getByRole('button', { name: '返回共享工作台' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '采购与订单串联' })).not.toBeInTheDocument()

    await user.click(within(sharedConsoleReturn).getByRole('button', { name: '返回共享工作台' }))
    expect(await screen.findByTestId('settings-route-stub')).toBeInTheDocument()
  })
})
