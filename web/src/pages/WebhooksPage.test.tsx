import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { API_KEYS_ROUTE, DOCS_ROUTE, WEBHOOKS_ROUTE } from '../utils/consoleNavigation'
import { WebhooksPage } from './WebhooksPage'
import * as webhookService from '../services/webhooks'
import { useAuthStore } from '../store/authStore'

vi.mock('../services/webhooks', () => ({
  getWebhookEndpoints: vi.fn(),
  createWebhookEndpoint: vi.fn(),
  createWebhookTestDelivery: vi.fn(),
  getWebhookDeliveries: vi.fn(),
}))

const mockedGetWebhookEndpoints = vi.mocked(webhookService.getWebhookEndpoints)
const mockedCreateWebhookEndpoint = vi.mocked(webhookService.createWebhookEndpoint)
const mockedCreateWebhookTestDelivery = vi.mocked(webhookService.createWebhookTestDelivery)
const mockedGetWebhookDeliveries = vi.mocked(webhookService.getWebhookDeliveries)

function seedRole(role: 'user' | 'supplier' | 'admin' = 'user') {
  useAuthStore.setState({
    token: 'token',
    refreshToken: 'refresh-token',
    user: { id: 1, email: `${role}@nexus-mail.local`, role },
    menu: [
      { key: 'dashboard', label: '仪表盘', path: '/' },
      { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
      { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
      { key: 'docs', label: 'API 文档', path: DOCS_ROUTE },
    ],
  })
}

function renderWebhooksPage(initialEntry = WEBHOOKS_ROUTE) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path={API_KEYS_ROUTE} element={<div>API Keys 页面</div>} />
        <Route path={WEBHOOKS_ROUTE} element={<WebhooksPage />} />
        <Route path={DOCS_ROUTE} element={<div>API 文档页面</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('WebhooksPage', () => {
  beforeEach(() => {
    seedRole('user')
    mockedGetWebhookEndpoints.mockResolvedValue({
      items: [
        {
          id: 11,
          user_id: 1,
          url: 'https://hooks.example.com/nexus-mail',
          events: ['activation.finished'],
          status: 'active',
          secret_preview: 'whsec_abcd…1234',
          created_at: '2026-04-29T00:00:00Z',
          updated_at: '2026-04-29T00:00:00Z',
        },
      ],
    })
    mockedGetWebhookDeliveries.mockResolvedValue({
      items: [
        {
          id: 91,
          endpoint_id: 11,
          user_id: 1,
          event_type: 'webhook.test',
          payload: '{"type":"webhook.test"}',
          status: 'pending',
          attempt_count: 1,
          next_attempt_at: '2026-04-29T00:01:00Z',
          last_error: '',
          delivered_at: '',
          created_at: '2026-04-29T00:00:10Z',
          updated_at: '2026-04-29T00:00:10Z',
        },
      ],
    })
    mockedCreateWebhookEndpoint.mockResolvedValue({
      endpoint: {
        id: 12,
        user_id: 1,
        url: 'https://hooks.example.com/new-endpoint',
        events: ['activation.ready'],
        status: 'active',
        secret_preview: 'whsec_new…7890',
        signing_secret: 'whsec_created_secret',
        created_at: '2026-04-29T00:02:00Z',
        updated_at: '2026-04-29T00:02:00Z',
      },
    })
    mockedCreateWebhookTestDelivery.mockResolvedValue({
      delivery: {
        id: 92,
        endpoint_id: 11,
        user_id: 1,
        event_type: 'webhook.test',
        payload: '{"type":"webhook.test"}',
        status: 'pending',
        attempt_count: 0,
        next_attempt_at: '2026-04-29T00:02:00Z',
        last_error: '',
        delivered_at: '',
        created_at: '2026-04-29T00:01:00Z',
        updated_at: '2026-04-29T00:01:00Z',
      },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })
  })

  it('loads endpoints and auto-loads first endpoint deliveries', async () => {
    render(
      <MemoryRouter>
        <WebhooksPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('开发者 Webhook 接入工作台')).toBeInTheDocument()
    expect(mockedGetWebhookEndpoints).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(mockedGetWebhookDeliveries).toHaveBeenCalledWith(11))
    expect(screen.getByText('https://hooks.example.com/nexus-mail')).toBeInTheDocument()
  })

  it('renders role-specific guidance for supplier role', async () => {
    seedRole('supplier')
    render(
      <MemoryRouter>
        <WebhooksPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('供给事件回调工作台')).toBeInTheDocument()
    expect(screen.getByText('供应商视角')).toBeInTheDocument()
    expect(screen.getByText(/优先使用固定公网出口服务承接回调/)).toBeInTheDocument()
  })

  it('renders role-specific guidance for admin role', async () => {
    seedRole('admin')
    render(
      <MemoryRouter>
        <WebhooksPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Webhook 运维与回调观测')).toBeInTheDocument()
    expect(screen.getByText('管理员视角')).toBeInTheDocument()
    expect(screen.getByText(/重点关注 failed \/ pending 重试链路/)).toBeInTheDocument()
  })

  it('queues test delivery and reloads deliveries', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <WebhooksPage />
      </MemoryRouter>,
    )

    await screen.findByText('https://hooks.example.com/nexus-mail')
    await user.click(screen.getByRole('button', { name: '发送测试投递' }))

    await waitFor(() => expect(mockedCreateWebhookTestDelivery).toHaveBeenCalledWith(11))
    expect(mockedGetWebhookDeliveries).toHaveBeenCalledTimes(2)
  })

  it('creates endpoint with trimmed payload and shows signing secret once', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <WebhooksPage />
      </MemoryRouter>,
    )

    await screen.findByText('https://hooks.example.com/nexus-mail')
    await user.type(screen.getByLabelText('目标地址'), '  https://hooks.example.com/new-endpoint  ')

    const select = screen.getByText('请选择至少一个事件')
    await user.click(select)
    await user.click(await screen.findByText('激活订单就绪（activation.ready）'))
    await user.click(screen.getByRole('button', { name: '创建 Webhook endpoint' }))

    await waitFor(() =>
      expect(mockedCreateWebhookEndpoint).toHaveBeenCalledWith({
        url: 'https://hooks.example.com/new-endpoint',
        events: ['activation.ready'],
      }),
    )

    expect(await screen.findByText(/whsec_created_secret/)).toBeInTheDocument()
    expect(screen.getByText(/whsec_new…7890/)).toBeInTheDocument()
  })

  it('shows empty state when no endpoints exist', async () => {
    mockedGetWebhookEndpoints.mockResolvedValueOnce({ items: [] })
    render(
      <MemoryRouter>
        <WebhooksPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('当前还没有 Webhook endpoint，先创建第一个回调地址。')).toBeInTheDocument()
  })

  it('renders shared-console navigation actions for the first integration loop', async () => {
    const user = userEvent.setup()

    renderWebhooksPage()

    expect(await screen.findByText('开发者 Webhook 接入工作台')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '先配置 API Keys' }))
    expect(await screen.findByText('API Keys 页面')).toBeInTheDocument()

    seedRole('user')
    renderWebhooksPage()
    expect(await screen.findByText('开发者 Webhook 接入工作台')).toBeInTheDocument()
    const integrationCard = await screen.findByText('注册后首轮回调联调建议')
    const integrationRegion = integrationCard.closest('[class*="semi-card"]')
    expect(integrationRegion).not.toBeNull()
    await user.click(within(integrationRegion as HTMLElement).getByRole('button', { name: '查看 API 文档' }))
    expect(await screen.findByText('API 文档页面')).toBeInTheDocument()
  })

  it('renders a shared integration loop card with api keys and docs CTAs', async () => {
    renderWebhooksPage()

    expect(await screen.findByText('开发者 Webhook 接入工作台')).toBeInTheDocument()
    expect(screen.getByText('注册后首轮回调联调建议')).toBeInTheDocument()
    expect(screen.getByText('在同一套控制台里先创建 endpoint、再发起 test delivery，并根据返回的投递状态完善自己的接入检查表。')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '先配置 API Keys' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '查看 API 文档' })).toBeInTheDocument()
  })

  it('suppresses shared integration CTAs when the server menu hides them and falls back to the recommended workspace', async () => {
    const user = userEvent.setup()
    mockedGetWebhookEndpoints.mockResolvedValueOnce({ items: [] })
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 1, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
      ],
    })

    render(
      <MemoryRouter initialEntries={[WEBHOOKS_ROUTE]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path={WEBHOOKS_ROUTE} element={<WebhooksPage />} />
          <Route path="/" element={<div>共享控制台首页</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('当前还没有 Webhook endpoint，先创建第一个回调地址。')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '先配置 API Keys' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '查看 API 文档' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '返回推荐工作台' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '返回推荐工作台' }))
    expect(await screen.findByText('共享控制台首页')).toBeInTheDocument()
  })

  it('renders shared-console metrics and delivery operations for admin role', async () => {
    seedRole('admin')
    mockedGetWebhookEndpoints.mockResolvedValueOnce({
      items: [
        {
          id: 11,
          user_id: 1,
          url: 'https://hooks.example.com/nexus-mail',
          events: ['activation.finished', 'webhook.test'],
          status: 'active',
          secret_preview: 'whsec_abcd…1234',
          created_at: '2026-04-29T00:00:00Z',
          updated_at: '2026-04-29T00:00:00Z',
        },
        {
          id: 12,
          user_id: 1,
          url: 'https://hooks.example.com/disabled',
          events: ['activation.ready'],
          status: 'disabled',
          secret_preview: 'whsec_disabled…5555',
          created_at: '2026-04-29T00:00:00Z',
          updated_at: '2026-04-29T00:00:00Z',
        },
      ],
    })
    mockedGetWebhookDeliveries.mockImplementation(async (id: number) => {
      if (id === 11) {
        return {
          items: [
            {
              id: 91,
              endpoint_id: 11,
              user_id: 1,
              event_type: 'webhook.test',
              payload: '{"type":"webhook.test"}',
              status: 'sent',
              attempt_count: 1,
              next_attempt_at: '',
              last_error: '',
              delivered_at: '2026-04-29T00:03:00Z',
              created_at: '2026-04-29T00:00:10Z',
              updated_at: '2026-04-29T00:03:00Z',
            },
          ],
        }
      }
      return {
        items: [
          {
            id: 92,
            endpoint_id: 12,
            user_id: 1,
            event_type: 'activation.ready',
            payload: '{"type":"activation.ready"}',
            status: 'failed',
            attempt_count: 3,
            next_attempt_at: '2026-04-29T00:04:00Z',
            last_error: 'timeout',
            delivered_at: '',
            created_at: '2026-04-29T00:00:20Z',
            updated_at: '2026-04-29T00:03:30Z',
          },
        ],
      }
    })

    render(
      <MemoryRouter>
        <WebhooksPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Webhook 运维与回调观测')).toBeInTheDocument()
    expect(screen.getByText('端点总数')).toBeInTheDocument()
    expect(screen.getByText('投递成功')).toBeInTheDocument()
    expect(screen.getByText('失败 / 排队中')).toBeInTheDocument()
    expect(screen.getByText('最近回调')).toBeInTheDocument()
    expect(screen.getByText('活跃 1 / 已停用 1')).toBeInTheDocument()
    expect(screen.getByText('已聚合 2 条最近 delivery')).toBeInTheDocument()
    expect(screen.getByText('优先排查 failed，并观察 pending 队列消化情况')).toBeInTheDocument()
    expect(screen.getAllByText('2026-04-29T00:03:00Z').length).toBeGreaterThan(0)
    expect(screen.getByText(/重点关注 failed \/ pending 重试链路与 last_error/)).toBeInTheDocument()
  })
})
