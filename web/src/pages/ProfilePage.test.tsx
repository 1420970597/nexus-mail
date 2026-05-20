import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProfilePage } from './ProfilePage'
import { useAuthStore } from '../store/authStore'
import { API_KEYS_ROUTE, DOCS_ROUTE, ORDERS_ROUTE, PROFILE_ROUTE, PROJECTS_ROUTE, SETTINGS_ROUTE, WEBHOOKS_ROUTE, resolveRouteTitle } from '../utils/consoleNavigation'

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
          element={
            <section data-testid="api-keys-route-stub" role="region" aria-label="共享控制台 - API Keys">
              <h1>开发者 API 接入工作台</h1>
            </section>
          }
        />
        <Route
          path={WEBHOOKS_ROUTE}
          element={
            <section data-testid="webhooks-route-stub" role="region" aria-label="共享控制台 - Webhooks">
              <h1>{resolveRouteTitle(WEBHOOKS_ROUTE, useAuthStore.getState().user?.role)}</h1>
            </section>
          }
        />
        <Route
          path={DOCS_ROUTE}
          element={
            <section data-testid="api-docs-route-stub" role="region" aria-label="共享控制台 - API 文档">
              <h1>API 文档与接入控制台</h1>
            </section>
          }
        />
        <Route
          path={SETTINGS_ROUTE}
          element={(
            <section data-testid="settings-route-stub" role="region" aria-label="共享控制台 - 设置中心">
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

  it('keeps the account shell aligned with a dark single-console mission control and scopes shared bridge navigation to bridge-owned CTA surfaces only', async () => {
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
    const heroCard = screen.getByRole('region', { name: '个人资料' })
    expect(within(heroCard).getByText('个人资料中枢')).toBeInTheDocument()
    expect(heroCard).toHaveTextContent('统一账号、会话与下一步入口都留在同一深色共享控制台。')
    expect(heroCard).not.toHaveTextContent('账号身份、会话边界与下一步操作都在同一套深色共享控制台内完成，不额外拆出角色后台。')

    const roleFocusCard = screen.getByTestId('profile-role-focus-card')
    expect(within(roleFocusCard).getByText('用户接入焦点')).toBeInTheDocument()
    expect(roleFocusCard).toHaveStyle({ background: 'linear-gradient(180deg, rgba(15,16,17,0.94) 0%, rgba(25,26,27,0.92) 100%)' })
    expect(within(roleFocusCard).getByRole('heading', { name: '采购与订单串联' })).toBeInTheDocument()
    expect(within(roleFocusCard).getByRole('heading', { name: '集成准备' })).toBeInTheDocument()
    expect(roleFocusCard).toHaveTextContent('通过 API Key、白名单与文档核对快速完成程序化接入，并对接真实回调能力。')
    expect(roleFocusCard).not.toHaveTextContent('通过 API Key、白名单与文档入口快速完成程序化接入，并对接真实回调能力。')
    expect(roleFocusCard).toHaveTextContent('当前推荐：进入项目市场，继续共享控制台主链路。')
    expect(roleFocusCard).not.toHaveTextContent('当前推荐动作：进入项目市场。保持单一登录后控制台，不额外拆分独立后台。')

    const capabilityRegion = screen.getByRole('region', { name: '共享接入桥接' })
    expect(capabilityRegion).toHaveStyle({ background: 'linear-gradient(180deg, rgba(15,16,17,0.94) 0%, rgba(25,26,27,0.92) 100%)' })
    expect(within(capabilityRegion).getByRole('heading', { name: '共享接入桥接' })).toBeInTheDocument()
    expect(capabilityRegion).not.toHaveTextContent('控制台桥接能力')
    expect(within(capabilityRegion).getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()
    expect(within(capabilityRegion).getByRole('button', { name: '继续配置 Webhook' })).toBeInTheDocument()
    expect(within(capabilityRegion).getByRole('button', { name: '查看 API 文档' })).toBeInTheDocument()
    expect(within(capabilityRegion).queryByRole('heading', { name: '开发者 API 接入工作台' })).not.toBeInTheDocument()
    expect(within(capabilityRegion).queryByRole('heading', { name: '开发者 Webhook 接入工作台' })).not.toBeInTheDocument()
    expect(within(capabilityRegion).queryByRole('heading', { name: 'API 文档与接入控制台' })).not.toBeInTheDocument()

    const capabilityMatrix = screen.getByRole('region', { name: '控制台能力矩阵' })
    expect(within(capabilityMatrix).getByRole('heading', { name: '控制台能力矩阵' })).toBeInTheDocument()
    expect(capabilityMatrix).toHaveTextContent('统一身份入口')
    expect(capabilityMatrix).toHaveTextContent('共享接入桥接')
    expect(capabilityMatrix).toHaveTextContent('角色菜单扩展')

    const roleExpansionCard = screen.getByTestId('profile-role-expansion-card')
    expect(roleExpansionCard).toHaveTextContent('共享账号中枢')
    expect(roleExpansionCard).not.toHaveTextContent('深色共享账号中枢')
    expect(roleExpansionCard).toHaveTextContent('最小权限')
    expect(roleExpansionCard).toHaveTextContent('Webhook / API')
    expect(roleExpansionCard).toHaveTextContent('文档核对')
    expect(roleExpansionCard).not.toHaveTextContent('单一文档入口')

    await user.click(within(capabilityRegion).getByRole('button', { name: '打开 API Keys' }))
    const apiKeysRouteStub = await screen.findByRole('region', { name: '共享控制台 - API Keys' })
    expect(within(apiKeysRouteStub).getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()

    view.unmount()
    view = renderProfilePage()
    const webhookRegion = screen.getByRole('region', { name: '共享接入桥接' })
    await user.click(within(webhookRegion).getByRole('button', { name: '继续配置 Webhook' }))
    const webhooksRouteStub = await screen.findByRole('region', { name: '共享控制台 - Webhooks' })
    expect(within(webhooksRouteStub).getByRole('heading', { name: '开发者 Webhook 接入工作台' })).toBeInTheDocument()

    view.unmount()
    view = renderProfilePage()
    const docsRegion = screen.getByRole('region', { name: '共享接入桥接' })
    await user.click(within(docsRegion).getByRole('button', { name: '查看 API 文档' }))
    const docsRouteStub = await screen.findByRole('region', { name: '共享控制台 - API 文档' })
    expect(within(docsRouteStub).getByRole('heading', { name: 'API 文档与接入控制台' })).toBeInTheDocument()
  })

  it('keeps the supplier return lane as a named shared-console region when settings is available', async () => {
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

    const sharedConsoleReturn = screen.getByRole('region', { name: '通过设置中心回到共享控制台' })
    expect(within(sharedConsoleReturn).getByRole('heading', { name: '通过设置中心回到共享控制台' })).toBeInTheDocument()
    expect(within(sharedConsoleReturn).getByRole('button', { name: '返回共享工作台' })).toBeInTheDocument()
    expect(within(sharedConsoleReturn).getByText('角色扩展仍留在同一套深色控制台中；如果当前页只负责身份核对，可先回到设置中心再继续风控、供给或接入链路。')).toBeInTheDocument()
    expect(within(sharedConsoleReturn).queryByRole('heading', { name: '采购与订单串联' })).not.toBeInTheDocument()
    expect(screen.getByText('供应商运营焦点')).toBeInTheDocument()

    await user.click(within(sharedConsoleReturn).getByRole('button', { name: '返回共享工作台' }))
    const settingsRegion = await screen.findByRole('region', { name: '共享控制台 - 设置中心' })
    expect(within(settingsRegion).getByRole('heading', { name: '设置中心' })).toBeInTheDocument()
  })

  it('scopes the user fallback CTA to the named shared-console return region when project access is hidden', async () => {
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

    const sharedConsoleReturn = screen.getByRole('region', { name: '回到共享工作台继续主链路' })
    expect(within(sharedConsoleReturn).getByRole('heading', { name: '回到共享工作台继续主链路' })).toBeInTheDocument()
    expect(within(sharedConsoleReturn).getByRole('button', { name: '返回共享工作台' })).toBeInTheDocument()
    expect(within(sharedConsoleReturn).getByText('当服务端暂未暴露项目市场时，普通用户仍可从账号中枢回到共享工作台继续查看预算、订单或接入入口。')).toBeInTheDocument()

    await user.click(within(sharedConsoleReturn).getByRole('button', { name: '返回共享工作台' }))
    expect(await screen.findByTestId('shared-console-home-route-stub')).toBeInTheDocument()
  })

  it('scopes the supplier fallback CTA to the named shared-console return region when settings is hidden', async () => {
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

    const sharedConsoleReturn = screen.getByRole('region', { name: '回到共享工作台继续角色扩展链路' })
    expect(within(sharedConsoleReturn).getByRole('heading', { name: '回到共享工作台继续角色扩展链路' })).toBeInTheDocument()
    expect(within(sharedConsoleReturn).getByRole('button', { name: '返回共享工作台' })).toBeInTheDocument()
    expect(within(sharedConsoleReturn).getByText('当设置中心入口暂未暴露时，仍可返回当前角色的共享工作台，继续同一控制台中的风控、供给或接入任务。')).toBeInTheDocument()

    await user.click(within(sharedConsoleReturn).getByRole('button', { name: '返回共享工作台' }))
    expect(await screen.findByTestId('shared-console-home-route-stub')).toBeInTheDocument()
  })

  it('scopes the admin fallback CTA to the named shared-console return region when settings is hidden', async () => {
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

    const sharedConsoleReturn = screen.getByRole('region', { name: '回到共享工作台继续角色扩展链路' })
    expect(within(sharedConsoleReturn).getByRole('heading', { name: '回到共享工作台继续角色扩展链路' })).toBeInTheDocument()
    expect(within(sharedConsoleReturn).getByRole('button', { name: '返回共享工作台' })).toBeInTheDocument()
    expect(within(sharedConsoleReturn).getByText('当设置中心入口暂未暴露时，仍可返回当前角色的共享工作台，继续同一控制台中的风控、供给或接入任务。')).toBeInTheDocument()

    await user.click(within(sharedConsoleReturn).getByRole('button', { name: '返回共享工作台' }))
    expect(await screen.findByTestId('shared-console-home-route-stub')).toBeInTheDocument()
  })

  it('hides the shared-console return region when admin stays on profile as the only visible route', () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 12, email: 'admin@nexus-mail.local', role: 'admin' },
      menu: [{ key: 'profile', label: '个人资料', path: PROFILE_ROUTE }],
    })

    renderProfilePage()

    expect(screen.queryByRole('region', { name: /回到共享工作台|通过设置中心回到共享控制台/ })).not.toBeInTheDocument()
  })

  it('scopes the supplier shared-console webhook bridge copy to CTA-level shared actions while preserving the supplier destination title inside the shared-console route region', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 13, email: 'supplier@nexus-mail.local', role: 'supplier' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'profile', label: '个人资料', path: PROFILE_ROUTE },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
        { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
        { key: 'docs', label: 'API 文档', path: DOCS_ROUTE },
      ],
    })

    renderProfilePage()

    const capabilityRegion = await screen.findByRole('region', { name: '共享接入桥接' })
    expect(within(capabilityRegion).getByRole('button', { name: '继续配置 Webhook' })).toBeInTheDocument()
    expect(within(capabilityRegion).queryByRole('heading', { name: '供给事件回调工作台' })).not.toBeInTheDocument()
    expect(within(capabilityRegion).queryByRole('heading', { name: '开发者 Webhook 接入工作台' })).not.toBeInTheDocument()

    await user.click(within(capabilityRegion).getByRole('button', { name: '继续配置 Webhook' }))
    const webhooksRouteStub = await screen.findByRole('region', { name: '共享控制台 - Webhooks' })
    expect(within(webhooksRouteStub).getByRole('heading', { name: resolveRouteTitle(WEBHOOKS_ROUTE, 'supplier') })).toBeInTheDocument()
  })

  it('scopes the admin shared-console webhook bridge copy to CTA-level shared actions while preserving the admin destination title inside the shared-console route region', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 14, email: 'admin@nexus-mail.local', role: 'admin' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'profile', label: '个人资料', path: PROFILE_ROUTE },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
        { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
        { key: 'docs', label: 'API 文档', path: DOCS_ROUTE },
      ],
    })

    renderProfilePage()

    const capabilityRegion = await screen.findByRole('region', { name: '共享接入桥接' })
    expect(within(capabilityRegion).getByRole('button', { name: '继续配置 Webhook' })).toBeInTheDocument()
    expect(within(capabilityRegion).queryByRole('heading', { name: 'Webhook 运维与回调观测' })).not.toBeInTheDocument()
    expect(within(capabilityRegion).queryByRole('heading', { name: '开发者 Webhook 接入工作台' })).not.toBeInTheDocument()

    await user.click(within(capabilityRegion).getByRole('button', { name: '继续配置 Webhook' }))
    const webhooksRouteStub = await screen.findByRole('region', { name: '共享控制台 - Webhooks' })
    expect(within(webhooksRouteStub).getByRole('heading', { name: resolveRouteTitle(WEBHOOKS_ROUTE, 'admin') })).toBeInTheDocument()
  })

  it('keeps the admin return lane as a named shared-console region isolated from user-only focus copy when settings is available', async () => {
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

    const sharedConsoleReturn = screen.getByRole('region', { name: '通过设置中心回到共享控制台' })
    expect(within(sharedConsoleReturn).getByRole('heading', { name: '通过设置中心回到共享控制台' })).toBeInTheDocument()
    expect(within(sharedConsoleReturn).getByRole('button', { name: '返回共享工作台' })).toBeInTheDocument()
    expect(within(sharedConsoleReturn).getByText('角色扩展仍留在同一套深色控制台中；如果当前页只负责身份核对，可先回到设置中心再继续风控、供给或接入链路。')).toBeInTheDocument()
    expect(screen.getByText('管理员运营焦点')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '采购与订单串联' })).not.toBeInTheDocument()

    await user.click(within(sharedConsoleReturn).getByRole('button', { name: '返回共享工作台' }))
    const settingsRegion = await screen.findByRole('region', { name: '共享控制台 - 设置中心' })
    expect(within(settingsRegion).getByRole('heading', { name: '设置中心' })).toBeInTheDocument()
  })
})
