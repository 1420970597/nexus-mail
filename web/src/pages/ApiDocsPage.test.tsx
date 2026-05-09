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
            <section data-testid="projects-route-stub">
              <h1>项目市场</h1>
            </section>
          )}
        />
        <Route
          path={BALANCE_ROUTE}
          element={(
            <section data-testid="balance-route-stub">
              <h1>余额中心</h1>
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
        <Route path={DOCS_ROUTE} element={<ApiDocsPage />} />
        <Route
          path="/"
          element={(
            <section data-testid="shared-console-home">
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

  it('renders a shared-console docs workspace with canonical bridge and loop CTAs for regular users, and navigates to API keys', async () => {
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

    expect(screen.getByRole('heading', { level: 3, name: 'API 文档与接入控制台' })).toBeInTheDocument()
    expect(screen.getByTitle('nexus-mail-api-docs')).toHaveAttribute('src', '/openapi/index.html')

    const capabilityMatrixScope = within(screen.getByTestId('docs-capability-matrix'))
    expect(capabilityMatrixScope.getByText('API 文档与接入控制台')).toBeInTheDocument()
    expect(capabilityMatrixScope.getByText('开发者 API 接入工作台')).toBeInTheDocument()
    expect(capabilityMatrixScope.getByText('开发者 Webhook 接入工作台')).toBeInTheDocument()
    expect(capabilityMatrixScope.queryByText('API Keys')).not.toBeInTheDocument()
    expect(capabilityMatrixScope.queryByText('Webhook 设置')).not.toBeInTheDocument()
    expect(capabilityMatrixScope.queryByText('最小权限 API Key')).not.toBeInTheDocument()
    expect(capabilityMatrixScope.queryByText('真实回调验证')).not.toBeInTheDocument()

    const bridgeLane = screen.getByTestId('docs-shared-console-bridge')
    expect(within(bridgeLane).getByText('共享控制台联调桥')).toBeInTheDocument()
    expect(within(bridgeLane).getByRole('heading', { name: '文档、业务与回调共用一套控制台' })).toBeInTheDocument()
    expect(within(bridgeLane).getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()
    expect(within(bridgeLane).getByRole('heading', { name: '开发者 Webhook 接入工作台' })).toBeInTheDocument()
    expect(within(bridgeLane).queryByRole('heading', { name: '最小权限 API Key' })).not.toBeInTheDocument()
    expect(within(bridgeLane).queryByRole('heading', { name: '真实回调验证' })).not.toBeInTheDocument()
    expect(within(bridgeLane).getByRole('button', { name: '查看项目市场基线' })).toBeInTheDocument()
    expect(within(bridgeLane).getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()
    expect(within(bridgeLane).getByRole('button', { name: '继续配置 Webhook' })).toBeInTheDocument()
    expect(within(bridgeLane).queryByRole('button', { name: '打开 API Keys 工作台' })).not.toBeInTheDocument()
    expect(within(bridgeLane).queryByRole('button', { name: '打开 Webhook 设置' })).not.toBeInTheDocument()
    expect(within(bridgeLane).queryByRole('button', { name: '返回共享工作台' })).not.toBeInTheDocument()

    const loopLane = screen.getByTestId('docs-shared-console-loop')
    expect(within(loopLane).getByRole('heading', { name: '文档与接入工作台继续保持单壳闭环' })).toBeInTheDocument()
    expect(within(loopLane).getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()
    expect(within(loopLane).getByRole('heading', { name: '开发者 Webhook 接入工作台' })).toBeInTheDocument()
    expect(within(loopLane).queryByRole('heading', { name: '最小权限 API Key' })).not.toBeInTheDocument()
    expect(within(loopLane).queryByRole('heading', { name: '真实回调验证' })).not.toBeInTheDocument()
    expect(within(loopLane).getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()
    expect(within(loopLane).getByRole('button', { name: '继续配置 Webhook' })).toBeInTheDocument()
    expect(within(loopLane).getByRole('button', { name: '返回共享工作台' })).toBeInTheDocument()
    expect(within(loopLane).queryByRole('button', { name: '打开 API Keys 工作台' })).not.toBeInTheDocument()
    expect(within(loopLane).queryByRole('button', { name: '打开 Webhook 设置' })).not.toBeInTheDocument()

    await user.click(within(loopLane).getByRole('button', { name: '打开 API Keys' }))
    expect(await screen.findByTestId('api-keys-route-stub')).toBeInTheDocument()
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

    const capabilityMatrixScope = within(screen.getByTestId('docs-capability-matrix'))
    expect(capabilityMatrixScope.getByText('API 文档与接入控制台')).toBeInTheDocument()
    expect(capabilityMatrixScope.getByText('开发者 API 接入工作台')).toBeInTheDocument()
    expect(capabilityMatrixScope.getByText('Webhook 运维与回调观测')).toBeInTheDocument()
    expect(capabilityMatrixScope.queryByText('API Keys')).not.toBeInTheDocument()
    expect(capabilityMatrixScope.queryByText('Webhook 设置')).not.toBeInTheDocument()
    expect(capabilityMatrixScope.queryByText('最小权限 API Key')).not.toBeInTheDocument()
    expect(capabilityMatrixScope.queryByText('真实回调验证')).not.toBeInTheDocument()

    const bridgeLane = screen.getByTestId('docs-shared-console-bridge')
    expect(within(bridgeLane).getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()
    expect(within(bridgeLane).getByRole('button', { name: '继续配置 Webhook' })).toBeInTheDocument()
    expect(within(bridgeLane).queryByRole('button', { name: '查看项目市场基线' })).not.toBeInTheDocument()
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
    expect(await screen.findByTestId('docs-shared-console-bridge')).toBeInTheDocument()
    const bridgeLane = screen.getByTestId('docs-shared-console-bridge')
    const scoped = within(bridgeLane)
    expect(scoped.getByRole('heading', { name: '项目市场基线' })).toBeInTheDocument()
    expect(scoped.getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()
    expect(scoped.getByRole('heading', { name: '开发者 Webhook 接入工作台' })).toBeInTheDocument()
    expect(scoped.getByRole('heading', { name: '余额中心' })).toBeInTheDocument()
    expect(scoped.getByRole('button', { name: '查看项目市场基线' })).toBeInTheDocument()
    expect(scoped.getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()
    expect(scoped.getByRole('button', { name: '继续配置 Webhook' })).toBeInTheDocument()
    expect(scoped.getByRole('button', { name: '打开余额中心' })).toBeInTheDocument()

    await user.click(scoped.getByRole('button', { name: '查看项目市场基线' }))
    expect(await screen.findByTestId('projects-route-stub')).toBeInTheDocument()

    view.unmount()
    view = renderApiDocsPage()
    expect(await screen.findByTestId('docs-shared-console-bridge')).toBeInTheDocument()
    const secondBridgeLane = screen.getByTestId('docs-shared-console-bridge')
    await user.click(within(secondBridgeLane).getByRole('button', { name: '打开 API Keys' }))
    expect(await screen.findByTestId('api-keys-route-stub')).toBeInTheDocument()
    expect(screen.getByText('开发者 API 接入工作台')).toBeInTheDocument()

    view.unmount()
    view = renderApiDocsPage()
    expect(await screen.findByTestId('docs-shared-console-bridge')).toBeInTheDocument()
    const thirdBridgeLane = screen.getByTestId('docs-shared-console-bridge')
    await user.click(within(thirdBridgeLane).getByRole('button', { name: '继续配置 Webhook' }))
    expect(await screen.findByTestId('webhooks-route-stub')).toBeInTheDocument()

    view.unmount()
    view = renderApiDocsPage()
    expect(await screen.findByTestId('docs-shared-console-bridge')).toBeInTheDocument()
    const fourthBridgeLane = screen.getByTestId('docs-shared-console-bridge')
    await user.click(within(fourthBridgeLane).getByRole('button', { name: '打开余额中心' }))
    expect(await screen.findByTestId('balance-route-stub')).toBeInTheDocument()
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

    expect(await screen.findByTestId('docs-shared-console-bridge')).toBeInTheDocument()
    const bridgeLane = screen.getByTestId('docs-shared-console-bridge')
    expect(within(bridgeLane).getByRole('button', { name: '返回共享工作台' })).toBeInTheDocument()
    expect(within(bridgeLane).queryByRole('button', { name: '查看项目市场基线' })).not.toBeInTheDocument()
    expect(within(bridgeLane).queryByRole('button', { name: '打开 API Keys' })).not.toBeInTheDocument()
    expect(within(bridgeLane).queryByRole('button', { name: '继续配置 Webhook' })).not.toBeInTheDocument()
    expect(within(bridgeLane).queryByRole('button', { name: '打开余额中心' })).not.toBeInTheDocument()

    const loopLane = screen.getByTestId('docs-shared-console-loop')
    expect(within(loopLane).getByRole('button', { name: '返回共享工作台' })).toBeInTheDocument()
    expect(within(loopLane).queryByRole('button', { name: '打开 API Keys 工作台' })).not.toBeInTheDocument()
    expect(within(loopLane).queryByRole('button', { name: '打开 Webhook 设置' })).not.toBeInTheDocument()

    await user.click(within(loopLane).getByRole('button', { name: '返回共享工作台' }))
    expect(await screen.findByTestId('shared-console-home')).toBeInTheDocument()
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
    expect(await screen.findByTestId('docs-shared-console-loop')).toBeInTheDocument()

    let loopLane = screen.getByTestId('docs-shared-console-loop')
    expect(within(loopLane).getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()
    expect(within(loopLane).getByRole('heading', { name: '开发者 Webhook 接入工作台' })).toBeInTheDocument()
    expect(within(loopLane).getByRole('heading', { name: '返回共享工作台' })).toBeInTheDocument()
    expect(within(loopLane).getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()
    expect(within(loopLane).getByRole('button', { name: '继续配置 Webhook' })).toBeInTheDocument()
    expect(within(loopLane).getByRole('button', { name: '返回共享工作台' })).toBeInTheDocument()
    await user.click(within(loopLane).getByRole('button', { name: '打开 API Keys' }))
    expect(await screen.findByTestId('api-keys-route-stub')).toBeInTheDocument()

    view.unmount()
    view = renderApiDocsPage()
    expect(await screen.findByTestId('docs-shared-console-loop')).toBeInTheDocument()
    loopLane = screen.getByTestId('docs-shared-console-loop')
    await user.click(within(loopLane).getByRole('button', { name: '继续配置 Webhook' }))
    expect(await screen.findByTestId('webhooks-route-stub')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '开发者 Webhook 接入工作台' })).toBeInTheDocument()

    view.unmount()
    view = renderApiDocsPage()
    expect(await screen.findByTestId('docs-shared-console-loop')).toBeInTheDocument()
    loopLane = screen.getByTestId('docs-shared-console-loop')
    await user.click(within(loopLane).getByRole('button', { name: '返回共享工作台' }))
    expect(await screen.findByTestId('shared-console-home')).toBeInTheDocument()
  })
})
