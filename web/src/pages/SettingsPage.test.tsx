import '@testing-library/jest-dom'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { SettingsPage } from './SettingsPage'
import { useAuthStore } from '../store/authStore'
import { userFirstRunStorageKeyForUser } from './DashboardPage'
import { API_KEYS_ROUTE, DOCS_ROUTE, ORDERS_ROUTE, PROFILE_ROUTE, PROJECTS_ROUTE, SETTINGS_ROUTE, WEBHOOKS_ROUTE, resolveRouteTitle } from '../utils/consoleNavigation'

function getButtonByLabel(scope: ReturnType<typeof within>, label: string) {
  const button = scope.getByRole('button', { name: new RegExp(label) })
  expect(button).toBeInTheDocument()
  return button
}

function webhookRouteTitleForCurrentRole() {
  return resolveRouteTitle(WEBHOOKS_ROUTE, useAuthStore.getState().user?.role)
}

function renderSettingsPage(initialEntry = SETTINGS_ROUTE) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route
          path="/"
          element={(
            <section data-testid="settings-route-stub-shared-home" role="region" aria-label="共享控制台首页">
              <h1>控制台总览</h1>
            </section>
          )}
        />
        <Route
          path={PROJECTS_ROUTE}
          element={(
            <section data-testid="settings-route-stub-projects" role="region" aria-label="共享控制台 - 项目市场">
              <h1>项目市场</h1>
            </section>
          )}
        />
        <Route
          path={ORDERS_ROUTE}
          element={(
            <section data-testid="settings-route-stub-orders" role="region" aria-label="共享控制台 - 订单中心">
              <h1>订单中心</h1>
            </section>
          )}
        />
        <Route
          path={API_KEYS_ROUTE}
          element={(
            <section data-testid="settings-route-stub-api-keys" role="region" aria-label="共享控制台 - API Keys">
              <h1>开发者 API 接入工作台</h1>
            </section>
          )}
        />
        <Route
          path={DOCS_ROUTE}
          element={(
            <section data-testid="settings-route-stub-docs" role="region" aria-label="共享控制台 - API 文档">
              <h1>API 文档与接入控制台</h1>
            </section>
          )}
        />
        <Route
          path={PROFILE_ROUTE}
          element={(
            <section data-testid="settings-route-stub-profile" role="region" aria-label="共享控制台 - 个人资料">
              <h1>个人资料</h1>
            </section>
          )}
        />
        <Route
          path={WEBHOOKS_ROUTE}
          element={(
            <section data-testid="settings-route-stub-webhooks" role="region" aria-label="共享控制台 - Webhooks">
              <h1>{webhookRouteTitleForCurrentRole()}</h1>
            </section>
          )}
        />
        <Route
          path="/supplier/resources"
          element={(
            <section data-testid="settings-route-stub-supplier-resources" role="region" aria-label="共享控制台 - 供应商资源">
              <h1>供应商资源</h1>
            </section>
          )}
        />
        <Route
          path="/supplier/settlements"
          element={(
            <section data-testid="settings-route-stub-supplier-settlements" role="region" aria-label="共享控制台 - 供应商结算">
              <h1>供应商结算</h1>
            </section>
          )}
        />
        <Route path={SETTINGS_ROUTE} element={<SettingsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SettingsPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('shows the user first-run checklist only for plain users and reopens onboarding inside the same shared console', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 11, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'projects', label: '项目市场', path: PROJECTS_ROUTE },
        { key: 'orders', label: '订单中心', path: ORDERS_ROUTE },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
        { key: 'settings', label: '设置中心', path: SETTINGS_ROUTE },
      ],
    })

    renderSettingsPage()

    expect(screen.getByRole('heading', { name: '首次使用清单' })).toBeInTheDocument()

    const checklistCard = screen.getByRole('region', { name: '首次使用清单' })
    const checklistScope = within(checklistCard)
    expect(checklistScope.getByRole('button', { name: '打开项目市场' })).toBeInTheDocument()
    expect(checklistScope.getByRole('button', { name: '查看订单中心' })).toBeInTheDocument()
    expect(checklistScope.getByText('3. 开发者 API 接入工作台')).toBeInTheDocument()
    expect(checklistScope.getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()

    await user.click(checklistScope.getByRole('button', { name: '打开项目市场' }))
    const projectsRegion = await screen.findByRole('region', { name: '共享控制台 - 项目市场' })
    expect(within(projectsRegion).getByRole('heading', { name: '项目市场' })).toBeInTheDocument()

    const settingsView = renderSettingsPage()
    const checklistCardAgain = await screen.findByRole('region', { name: '首次使用清单' })
    const checklistScopeAgain = within(checklistCardAgain)
    expect(checklistScopeAgain.getByRole('button', { name: '查看订单中心' })).toBeInTheDocument()
    expect(checklistScopeAgain.getByText('3. 开发者 API 接入工作台')).toBeInTheDocument()
    expect(checklistScopeAgain.getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()

    await user.click(getButtonByLabel(checklistScopeAgain, '重新打开首轮引导'))

    expect(window.localStorage.getItem(userFirstRunStorageKeyForUser(11))).toBe('false')
    const homeRegion = await screen.findByRole('region', { name: '共享控制台首页' })
    expect(screen.getByRole('heading', { name: '控制台总览' })).toBeInTheDocument()
    expect(within(homeRegion).queryByRole('button', { name: '查看供应商资源' })).not.toBeInTheDocument()
    expect(within(homeRegion).queryByRole('button', { name: '前往供应商结算' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '首次使用清单' })).not.toBeInTheDocument()
    settingsView.unmount()
  })

  it('shows a named continue-current-role lane with user next-step cards instead of only shortcut cards', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 25, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'projects', label: '项目市场', path: PROJECTS_ROUTE },
        { key: 'orders', label: '订单中心', path: ORDERS_ROUTE },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
        { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
        { key: 'settings', label: '设置中心', path: SETTINGS_ROUTE },
      ],
    })

    renderSettingsPage()

    const continueLane = await screen.findByRole('region', { name: '继续当前角色主路径' })
    const continueScope = within(continueLane)
    expect(continueScope.getByRole('heading', { name: '继续当前角色主路径' })).toBeInTheDocument()
    expect(continueScope.getByText('根据当前服务端角色与实际菜单，继续进入下一步工作区，而不是退回泛化的共享首页提示。')).toBeInTheDocument()
    expect(continueScope.getByTestId('settings-continue-console-step-projects')).toBeInTheDocument()
    expect(continueScope.getByTestId('settings-continue-console-step-orders')).toBeInTheDocument()
    expect(continueScope.getByTestId('settings-continue-console-step-api-keys')).toBeInTheDocument()
    expect(continueScope.getByRole('button', { name: /前往项目市场/ })).toBeInTheDocument()
    expect(continueScope.getByRole('button', { name: /查看订单中心/ })).toBeInTheDocument()
    expect(continueScope.getByRole('button', { name: /打开 API Keys/ })).toBeInTheDocument()
    expect(continueScope.queryByRole('button', { name: '查看供应商资源' })).not.toBeInTheDocument()
    expect(continueScope.queryByRole('button', { name: '查看风控中心' })).not.toBeInTheDocument()
  })

  it('shows supplier continue-current-role lane with supplier-only next steps inside the same shared console shell', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 26, email: 'supplier@nexus-mail.local', role: 'supplier' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'supplier-domains', label: '域名管理', path: '/supplier/domains' },
        { key: 'supplier-resources', label: '供应商资源', path: '/supplier/resources' },
        { key: 'supplier-settlements', label: '供应商结算', path: '/supplier/settlements' },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
        { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
        { key: 'settings', label: '设置中心', path: SETTINGS_ROUTE },
      ],
    })

    renderSettingsPage()

    const continueLane = await screen.findByRole('region', { name: '继续当前角色主路径' })
    const continueScope = within(continueLane)
    expect(continueScope.getByTestId('settings-continue-console-step-supplier-domains')).toBeInTheDocument()
    expect(continueScope.getByTestId('settings-continue-console-step-supplier-resources')).toBeInTheDocument()
    expect(continueScope.getByTestId('settings-continue-console-step-supplier-settlements')).toBeInTheDocument()
    expect(continueScope.getByRole('button', { name: /前往域名管理/ })).toBeInTheDocument()
    expect(continueScope.getByRole('button', { name: /查看供应商资源/ })).toBeInTheDocument()
    expect(continueScope.getByRole('button', { name: /前往供应商结算/ })).toBeInTheDocument()
    expect(continueScope.queryByRole('button', { name: '前往项目市场' })).not.toBeInTheDocument()
    expect(continueScope.queryByRole('button', { name: '查看风控中心' })).not.toBeInTheDocument()
  })

  it('shows admin continue-current-role lane with admin-only next steps inside the same shared console shell', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 27, email: 'admin@nexus-mail.local', role: 'admin' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'admin-suppliers', label: '供应商管理', path: '/admin/suppliers' },
        { key: 'admin-risk', label: '风控中心', path: '/admin/risk' },
        { key: 'admin-audit', label: '审计日志', path: '/admin/audit' },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
        { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
        { key: 'docs', label: 'API 文档', path: DOCS_ROUTE },
        { key: 'settings', label: '设置中心', path: SETTINGS_ROUTE },
      ],
    })

    renderSettingsPage()

    const continueLane = await screen.findByRole('region', { name: '继续当前角色主路径' })
    const continueScope = within(continueLane)
    expect(continueScope.getByTestId('settings-continue-console-step-admin-suppliers')).toBeInTheDocument()
    expect(continueScope.getByTestId('settings-continue-console-step-admin-risk')).toBeInTheDocument()
    expect(continueScope.getByTestId('settings-continue-console-step-admin-audit')).toBeInTheDocument()
    expect(continueScope.getByRole('button', { name: /前往供应商管理/ })).toBeInTheDocument()
    expect(continueScope.getByRole('button', { name: /查看风控中心/ })).toBeInTheDocument()
    expect(continueScope.getByRole('button', { name: /查看审计日志/ })).toBeInTheDocument()
    expect(continueScope.queryByRole('button', { name: '前往项目市场' })).not.toBeInTheDocument()
    expect(continueScope.queryByRole('button', { name: '查看供应商资源' })).not.toBeInTheDocument()
  })

  it('exposes the shared-console bridge as a named region with canonical role-aware mission cards for regular users', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 21, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'projects', label: '项目市场', path: PROJECTS_ROUTE },
        { key: 'orders', label: '订单中心', path: ORDERS_ROUTE },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
        { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
        { key: 'docs', label: 'API 文档', path: DOCS_ROUTE },
        { key: 'profile', label: '个人资料', path: PROFILE_ROUTE },
        { key: 'settings', label: '设置中心', path: SETTINGS_ROUTE },
      ],
    })

    renderSettingsPage()

    expect(await screen.findByRole('heading', { name: '设置中心' })).toBeInTheDocument()
    const heroCard = screen.getByTestId('settings-hero-card')
    expect(within(heroCard).getByText('设置中枢')).toBeInTheDocument()
    expect(within(heroCard).getByText('接入与账户设置不再停留在浅色占位页，而是收敛为与仪表盘一致的深色共享控制台工作台。')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '当前登录会话' })).toBeInTheDocument()
    expect(screen.getByText('控制台运行快捷入口')).toBeInTheDocument()

    const capabilityMatrix = screen.getByRole('region', { name: '控制台能力矩阵' })
    expect(within(capabilityMatrix).getByRole('heading', { name: '控制台能力矩阵' })).toBeInTheDocument()
    expect(within(capabilityMatrix).getAllByText('统一身份入口').length).toBeGreaterThan(0)
    expect(within(capabilityMatrix).getAllByText('共享接入桥接').length).toBeGreaterThan(0)
    expect(within(capabilityMatrix).getAllByText('角色菜单扩展').length).toBeGreaterThan(0)
    expect(within(capabilityMatrix).queryByText('账号入口')).not.toBeInTheDocument()
    expect(within(capabilityMatrix).queryByText('集成入口')).not.toBeInTheDocument()
    expect(within(capabilityMatrix).queryByText('文档入口')).not.toBeInTheDocument()

    const sharedBridge = screen.getByRole('region', { name: '共享接入桥接' })
    expect(within(sharedBridge).getByRole('heading', { name: '共享接入桥接' })).toBeInTheDocument()
    expect(within(sharedBridge).getByRole('heading', { name: '当前已开放的接入入口' })).toBeInTheDocument()
    expect(within(sharedBridge).getByText('从设置中心直接进入当前账号已开放的接入入口，继续在同一登录后的共享控制台内完成接入核对。')).toBeInTheDocument()
    expect(within(sharedBridge).queryByText('从设置中心直接进入当前账号已开放的 API Keys、Webhook 与文档入口，继续在同一登录后的共享控制台内完成接入核对。')).not.toBeInTheDocument()
    expect(within(sharedBridge).getByRole('button', { name: /打开 API Keys/ })).toBeInTheDocument()
    expect(within(sharedBridge).getByRole('button', { name: /继续配置 Webhook/ })).toBeInTheDocument()
    expect(within(sharedBridge).getByRole('button', { name: /查看 API 文档/ })).toBeInTheDocument()
    expect(within(sharedBridge).getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()
    expect(within(sharedBridge).getByRole('heading', { name: '开发者 Webhook 接入工作台' })).toBeInTheDocument()
    expect(within(sharedBridge).getByRole('heading', { name: 'API 文档与接入控制台' })).toBeInTheDocument()

    const sessionCard = screen.getByRole('region', { name: '当前登录会话' })
    expect(within(sessionCard).getByRole('heading', { name: '当前登录会话' })).toBeInTheDocument()
    expect(within(sessionCard).getByText('控制台模式')).toBeInTheDocument()
    expect(within(sessionCard).getByText('共享接入桥接')).toBeInTheDocument()
    expect(within(sessionCard).queryByText('文档入口')).not.toBeInTheDocument()
    expect(within(sharedBridge).getByRole('button', { name: /打开 API Keys/ })).toBeInTheDocument()
    expect(within(sharedBridge).getByRole('button', { name: /继续配置 Webhook/ })).toBeInTheDocument()
    expect(within(sharedBridge).getByRole('button', { name: /查看 API 文档/ })).toBeInTheDocument()

    const shortcutLane = screen.getByTestId('settings-shortcut-cards')
    expect(within(shortcutLane).getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()
    expect(within(shortcutLane).getByRole('heading', { name: '开发者 Webhook 接入工作台' })).toBeInTheDocument()
    expect(within(shortcutLane).getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()
    expect(within(shortcutLane).getByRole('button', { name: '继续配置 Webhook' })).toBeInTheDocument()
    expect(within(shortcutLane).queryByRole('button', { name: '管理 API Keys' })).not.toBeInTheDocument()
    expect(within(shortcutLane).queryByRole('button', { name: '打开 Webhook 设置' })).not.toBeInTheDocument()

    await user.click(within(sharedBridge).getByRole('button', { name: /查看 API 文档/ }))
    const docsRegion = await screen.findByRole('region', { name: '共享控制台 - API 文档' })
    expect(within(docsRegion).getByRole('heading', { name: 'API 文档与接入控制台' })).toBeInTheDocument()
  })

  it('keeps settings runtime shortcuts limited to a named shared-console shortcut region with only currently visible route cards', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 24, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'profile', label: '个人资料', path: PROFILE_ROUTE },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
        { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
        { key: 'docs', label: 'API 文档', path: DOCS_ROUTE },
        { key: 'settings', label: '设置中心', path: SETTINGS_ROUTE },
      ],
    })

    renderSettingsPage()

    expect(await screen.findByRole('heading', { name: '设置中心' })).toBeInTheDocument()
    const shortcutLane = await screen.findByRole('region', { name: '控制台运行快捷入口' })
    const shortcutScope = within(shortcutLane)

    expect(shortcutScope.getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()
    expect(shortcutScope.getByRole('heading', { name: '开发者 Webhook 接入工作台' })).toBeInTheDocument()
    expect(shortcutScope.queryByRole('heading', { name: 'API 文档与接入控制台' })).not.toBeInTheDocument()
    expect(shortcutScope.queryByRole('heading', { name: '共享路由常驻同一壳' })).not.toBeInTheDocument()
    expect(shortcutScope.queryByRole('heading', { name: '共享接入桥接' })).not.toBeInTheDocument()
    expect(shortcutScope.queryByRole('button', { name: '查看 API 文档' })).not.toBeInTheDocument()
    expect(shortcutScope.queryByRole('button', { name: '打开项目市场' })).not.toBeInTheDocument()
  })

  it('keeps the shared bridge visible as a named explanatory region even when the current account has no integration mission cards exposed by the server menu', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 23, email: 'limited@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'settings', label: '设置中心', path: SETTINGS_ROUTE },
      ],
    })

    renderSettingsPage()

    expect(await screen.findByRole('heading', { name: '设置中心' })).toBeInTheDocument()
    const sharedBridge = screen.getByRole('region', { name: '共享接入桥接' })
    expect(sharedBridge).toBeInTheDocument()
    expect(within(sharedBridge).getByRole('heading', { name: '共享接入桥接' })).toBeInTheDocument()
    expect(within(sharedBridge).getByRole('heading', { name: '当前已开放的接入入口' })).toBeInTheDocument()
    expect(within(sharedBridge).queryByRole('button', { name: /打开 API Keys/ })).not.toBeInTheDocument()
    expect(within(sharedBridge).queryByRole('button', { name: /继续配置 Webhook/ })).not.toBeInTheDocument()
    expect(within(sharedBridge).queryByRole('button', { name: /查看 API 文档/ })).not.toBeInTheDocument()
  })

  it('navigates from the regular-user shortcut lane into the canonical api keys workspace', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 22, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
        { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
        { key: 'profile', label: '个人资料', path: PROFILE_ROUTE },
        { key: 'settings', label: '设置中心', path: SETTINGS_ROUTE },
      ],
    })

    renderSettingsPage()

    expect(await screen.findByRole('heading', { name: '设置中心' })).toBeInTheDocument()
    const shortcutLane = screen.getByTestId('settings-shortcut-cards')
    await user.click(within(shortcutLane).getByRole('button', { name: '打开 API Keys' }))
    const apiKeysRegion = await screen.findByRole('region', { name: '共享控制台 - API Keys' })
    expect(within(apiKeysRegion).getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()
  })

  it('hides the user first-run checklist for supplier users while keeping supplier/shared shortcuts scoped to the runtime shortcut lane', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 12, email: 'supplier@nexus-mail.local', role: 'supplier' },
      menu: [
        { key: 'profile', label: '个人资料', path: PROFILE_ROUTE },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
        { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
        { key: 'docs', label: 'API 文档', path: DOCS_ROUTE },
        { key: 'supplier-resources', label: '供应商资源', path: '/supplier/resources' },
        { key: 'supplier-settlements', label: '供应商结算', path: '/supplier/settlements' },
      ],
    })

    renderSettingsPage()

    expect(await screen.findByText('设置中心')).toBeInTheDocument()
    expect(screen.queryByTestId('settings-user-first-run-checklist')).not.toBeInTheDocument()
    expect(screen.getByText('控制台运行快捷入口')).toBeInTheDocument()

    const shortcutLane = screen.getByTestId('settings-shortcut-cards')
    expect(within(shortcutLane).getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()
    expect(within(shortcutLane).getByRole('heading', { name: '供给事件回调工作台' })).toBeInTheDocument()
    expect(within(shortcutLane).getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()
    expect(within(shortcutLane).getByRole('button', { name: '继续配置 Webhook' })).toBeInTheDocument()
    expect(within(shortcutLane).getByRole('button', { name: '查看供应商资源' })).toBeInTheDocument()
    expect(within(shortcutLane).getByRole('button', { name: '前往供应商结算' })).toBeInTheDocument()
    expect(within(shortcutLane).queryByRole('button', { name: '管理 API Keys' })).not.toBeInTheDocument()
    expect(within(shortcutLane).queryByRole('button', { name: '打开 Webhook 设置' })).not.toBeInTheDocument()
    expect(within(shortcutLane).queryByRole('button', { name: '打开项目市场' })).not.toBeInTheDocument()

    await user.click(within(shortcutLane).getByRole('button', { name: '继续配置 Webhook' }))
    const supplierWebhookRegion = await screen.findByRole('region', { name: '共享控制台 - Webhooks' })
    expect(within(supplierWebhookRegion).getByRole('heading', { name: '供给事件回调工作台' })).toBeInTheDocument()
  })

  it('keeps only one admin webhook shortcut and aligns it to the canonical role-aware shared-console identity', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 13, email: 'admin@nexus-mail.local', role: 'admin' },
      menu: [
        { key: 'profile', label: '个人资料', path: PROFILE_ROUTE },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
        { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
        { key: 'docs', label: 'API 文档', path: DOCS_ROUTE },
        { key: 'admin-risk', label: '风控中心', path: '/admin/risk' },
        { key: 'admin-audit', label: '审计日志', path: '/admin/audit' },
        { key: 'settings', label: '设置中心', path: SETTINGS_ROUTE },
      ],
    })

    renderSettingsPage()

    expect(await screen.findByRole('heading', { name: '设置中心' })).toBeInTheDocument()
    const shortcutLane = screen.getByTestId('settings-shortcut-cards')
    expect(within(shortcutLane).getByRole('heading', { name: 'Webhook 运维与回调观测' })).toBeInTheDocument()
    expect(within(shortcutLane).getAllByRole('button', { name: '继续配置 Webhook' })).toHaveLength(1)
    expect(within(shortcutLane).queryByRole('heading', { name: 'Webhook 回调工作台' })).not.toBeInTheDocument()
    expect(within(shortcutLane).queryByRole('heading', { name: 'Webhook 观测' })).not.toBeInTheDocument()
    expect(within(shortcutLane).queryByRole('button', { name: '打开 Webhook 设置' })).not.toBeInTheDocument()

    await user.click(within(shortcutLane).getByRole('button', { name: '继续配置 Webhook' }))
    const adminWebhookRegion = await screen.findByRole('region', { name: '共享控制台 - Webhooks' })
    expect(within(adminWebhookRegion).getByRole('heading', { name: 'Webhook 运维与回调观测' })).toBeInTheDocument()
  })
})
