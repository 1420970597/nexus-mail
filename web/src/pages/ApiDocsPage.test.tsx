import '@testing-library/jest-dom'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiDocsPage } from './ApiDocsPage'
import { useAuthStore } from '../store/authStore'
import { API_KEYS_ROUTE, DOCS_ROUTE, PROJECTS_ROUTE, WEBHOOKS_ROUTE } from '../utils/consoleNavigation'

function renderApiDocsPage(initialEntry = DOCS_ROUTE) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path={PROJECTS_ROUTE} element={<div>项目市场页面</div>} />
        <Route path={API_KEYS_ROUTE} element={<div>API Keys 页面</div>} />
        <Route path={WEBHOOKS_ROUTE} element={<div>Webhook 设置页面</div>} />
        <Route path={DOCS_ROUTE} element={<ApiDocsPage />} />
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

  it('keeps the docs page aligned with the shared integration loop and navigates to webhook settings', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 33, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'projects', label: '项目市场', path: PROJECTS_ROUTE },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
        { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
        { key: 'docs', label: 'API 文档', path: DOCS_ROUTE },
      ],
    })

    renderApiDocsPage()

    expect(await screen.findByText('Docs Mission Control')).toBeInTheDocument()
    const journeyButtons = screen.getAllByRole('button', { name: /打开 Webhook 设置/ })
    expect(journeyButtons.length).toBeGreaterThan(0)
    const journeyCard = journeyButtons[0].closest('.semi-card')
    expect(journeyCard).not.toBeNull()
    const scoped = within(journeyCard as HTMLElement)
    expect(scoped.getByText('真实回调验证')).toBeInTheDocument()
    expect(scoped.getByText('阅读 payload 契约后回到 Webhook 页面做 test delivery，继续观察异步 delivery 状态。')).toBeInTheDocument()

    await user.click(scoped.getByRole('button', { name: /打开 Webhook 设置/ }))
    expect(await screen.findByText('Webhook 设置页面')).toBeInTheDocument()
  })
})
