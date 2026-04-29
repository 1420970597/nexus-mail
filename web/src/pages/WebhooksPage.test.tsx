import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
    menu: [],
  })
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
    render(<WebhooksPage />)

    expect(await screen.findByText('开发者 Webhook 接入工作台')).toBeInTheDocument()
    expect(mockedGetWebhookEndpoints).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(mockedGetWebhookDeliveries).toHaveBeenCalledWith(11))
    expect(screen.getByText('https://hooks.example.com/nexus-mail')).toBeInTheDocument()
  })

  it('renders role-specific guidance for supplier role', async () => {
    seedRole('supplier')
    render(<WebhooksPage />)

    expect(await screen.findByText('供给事件回调工作台')).toBeInTheDocument()
    expect(screen.getByText('供应商视角')).toBeInTheDocument()
    expect(screen.getByText(/优先使用固定公网出口服务承接回调/)).toBeInTheDocument()
  })

  it('queues test delivery and reloads deliveries', async () => {
    const user = userEvent.setup()
    render(<WebhooksPage />)

    await screen.findByText('https://hooks.example.com/nexus-mail')
    await user.click(screen.getByRole('button', { name: '发送测试投递' }))

    await waitFor(() => expect(mockedCreateWebhookTestDelivery).toHaveBeenCalledWith(11))
    expect(mockedGetWebhookDeliveries).toHaveBeenCalledTimes(2)
  })

  it('creates endpoint with trimmed payload and shows signing secret once', async () => {
    const user = userEvent.setup()
    render(<WebhooksPage />)

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
    render(<WebhooksPage />)

    expect(await screen.findByText('当前还没有 Webhook endpoint，先创建第一个回调地址。')).toBeInTheDocument()
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
    mockedGetWebhookDeliveries
      .mockResolvedValueOnce({
        items: [
          {
            id: 91,
            endpoint_id: 11,
            user_id: 1,
            event_type: 'webhook.test',
            payload: '{"type":"webhook.test"}',
            status: 'pending',
            attempt_count: 2,
            next_attempt_at: '2026-04-29T00:01:00Z',
            last_error: 'upstream timeout',
            delivered_at: '',
            created_at: '2026-04-29T00:00:10Z',
            updated_at: '2026-04-29T00:00:10Z',
          },
          {
            id: 92,
            endpoint_id: 11,
            user_id: 1,
            event_type: 'activation.finished',
            payload: '{"type":"activation.finished"}',
            status: 'sent',
            attempt_count: 1,
            next_attempt_at: '',
            last_error: '',
            delivered_at: '2026-04-29T00:00:40Z',
            created_at: '2026-04-29T00:00:30Z',
            updated_at: '2026-04-29T00:00:40Z',
          },
        ],
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: 93,
            endpoint_id: 12,
            user_id: 1,
            event_type: 'activation.ready',
            payload: '{"type":"activation.ready"}',
            status: 'failed',
            attempt_count: 3,
            next_attempt_at: '2026-04-29T00:02:00Z',
            last_error: 'tls handshake failed',
            delivered_at: '',
            created_at: '2026-04-29T00:01:30Z',
            updated_at: '2026-04-29T00:01:30Z',
          },
        ],
      })

    render(<WebhooksPage />)

    expect(await screen.findByText('Webhook 运维与回调观测')).toBeInTheDocument()
    expect(screen.getByText('端点总数')).toBeInTheDocument()
    expect(screen.getByText('失败 / 排队中')).toBeInTheDocument()
    expect(screen.getByText('最近回调')).toBeInTheDocument()
    expect(screen.getAllByText('2026-04-29T00:00:40Z').length).toBeGreaterThan(0)
    expect(screen.getByText('最近一次成功送达的回调时间')).toBeInTheDocument()
    expect(screen.getByText('优先排查 failed，并观察 pending 队列消化情况')).toBeInTheDocument()
    expect(screen.getByText('排队中')).toBeInTheDocument()
    expect(screen.getAllByText('disabled').length).toBeGreaterThan(0)

    const testButtons = screen.getAllByRole('button', { name: '发送测试投递' })
    expect(testButtons[0]).toBeEnabled()
    expect(testButtons[1]).toBeDisabled()
    expect(mockedGetWebhookDeliveries).toHaveBeenCalledTimes(2)
  })
})
