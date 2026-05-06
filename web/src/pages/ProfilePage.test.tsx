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
        <Route path={PROJECTS_ROUTE} element={<div data-testid="projects-route-stub">项目市场页面</div>} />
        <Route path={ORDERS_ROUTE} element={<div data-testid="orders-route-stub">订单中心页面</div>} />
        <Route path={API_KEYS_ROUTE} element={<div data-testid="api-keys-route-stub">API Keys 页面</div>} />
        <Route path={WEBHOOKS_ROUTE} element={<div data-testid="webhooks-route-stub">Webhook 设置页面</div>} />
        <Route path={DOCS_ROUTE} element={<div data-testid="api-docs-route-stub">API 文档页面</div>} />
        <Route path={SETTINGS_ROUTE} element={<div data-testid="settings-route-stub">设置中心页面</div>} />
        <Route path="/supplier/domains" element={<div data-testid="supplier-domains-route-stub">域名管理页面</div>} />
        <Route path="/admin/risk" element={<div data-testid="admin-risk-route-stub">风控中心页面</div>} />
        <Route path="/" element={<div data-testid="shared-console-home-route-stub">共享控制台首页</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProfilePage', () => {
  afterEach(() => {
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })
  })

  it('scopes the user-facing shared-console bridge navigation to the capability region', async () => {
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
    expect(screen.getByRole('heading', { name: '用户接入焦点' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '采购与订单串联' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '集成准备' })).toBeInTheDocument()

    const capabilityRegion = screen.getByTestId('profile-capability-bridge')
    expect(within(capabilityRegion).getByRole('button', { name: '前往 API Keys' })).toBeInTheDocument()
    expect(within(capabilityRegion).getByRole('button', { name: '打开 Webhook 设置' })).toBeInTheDocument()
    expect(within(capabilityRegion).getByRole('button', { name: '打开 API 文档' })).toBeInTheDocument()

    await user.click(within(capabilityRegion).getByRole('button', { name: '前往 API Keys' }))
    expect(await screen.findByTestId('api-keys-route-stub')).toBeInTheDocument()

    view.unmount()
    view = renderProfilePage()
    const webhookRegion = screen.getByTestId('profile-capability-bridge')
    await user.click(within(webhookRegion).getByRole('button', { name: '打开 Webhook 设置' }))
    expect(await screen.findByTestId('webhooks-route-stub')).toBeInTheDocument()

    view.unmount()
    view = renderProfilePage()
    const docsRegion = screen.getByTestId('profile-capability-bridge')
    await user.click(within(docsRegion).getByRole('button', { name: '打开 API 文档' }))
    expect(await screen.findByTestId('api-docs-route-stub')).toBeInTheDocument()
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
