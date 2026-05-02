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
        <Route path={PROJECTS_ROUTE} element={<div>项目市场页面</div>} />
        <Route path={BALANCE_ROUTE} element={<div>余额中心页面</div>} />
        <Route path={API_KEYS_ROUTE} element={<div>API Keys 页面</div>} />
        <Route path={WEBHOOKS_ROUTE} element={<div>Webhook 设置页面</div>} />
        <Route path={DOCS_ROUTE} element={<ApiDocsPage />} />
        <Route path="/" element={<div>共享控制台首页</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ApiDocsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders a shared-console docs mission control for regular users and navigates to API keys', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 31, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'projects', label: '项目市场', path: PROJECTS_ROUTE },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
        { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
        { key: 'docs', label: 'API 文档', path: DOCS_ROUTE },
      ],
    })

    renderApiDocsPage()

    expect(await screen.findByText('Docs Mission Control')).toBeInTheDocument()
    expect(screen.getByText('共享控制台 · API 契约')).toBeInTheDocument()
    expect(screen.getByText('注册后连续路径')).toBeInTheDocument()
    expect(screen.getByText('公开文档、API Keys、Webhook 联调与真实订单回放保持在同一套深色共享控制台里，不再跳到独立后台或外置说明页。')).toBeInTheDocument()
    expect(screen.getByText('统一接入路径')).toBeInTheDocument()
    expect(screen.getByText('三段式联调节奏')).toBeInTheDocument()
    expect(screen.getAllByText('嵌入式 Redoc').length).toBeGreaterThan(0)
    expect(screen.getAllByText('最小权限 API Key').length).toBeGreaterThan(0)
    expect(screen.getAllByText('真实回调验证').length).toBeGreaterThan(0)
    expect(screen.getByText('3. 真实 API 回放')).toBeInTheDocument()
    expect(screen.getByTitle('nexus-mail-api-docs')).toHaveAttribute('src', '/openapi/index.html')

    await user.click(screen.getAllByText('打开 API Keys 工作台')[0] as HTMLElement)
    expect(await screen.findByText('API Keys 页面')).toBeInTheDocument()
  })

  it('shows role-aware admin shortcuts without leaking unavailable actions', async () => {
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

    expect(await screen.findByText('管理员扩展 · API 契约')).toBeInTheDocument()
    expect(screen.getByText('审计与风控仍通过共享控制台中的 API Keys / 审计链路交叉验证，不拆新的文档后台。')).toBeInTheDocument()
    expect(screen.getAllByText('最小权限 API Key').length).toBeGreaterThan(0)
    expect(screen.getByText('查看项目市场基线')).toBeInTheDocument()
    expect(screen.queryByText('打开 Webhook 设置')).not.toBeInTheDocument()
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
    expect(await screen.findByText('共享控制台桥接路径')).toBeInTheDocument()
    const bridgeLane = screen.getByTestId('docs-shared-console-bridge')
    const scoped = within(bridgeLane)
    expect(scoped.getByText('文档 → 真实业务 → 接入回放')).toBeInTheDocument()
    expect(scoped.getByText('回到项目市场校验真实业务输入')).toBeInTheDocument()
    expect(scoped.getByText('收敛最小权限 API Key')).toBeInTheDocument()
    expect(scoped.getByText('完成 Webhook 回调联调')).toBeInTheDocument()
    expect(scoped.getByText('返回资金工作台核对预算与售后')).toBeInTheDocument()

    await user.click(within(bridgeLane as HTMLElement).getByRole('button', { name: '查看项目市场基线' }))
    expect(await screen.findByText('项目市场页面')).toBeInTheDocument()

    view.unmount()
    view = renderApiDocsPage()
    expect(await screen.findByText('共享控制台桥接路径')).toBeInTheDocument()
    const secondBridgeLane = screen.getByTestId('docs-shared-console-bridge')
    await user.click(within(secondBridgeLane).getByRole('button', { name: '打开 API Keys 工作台' }))
    expect(await screen.findByText('API Keys 页面')).toBeInTheDocument()

    view.unmount()
    view = renderApiDocsPage()
    expect(await screen.findByText('共享控制台桥接路径')).toBeInTheDocument()
    const thirdBridgeLane = screen.getByTestId('docs-shared-console-bridge')
    await user.click(within(thirdBridgeLane).getByRole('button', { name: '打开 Webhook 设置' }))
    expect(await screen.findByText('Webhook 设置页面')).toBeInTheDocument()

    view.unmount()
    view = renderApiDocsPage()
    expect(await screen.findByText('共享控制台桥接路径')).toBeInTheDocument()
    const fourthBridgeLane = screen.getByTestId('docs-shared-console-bridge')
    await user.click(within(fourthBridgeLane).getByRole('button', { name: '打开余额中心' }))
    expect(await screen.findByText('余额中心页面')).toBeInTheDocument()
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

    expect(await screen.findByText('共享控制台桥接路径')).toBeInTheDocument()
    expect(screen.queryByText('回到项目市场校验真实业务输入')).not.toBeInTheDocument()
    expect(screen.queryByText('收敛最小权限 API Key')).not.toBeInTheDocument()
    expect(screen.queryByText('完成 Webhook 回调联调')).not.toBeInTheDocument()
    expect(screen.queryByText('返回资金工作台核对预算与售后')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '返回推荐工作台' }))
    expect(await screen.findByText('共享控制台首页')).toBeInTheDocument()
  })
})
