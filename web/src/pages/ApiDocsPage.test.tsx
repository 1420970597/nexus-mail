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
        <Route path={PROJECTS_ROUTE} element={<div data-testid="projects-route-stub">项目市场</div>} />
        <Route path={BALANCE_ROUTE} element={<div data-testid="balance-route-stub">余额中心</div>} />
        <Route path={API_KEYS_ROUTE} element={<div data-testid="api-keys-route-stub">开发者 API 接入工作台</div>} />
        <Route path={WEBHOOKS_ROUTE} element={<div data-testid="webhooks-route-stub">Webhook 设置</div>} />
        <Route path={DOCS_ROUTE} element={<ApiDocsPage />} />
        <Route path="/" element={<div data-testid="shared-console-home">控制台总览</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ApiDocsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders a shared-console docs workspace with a semantic Chinese page heading, bridge and loop CTAs for regular users, and navigates to API keys', async () => {
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

    const bridgeLane = screen.getByTestId('docs-shared-console-bridge')
    expect(within(bridgeLane).getByRole('heading', { name: '文档 → 真实业务 → 接入回放' })).toBeInTheDocument()
    expect(within(bridgeLane).getByText('将文档中的资金、争议与余额相关接口重新映射到共享控制台的余额任务总览，避免接入与售后割裂。')).toBeInTheDocument()
    expect(within(bridgeLane).getByRole('button', { name: '查看项目市场基线' })).toBeInTheDocument()
    expect(within(bridgeLane).getByRole('button', { name: '打开 API Keys 工作台' })).toBeInTheDocument()
    expect(within(bridgeLane).getByRole('button', { name: '打开 Webhook 设置' })).toBeInTheDocument()
    expect(within(bridgeLane).queryByRole('button', { name: '返回推荐工作台' })).not.toBeInTheDocument()

    const loopLane = screen.getByTestId('docs-shared-console-loop')
    expect(within(loopLane).getByRole('heading', { name: '文档与接入工作台继续保持单壳闭环' })).toBeInTheDocument()
    expect(within(loopLane).getByRole('button', { name: '打开 API Keys 工作台' })).toBeInTheDocument()
    expect(within(loopLane).getByRole('button', { name: '打开 Webhook 设置' })).toBeInTheDocument()
    expect(within(loopLane).getByRole('button', { name: '返回推荐工作台' })).toBeInTheDocument()

    await user.click(within(loopLane).getByRole('button', { name: '打开 API Keys 工作台' }))
    expect(await screen.findByTestId('api-keys-route-stub')).toBeInTheDocument()
  })

  it('shows role-aware admin shortcuts with the semantic docs heading and without leaking unavailable actions', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 32, email: 'admin@nexus-mail.local', role: 'admin' },
      menu: [
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
        { key: 'docs', label: 'API 文档', path: DOCS_ROUTE },
      ],
    })

    renderApiDocsPage()

    expect(screen.getByRole('heading', { level: 3, name: 'API 文档与接入控制台' })).toBeInTheDocument()
    expect(await screen.findByLabelText('Tag: 管理员扩展 · API 契约')).toBeInTheDocument()
    const bridgeLane = screen.getByTestId('docs-shared-console-bridge')
    expect(screen.getByTitle('nexus-mail-api-docs')).toHaveAttribute('src', '/openapi/index.html')
    expect(within(bridgeLane).getByRole('button', { name: '打开 API Keys 工作台' })).toBeInTheDocument()
    expect(within(bridgeLane).queryByRole('button', { name: '查看项目市场基线' })).not.toBeInTheDocument()
    expect(within(bridgeLane).queryByRole('button', { name: '打开 Webhook 设置' })).not.toBeInTheDocument()
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
    expect(scoped.getByRole('heading', { name: '回到项目市场校验真实业务输入' })).toBeInTheDocument()
    expect(scoped.getByRole('heading', { name: '收敛最小权限 API Key' })).toBeInTheDocument()
    expect(scoped.getByRole('heading', { name: '完成 Webhook 回调联调' })).toBeInTheDocument()
    expect(scoped.getByRole('heading', { name: '返回资金工作台核对预算与售后' })).toBeInTheDocument()
    expect(scoped.getByRole('button', { name: '查看项目市场基线' })).toBeInTheDocument()
    expect(scoped.getByRole('button', { name: '打开 API Keys 工作台' })).toBeInTheDocument()
    expect(scoped.getByRole('button', { name: '打开 Webhook 设置' })).toBeInTheDocument()
    expect(scoped.getByRole('button', { name: '打开余额中心' })).toBeInTheDocument()

    await user.click(scoped.getByRole('button', { name: '查看项目市场基线' }))
    expect(await screen.findByTestId('projects-route-stub')).toBeInTheDocument()

    view.unmount()
    view = renderApiDocsPage()
    expect(await screen.findByTestId('docs-shared-console-bridge')).toBeInTheDocument()
    const secondBridgeLane = screen.getByTestId('docs-shared-console-bridge')
    await user.click(within(secondBridgeLane).getByRole('button', { name: '打开 API Keys 工作台' }))
    expect(await screen.findByTestId('api-keys-route-stub')).toBeInTheDocument()
    expect(screen.getByText('开发者 API 接入工作台')).toBeInTheDocument()

    view.unmount()
    view = renderApiDocsPage()
    expect(await screen.findByTestId('docs-shared-console-bridge')).toBeInTheDocument()
    const thirdBridgeLane = screen.getByTestId('docs-shared-console-bridge')
    await user.click(within(thirdBridgeLane).getByRole('button', { name: '打开 Webhook 设置' }))
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
    expect(within(bridgeLane).getByRole('button', { name: '返回推荐工作台' })).toBeInTheDocument()
    expect(within(bridgeLane).queryByRole('button', { name: '查看项目市场基线' })).not.toBeInTheDocument()
    expect(within(bridgeLane).queryByRole('button', { name: '打开 API Keys 工作台' })).not.toBeInTheDocument()
    expect(within(bridgeLane).queryByRole('button', { name: '打开 Webhook 设置' })).not.toBeInTheDocument()
    expect(within(bridgeLane).queryByRole('button', { name: '打开余额中心' })).not.toBeInTheDocument()

    const loopLane = screen.getByTestId('docs-shared-console-loop')
    expect(within(loopLane).getByRole('button', { name: '返回推荐工作台' })).toBeInTheDocument()
    expect(within(loopLane).queryByRole('button', { name: '打开 API Keys 工作台' })).not.toBeInTheDocument()
    expect(within(loopLane).queryByRole('button', { name: '打开 Webhook 设置' })).not.toBeInTheDocument()

    await user.click(within(loopLane).getByRole('button', { name: '返回推荐工作台' }))
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
    expect(within(loopLane).getByRole('heading', { name: '先回到 API Keys 收口最小权限' })).toBeInTheDocument()
    expect(within(loopLane).getByRole('heading', { name: '随后校验 Webhook delivery' })).toBeInTheDocument()
    expect(within(loopLane).getByRole('heading', { name: '最后回到业务主链路复放' })).toBeInTheDocument()
    expect(within(loopLane).getByRole('button', { name: '打开 API Keys 工作台' })).toBeInTheDocument()
    expect(within(loopLane).getByRole('button', { name: '打开 Webhook 设置' })).toBeInTheDocument()
    expect(within(loopLane).getByRole('button', { name: '返回推荐工作台' })).toBeInTheDocument()
    await user.click(within(loopLane).getByRole('button', { name: '打开 API Keys 工作台' }))
    expect(await screen.findByTestId('api-keys-route-stub')).toBeInTheDocument()

    view.unmount()
    view = renderApiDocsPage()
    expect(await screen.findByTestId('docs-shared-console-loop')).toBeInTheDocument()
    loopLane = screen.getByTestId('docs-shared-console-loop')
    await user.click(within(loopLane).getByRole('button', { name: '打开 Webhook 设置' }))
    expect(await screen.findByTestId('webhooks-route-stub')).toBeInTheDocument()
    expect(screen.getByText('Webhook 设置')).toBeInTheDocument()

    view.unmount()
    view = renderApiDocsPage()
    expect(await screen.findByTestId('docs-shared-console-loop')).toBeInTheDocument()
    loopLane = screen.getByTestId('docs-shared-console-loop')
    await user.click(within(loopLane).getByRole('button', { name: '返回推荐工作台' }))
    expect(await screen.findByTestId('shared-console-home')).toBeInTheDocument()
  })
})
