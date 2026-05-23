import '@testing-library/jest-dom'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiDocsPage } from './ApiDocsPage'
import { useAuthStore } from '../store/authStore'
import { API_KEYS_ROUTE, BALANCE_ROUTE, DOCS_ROUTE, PROJECTS_ROUTE, WEBHOOKS_ROUTE } from '../utils/consoleNavigation'

function renderApiDocsPage(initialEntry = DOCS_ROUTE) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route
          path={PROJECTS_ROUTE}
          element={(
            <section data-testid="projects-route-stub" role="region" aria-label="共享控制台 - 项目市场">
              <h1>项目市场</h1>
            </section>
          )}
        />
        <Route
          path={BALANCE_ROUTE}
          element={(
            <section data-testid="balance-route-stub" role="region" aria-label="共享控制台 - 余额中心">
              <h1>余额中心</h1>
            </section>
          )}
        />
        <Route
          path={API_KEYS_ROUTE}
          element={(
            <section data-testid="api-keys-route-stub" role="region" aria-label="共享控制台 - API Keys">
              <h1>开发者 API 接入工作台</h1>
            </section>
          )}
        />
        <Route
          path={WEBHOOKS_ROUTE}
          element={(
            <section data-testid="webhooks-route-stub" role="region" aria-label="共享控制台 - Webhooks">
              <h1>开发者 Webhook 接入工作台</h1>
            </section>
          )}
        />
        <Route path={DOCS_ROUTE} element={<ApiDocsPage />} />
        <Route
          path="/"
          element={(
            <section data-testid="shared-console-home" role="region" aria-label="共享控制台首页">
              <h1>控制台总览</h1>
            </section>
          )}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ApiDocsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders a dark shared-console capability matrix with canonical docs, API Keys, and Webhook surfaces for regular users, and navigates to API keys', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 31, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'projects', label: '项目市场', path: PROJECTS_ROUTE },
        { key: 'balance', label: '余额中心', path: BALANCE_ROUTE },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
        { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
        { key: 'docs', label: 'API 文档', path: DOCS_ROUTE },
      ],
    })

    renderApiDocsPage()

    const heroCard = screen.getByRole('region', { name: 'API 文档页入口概览' })
    const heroScope = within(heroCard)
    expect(heroCard).toHaveAttribute('role', 'region')
    expect(heroCard).toHaveAttribute('aria-label', 'API 文档页入口概览')
    expect(heroScope.getByText('共享控制台 · API 契约')).toBeInTheDocument()
    expect(heroScope.getByRole('heading', { level: 3, name: 'API 文档与接入控制台' })).toBeInTheDocument()
    expect(heroScope.getByText('公开文档、API Keys、Webhook 联调与真实订单回放保持在同一套深色共享控制台里，不再跳到独立后台或外置说明页。')).toBeInTheDocument()
    expect(heroScope.getByText('注册后连续路径')).toBeInTheDocument()
    expect(heroScope.getByText('统一接入路径')).toBeInTheDocument()
    expect(heroScope.getByText('真实 API 回放仍在同一控制台继续完成')).toBeInTheDocument()
    expect(heroScope.getByText('保持注册 → API Keys → Webhooks → Docs 的连续路径，再回到项目市场与订单中心验证真实业务链路。')).toBeInTheDocument()

    expect(screen.getByTitle('nexus-mail-api-docs')).toHaveAttribute('src', '/openapi/index.html')

    const capabilityMatrixRegion = screen.getByRole('region', { name: '控制台能力矩阵' })
    const capabilityMatrixScope = within(capabilityMatrixRegion)
    expect(capabilityMatrixScope.getByRole('heading', { name: '控制台能力矩阵' })).toBeInTheDocument()
    expect(capabilityMatrixScope.getByText('统一文档入口')).toBeInTheDocument()
    expect(capabilityMatrixScope.getByText('共享接入桥接')).toBeInTheDocument()
    expect(capabilityMatrixScope.getByText('角色菜单扩展')).toBeInTheDocument()
    expect(capabilityMatrixScope.getByText('文档、密钥与回调仍在同一套深色控制台内完成核对与联调。')).toBeInTheDocument()
    expect(capabilityMatrixScope.getByText('API 文档与接入控制台')).toBeInTheDocument()
    expect(capabilityMatrixScope.getByText('开发者 API 接入工作台')).toBeInTheDocument()
    expect(capabilityMatrixScope.getByText('开发者 Webhook 接入工作台')).toBeInTheDocument()
    expect(capabilityMatrixScope.queryByText('共享控制台能力矩阵')).not.toBeInTheDocument()
    expect(capabilityMatrixScope.queryByText('API Keys')).not.toBeInTheDocument()
    expect(capabilityMatrixScope.queryByText('Webhook 设置')).not.toBeInTheDocument()
    expect(capabilityMatrixScope.queryByText('最小权限 API Key')).not.toBeInTheDocument()
    expect(capabilityMatrixScope.queryByText('真实回调验证')).not.toBeInTheDocument()

    const bridgeRegion = screen.getByRole('region', { name: '共享接入桥接' })
    expect(within(bridgeRegion).getByText('共享接入桥接')).toBeInTheDocument()
    expect(within(bridgeRegion).queryByText('共享控制台接入桥')).not.toBeInTheDocument()
    expect(within(bridgeRegion).getByRole('heading', { name: '文档、接入与回调共用一套共享控制台' })).toBeInTheDocument()
    expect(within(bridgeRegion).getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()
    expect(within(bridgeRegion).getByRole('heading', { name: '开发者 Webhook 接入工作台' })).toBeInTheDocument()
    expect(within(bridgeRegion).queryByRole('heading', { name: '最小权限 API Key' })).not.toBeInTheDocument()
    expect(within(bridgeRegion).queryByRole('heading', { name: '真实回调验证' })).not.toBeInTheDocument()
    expect(within(bridgeRegion).getByRole('button', { name: '查看项目市场基线' })).toBeInTheDocument()
    expect(within(bridgeRegion).getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()
    expect(within(bridgeRegion).getByRole('button', { name: '继续配置 Webhook' })).toBeInTheDocument()
    expect(within(bridgeRegion).queryByRole('button', { name: '打开 API Keys 工作台' })).not.toBeInTheDocument()
    expect(within(bridgeRegion).queryByRole('button', { name: '打开 Webhook 设置' })).not.toBeInTheDocument()
    expect(within(bridgeRegion).queryByRole('button', { name: '返回共享工作台' })).not.toBeInTheDocument()

    const loopRegion = screen.getByRole('region', { name: '文档核对后继续沿共享控制台接入链路推进' })
    expect(within(loopRegion).getByRole('heading', { name: '文档核对后继续沿共享控制台接入链路推进' })).toBeInTheDocument()
    expect(within(loopRegion).getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()
    expect(within(loopRegion).getByRole('heading', { name: '开发者 Webhook 接入工作台' })).toBeInTheDocument()
    expect(within(loopRegion).queryByRole('heading', { name: '最小权限 API Key' })).not.toBeInTheDocument()
    expect(within(loopRegion).queryByRole('heading', { name: '真实回调验证' })).not.toBeInTheDocument()
    expect(within(loopRegion).getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()
    expect(within(loopRegion).getByRole('button', { name: '继续配置 Webhook' })).toBeInTheDocument()
    expect(within(loopRegion).getByRole('button', { name: '返回共享工作台' })).toBeInTheDocument()
    expect(within(loopRegion).queryByRole('button', { name: '打开 API Keys 工作台' })).not.toBeInTheDocument()
    expect(within(loopRegion).queryByRole('button', { name: '打开 Webhook 设置' })).not.toBeInTheDocument()

    await user.click(within(loopRegion).getByRole('button', { name: '打开 API Keys' }))
    const apiKeysRegion = await screen.findByRole('region', { name: '共享控制台 - API Keys' })
    expect(within(apiKeysRegion).getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()
  })

  it('shows role-aware admin shortcuts with the semantic docs heading and without leaking unavailable actions', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 32, email: 'admin@nexus-mail.local', role: 'admin' },
      menu: [
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
        { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
        { key: 'docs', label: 'API 文档', path: DOCS_ROUTE },
      ],
    })

    renderApiDocsPage()

    expect(screen.getByRole('heading', { level: 3, name: 'API 文档与接入控制台' })).toBeInTheDocument()
    expect(await screen.findByLabelText('Tag: 管理员扩展 · API 契约')).toBeInTheDocument()
    expect(screen.getByTitle('nexus-mail-api-docs')).toHaveAttribute('src', '/openapi/index.html')

    const capabilityMatrixScope = within(screen.getByRole('region', { name: '控制台能力矩阵' }))
    expect(capabilityMatrixScope.getByRole('heading', { name: '控制台能力矩阵' })).toBeInTheDocument()
    expect(capabilityMatrixScope.getByText('开发者 API 接入工作台')).toBeInTheDocument()
    expect(capabilityMatrixScope.getByText('Webhook 运维与回调观测')).toBeInTheDocument()
    expect(capabilityMatrixScope.queryByText('API Keys')).not.toBeInTheDocument()
    expect(capabilityMatrixScope.queryByText('Webhook 设置')).not.toBeInTheDocument()
    expect(capabilityMatrixScope.queryByText('最小权限 API Key')).not.toBeInTheDocument()
    expect(capabilityMatrixScope.queryByText('真实回调验证')).not.toBeInTheDocument()

    const bridgeRegion = screen.getByRole('region', { name: '共享接入桥接' })
    expect(within(bridgeRegion).getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()
    expect(within(bridgeRegion).getByRole('button', { name: '继续配置 Webhook' })).toBeInTheDocument()
    expect(within(bridgeRegion).queryByRole('button', { name: '查看项目市场基线' })).not.toBeInTheDocument()
  })

  it('renders a shared-console bridge lane that links docs back to marketplace, api keys, webhook, and finance workbenches', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 34, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'projects', label: '项目市场', path: PROJECTS_ROUTE },
        { key: 'balance', label: '余额中心', path: BALANCE_ROUTE },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
        { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
        { key: 'docs', label: 'API 文档', path: DOCS_ROUTE },
      ],
    })

    let view = renderApiDocsPage()
    expect(await screen.findByRole('region', { name: '共享接入桥接' })).toBeInTheDocument()
    const bridgeRegion = screen.getByRole('region', { name: '共享接入桥接' })
    const scoped = within(bridgeRegion)
    expect(scoped.getByRole('heading', { name: '项目市场基线' })).toBeInTheDocument()
    expect(scoped.getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()
    expect(scoped.getByRole('heading', { name: '开发者 Webhook 接入工作台' })).toBeInTheDocument()
    expect(scoped.getByRole('heading', { name: '余额中心' })).toBeInTheDocument()
    expect(scoped.getByRole('button', { name: '查看项目市场基线' })).toBeInTheDocument()
    expect(scoped.getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()
    expect(scoped.getByRole('button', { name: '继续配置 Webhook' })).toBeInTheDocument()
    expect(scoped.getByRole('button', { name: '打开余额中心' })).toBeInTheDocument()

    await user.click(scoped.getByRole('button', { name: '查看项目市场基线' }))
    const projectsRegion = await screen.findByRole('region', { name: '共享控制台 - 项目市场' })
    expect(within(projectsRegion).getByRole('heading', { name: '项目市场' })).toBeInTheDocument()

    view.unmount()
    view = renderApiDocsPage()
    expect(await screen.findByRole('region', { name: '共享接入桥接' })).toBeInTheDocument()
    const secondBridgeRegion = screen.getByRole('region', { name: '共享接入桥接' })
    await user.click(within(secondBridgeRegion).getByRole('button', { name: '打开 API Keys' }))
    const apiKeysRegion = await screen.findByRole('region', { name: '共享控制台 - API Keys' })
    expect(within(apiKeysRegion).getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()

    view.unmount()
    view = renderApiDocsPage()
    expect(await screen.findByRole('region', { name: '共享接入桥接' })).toBeInTheDocument()
    const thirdBridgeRegion = screen.getByRole('region', { name: '共享接入桥接' })
    await user.click(within(thirdBridgeRegion).getByRole('button', { name: '继续配置 Webhook' }))
    const webhooksRegion = await screen.findByRole('region', { name: '共享控制台 - Webhooks' })
    expect(within(webhooksRegion).getByRole('heading', { name: '开发者 Webhook 接入工作台' })).toBeInTheDocument()

    view.unmount()
    view = renderApiDocsPage()
    expect(await screen.findByRole('region', { name: '共享接入桥接' })).toBeInTheDocument()
    const fourthBridgeRegion = screen.getByRole('region', { name: '共享接入桥接' })
    await user.click(within(fourthBridgeRegion).getByRole('button', { name: '打开余额中心' }))
    const balanceRegion = await screen.findByRole('region', { name: '共享控制台 - 余额中心' })
    expect(within(balanceRegion).getByRole('heading', { name: '余额中心' })).toBeInTheDocument()
  })

  it('exposes the docs continuation lane as a named shared-console region with fallback CTA gated to the fallback card only', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 36, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
        { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
        { key: 'docs', label: 'API 文档', path: DOCS_ROUTE },
      ],
    })

    renderApiDocsPage()

    const loopRegion = screen.getByRole('region', { name: '文档核对后继续沿共享控制台接入链路推进' })
    const loopScope = within(loopRegion)
    expect(loopScope.getByRole('heading', { name: '文档核对后继续沿共享控制台接入链路推进' })).toBeInTheDocument()
    expect(loopRegion).toHaveTextContent('读完 API 文档后，继续回到 API Keys、Webhook 与共享工作台推进真实联调，让文档始终服务同一套接入链路。')
    expect(loopScope.getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()
    expect(loopScope.getByRole('button', { name: '继续配置 Webhook' })).toBeInTheDocument()
    expect(loopScope.getByRole('button', { name: '返回共享工作台' })).toBeInTheDocument()
    expect(loopScope.queryByRole('button', { name: '打开 API Keys 工作台' })).not.toBeInTheDocument()
    expect(loopScope.queryByRole('button', { name: '打开 Webhook 设置' })).not.toBeInTheDocument()

    await user.click(loopScope.getByRole('button', { name: '返回共享工作台' }))
    expect(await screen.findByRole('region', { name: '共享控制台首页' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '共享控制台首页' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '控制台总览' })).toBeInTheDocument()
  })

  it('falls back to the preferred shared workspace when bridge destinations are unavailable', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 35, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'docs', label: 'API 文档', path: DOCS_ROUTE },
      ],
    })

    renderApiDocsPage()

    expect(await screen.findByRole('region', { name: '共享接入桥接' })).toBeInTheDocument()
    const bridgeRegion = screen.getByRole('region', { name: '共享接入桥接' })
    expect(within(bridgeRegion).getByText('共享接入桥接')).toBeInTheDocument()
    expect(within(bridgeRegion).queryByText('共享控制台接入桥')).not.toBeInTheDocument()
    expect(within(bridgeRegion).getByRole('button', { name: '返回共享工作台' })).toBeInTheDocument()
    expect(within(bridgeRegion).queryByRole('button', { name: '查看项目市场基线' })).not.toBeInTheDocument()
    expect(within(bridgeRegion).queryByRole('button', { name: '打开 API Keys' })).not.toBeInTheDocument()
    expect(within(bridgeRegion).queryByRole('button', { name: '继续配置 Webhook' })).not.toBeInTheDocument()
    expect(within(bridgeRegion).queryByRole('button', { name: '打开余额中心' })).not.toBeInTheDocument()

    const loopRegion = screen.getByRole('region', { name: '文档核对后继续沿共享控制台接入链路推进' })
    expect(within(loopRegion).getByRole('button', { name: '返回共享工作台' })).toBeInTheDocument()
    expect(within(loopRegion).queryByRole('button', { name: '打开 API Keys 工作台' })).not.toBeInTheDocument()
    expect(within(loopRegion).queryByRole('button', { name: '打开 Webhook 设置' })).not.toBeInTheDocument()

    await user.click(within(loopRegion).getByRole('button', { name: '返回共享工作台' }))
    expect(await screen.findByRole('region', { name: '共享控制台首页' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '共享控制台首页' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '控制台总览' })).toBeInTheDocument()
  })

  it('keeps docs-to-integration loop actions inside the shared console after reading docs', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 36, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'projects', label: '项目市场', path: PROJECTS_ROUTE },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
        { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
        { key: 'docs', label: 'API 文档', path: DOCS_ROUTE },
      ],
    })

    let view = renderApiDocsPage()
    expect(await screen.findByRole('region', { name: '文档核对后继续沿共享控制台接入链路推进' })).toBeInTheDocument()

    let loopRegion = screen.getByRole('region', { name: '文档核对后继续沿共享控制台接入链路推进' })
    expect(within(loopRegion).getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()
    expect(within(loopRegion).getByRole('heading', { name: '开发者 Webhook 接入工作台' })).toBeInTheDocument()
    expect(within(loopRegion).getByRole('heading', { name: '返回共享工作台' })).toBeInTheDocument()
    expect(within(loopRegion).getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()
    expect(within(loopRegion).getByRole('button', { name: '继续配置 Webhook' })).toBeInTheDocument()
    expect(within(loopRegion).getByRole('button', { name: '返回共享工作台' })).toBeInTheDocument()
    await user.click(within(loopRegion).getByRole('button', { name: '打开 API Keys' }))
    const apiKeysRegion = await screen.findByRole('region', { name: '共享控制台 - API Keys' })
    expect(within(apiKeysRegion).getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()

    view.unmount()
    view = renderApiDocsPage()
    expect(await screen.findByRole('region', { name: '文档核对后继续沿共享控制台接入链路推进' })).toBeInTheDocument()
    loopRegion = screen.getByRole('region', { name: '文档核对后继续沿共享控制台接入链路推进' })
    await user.click(within(loopRegion).getByRole('button', { name: '继续配置 Webhook' }))
    const webhooksRegion = await screen.findByRole('region', { name: '共享控制台 - Webhooks' })
    expect(within(webhooksRegion).getByRole('heading', { name: '开发者 Webhook 接入工作台' })).toBeInTheDocument()

    view.unmount()
    view = renderApiDocsPage()
    expect(await screen.findByRole('region', { name: '文档核对后继续沿共享控制台接入链路推进' })).toBeInTheDocument()
    loopRegion = screen.getByRole('region', { name: '文档核对后继续沿共享控制台接入链路推进' })
    await user.click(within(loopRegion).getByRole('button', { name: '返回共享工作台' }))
    expect(await screen.findByRole('region', { name: '共享控制台首页' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '共享控制台首页' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '控制台总览' })).toBeInTheDocument()
  })
})
