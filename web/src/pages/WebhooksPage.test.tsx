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
        <Route
          path={API_KEYS_ROUTE}
          element={(
            <section data-testid="webhooks-route-stub-api-keys" role="region" aria-label="共享控制台 - API Keys">
              <h1>开发者 API 接入工作台</h1>
            </section>
          )}
        />
        <Route path={WEBHOOKS_ROUTE} element={<WebhooksPage />} />
        <Route
          path={DOCS_ROUTE}
          element={(
            <section data-testid="webhooks-route-stub-docs" role="region" aria-label="共享控制台 - API 文档">
              <h1>API 文档与接入控制台</h1>
            </section>
          )}
        />
        <Route
          path="/"
          element={(
            <section data-testid="webhooks-route-stub-home" role="region" aria-label="共享控制台首页">
              <h1>控制台总览</h1>
            </section>
          )}
        />
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

    expect(await screen.findByRole('heading', { name: '开发者 Webhook 接入工作台' })).toBeInTheDocument()
    expect(mockedGetWebhookEndpoints).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(mockedGetWebhookDeliveries).toHaveBeenCalledWith(11))
    const currentEndpointCard = await screen.findByRole('region', { name: '当前 endpoint' })
    expect(within(currentEndpointCard).getByText('https://hooks.example.com/nexus-mail')).toBeInTheDocument()
  })

  it('renders canonical user guidance copy without legacy API Keys wording', async () => {
    render(
      <MemoryRouter>
        <WebhooksPage />
      </MemoryRouter>,
    )

    const guidanceRegion = await screen.findByRole('region', { name: '开发者 Webhook 接入工作台' })
    expect(within(guidanceRegion).getByRole('heading', { name: '开发者 Webhook 接入工作台' })).toBeInTheDocument()
    expect(guidanceRegion).toHaveTextContent('用户视角')
    expect(guidanceRegion).toHaveTextContent('创建账户级回调 endpoint，测试真实投递链路，并跟踪最近 50 条异步 delivery 状态。')
    expect(guidanceRegion).toHaveTextContent('打开 API Keys 与文档，再补上回调消费端校验逻辑')
    expect(guidanceRegion).not.toHaveTextContent('先配置 API Keys 与文档，再补上回调消费端校验逻辑')
  })

  it('renders role-specific guidance for supplier role', async () => {
    seedRole('supplier')
    render(
      <MemoryRouter>
        <WebhooksPage />
      </MemoryRouter>,
    )

    const guidanceRegion = await screen.findByRole('region', { name: '供给事件回调工作台' })
    expect(within(guidanceRegion).getByRole('heading', { name: '供给事件回调工作台' })).toBeInTheDocument()
    expect(within(guidanceRegion).getByText('供应商视角')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '共享接入桥接' })).not.toBeInTheDocument()
  })

  it('renders role-specific guidance for admin role', async () => {
    seedRole('admin')
    render(
      <MemoryRouter>
        <WebhooksPage />
      </MemoryRouter>,
    )

    const guidanceRegion = await screen.findByRole('region', { name: 'Webhook 运维与回调观测' })
    expect(within(guidanceRegion).getByRole('heading', { name: 'Webhook 运维与回调观测' })).toBeInTheDocument()
    expect(within(guidanceRegion).getByText('管理员视角')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '共享接入桥接' })).not.toBeInTheDocument()
  })

  it('queues test delivery and reloads deliveries', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <WebhooksPage />
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: '当前 endpoint' })
    const currentEndpointCard = screen.getByRole('region', { name: '当前 endpoint' })
    await user.click(within(currentEndpointCard).getByRole('button', { name: '发送测试投递' }))

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

    const currentEndpointCard = await screen.findByRole('region', { name: '当前 endpoint' })
    expect(within(currentEndpointCard).getByText('当前还没有 Webhook endpoint，先创建第一个回调地址。')).toBeInTheDocument()
  })

  it('shows canonical API Keys CTA in the empty state when the shared route is available', async () => {
    mockedGetWebhookEndpoints.mockResolvedValueOnce({ items: [] })

    render(
      <MemoryRouter>
        <WebhooksPage />
      </MemoryRouter>,
    )

    const currentEndpointCard = await screen.findByRole('region', { name: '当前 endpoint' })
    const emptyActions = within(currentEndpointCard)
    expect(emptyActions.getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()
    expect(emptyActions.queryByRole('button', { name: '先配置 API Keys' })).not.toBeInTheDocument()
    expect(emptyActions.getByRole('button', { name: '查看 API 文档' })).toBeInTheDocument()
  })

  it('renders a dedicated shared-console bridge with capability matrix and scoped CTA contracts', async () => {
    renderWebhooksPage()

    expect(await screen.findByRole('heading', { name: '开发者 Webhook 接入工作台' })).toBeInTheDocument()
    const bridgeRegion = screen.getByRole('region', { name: '共享接入桥接' })
    const bridgeScope = within(bridgeRegion)
    expect(bridgeScope.getByRole('heading', { name: 'Webhook → 开发者 API 接入工作台 → API 文档与接入控制台' })).toBeInTheDocument()
    expect(bridgeScope.getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()
    expect(bridgeScope.getByRole('button', { name: '查看 API 文档' })).toBeInTheDocument()
    expect(bridgeScope.queryByRole('button', { name: '返回共享工作台' })).not.toBeInTheDocument()

    const capabilityMatrix = within(bridgeRegion).getByRole('region', { name: '控制台能力矩阵' })
    const matrixScope = within(capabilityMatrix)
    expect(matrixScope.getByText('统一回调入口')).toBeInTheDocument()
    expect(matrixScope.getByText('共享接入桥接')).toBeInTheDocument()
    expect(matrixScope.getByText('角色菜单扩展')).toBeInTheDocument()
  })

  it('keeps the shared-console bridge honest when only API Keys remain visible in menu', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 1, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
      ],
    })

    renderWebhooksPage()

    expect(await screen.findByRole('heading', { name: '开发者 Webhook 接入工作台' })).toBeInTheDocument()
    const bridgeRegion = screen.getByRole('region', { name: '共享接入桥接' })
    const bridgeScope = within(bridgeRegion)
    expect(bridgeScope.getByRole('heading', { name: 'Webhook → 开发者 API 接入工作台' })).toBeInTheDocument()
    expect(bridgeRegion).toHaveTextContent('当前账号暂未暴露 API 文档页（API 文档与接入控制台）')
    expect(bridgeScope.getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()
    expect(bridgeScope.queryByRole('button', { name: '查看 API 文档' })).not.toBeInTheDocument()
  })

  it('keeps the shared-console bridge honest when only docs remain visible in menu', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 1, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
        { key: 'docs', label: 'API 文档', path: DOCS_ROUTE },
      ],
    })

    renderWebhooksPage()

    expect(await screen.findByRole('heading', { name: '开发者 Webhook 接入工作台' })).toBeInTheDocument()
    const bridgeRegion = screen.getByRole('region', { name: '共享接入桥接' })
    const bridgeScope = within(bridgeRegion)
    expect(bridgeScope.getByRole('heading', { name: 'Webhook → API 文档与接入控制台' })).toBeInTheDocument()
    expect(bridgeRegion).toHaveTextContent('当前账号暂未暴露 API Keys')
    expect(bridgeScope.getByRole('button', { name: '查看 API 文档' })).toBeInTheDocument()
    expect(bridgeScope.queryByRole('button', { name: '打开 API Keys' })).not.toBeInTheDocument()
  })

  it('shows a bridge fallback when neither API Keys nor docs are exposed by menu truth but another shared route exists', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 1, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
      ],
    })

    renderWebhooksPage()

    expect(await screen.findByRole('heading', { name: '开发者 Webhook 接入工作台' })).toBeInTheDocument()
    const bridgeRegion = screen.getByRole('region', { name: '共享接入桥接' })
    const bridgeScope = within(bridgeRegion)
    expect(bridgeScope.getByRole('heading', { name: 'Webhook → 返回共享工作台' })).toBeInTheDocument()
    expect(bridgeRegion).toHaveTextContent('当前菜单未暴露 API Keys 与 API 文档页（API 文档与接入控制台）时，先回到服务端授予的共享工作台继续真实业务主链路。')
    expect(bridgeScope.getByRole('button', { name: '返回共享工作台' })).toBeInTheDocument()
    expect(bridgeScope.queryByRole('button', { name: '打开 API Keys' })).not.toBeInTheDocument()
    expect(bridgeScope.queryByRole('button', { name: '查看 API 文档' })).not.toBeInTheDocument()
  })

  it('navigates from the bridge fallback into the named shared-console home region', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 1, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
      ],
    })

    renderWebhooksPage()

    expect(await screen.findByRole('heading', { name: '开发者 Webhook 接入工作台' })).toBeInTheDocument()
    const bridgeRegion = screen.getByRole('region', { name: '共享接入桥接' })
    await user.click(within(bridgeRegion).getByRole('button', { name: '返回共享工作台' }))
    const homeRegion = await screen.findByRole('region', { name: '共享控制台首页' })
    expect(within(homeRegion).getByRole('heading', { name: '控制台总览' })).toBeInTheDocument()
  })

  it('keeps the bridge copy honest when webhooks is the only shared route still visible', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 1, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
      ],
    })

    renderWebhooksPage()

    expect(await screen.findByRole('heading', { name: '开发者 Webhook 接入工作台' })).toBeInTheDocument()
    const bridgeRegion = screen.getByRole('region', { name: '共享接入桥接' })
    const bridgeScope = within(bridgeRegion)
    expect(bridgeScope.getByRole('heading', { name: 'Webhook 接入仍停留在当前工作台' })).toBeInTheDocument()
    expect(bridgeRegion).toHaveTextContent('当前账号仍停留在 Webhook 工作台中继续观察回调状态，等待服务端后续开放更多共享接入入口。')
    expect(bridgeScope.queryByRole('button', { name: '返回共享工作台' })).not.toBeInTheDocument()
    expect(bridgeScope.queryByRole('button', { name: '打开 API Keys' })).not.toBeInTheDocument()
    expect(bridgeScope.queryByRole('button', { name: '查看 API 文档' })).not.toBeInTheDocument()
  })

  it('navigates from the docs-only bridge state into the named shared-console docs region', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 1, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
        { key: 'docs', label: 'API 文档', path: DOCS_ROUTE },
      ],
    })

    renderWebhooksPage()

    expect(await screen.findByRole('heading', { name: '开发者 Webhook 接入工作台' })).toBeInTheDocument()
    const bridgeRegion = screen.getByRole('region', { name: '共享接入桥接' })
    await user.click(within(bridgeRegion).getByRole('button', { name: '查看 API 文档' }))
    const docsRegion = await screen.findByRole('region', { name: '共享控制台 - API 文档' })
    expect(within(docsRegion).getByRole('heading', { name: 'API 文档与接入控制台' })).toBeInTheDocument()
  })

  it('renders shared-console navigation actions for the first integration loop inside named destination regions', async () => {
    const user = userEvent.setup()

    let view = renderWebhooksPage()

    expect(await screen.findByRole('heading', { name: '开发者 Webhook 接入工作台' })).toBeInTheDocument()

    const bridgeRegion = screen.getByRole('region', { name: '共享接入桥接' })
    await user.click(within(bridgeRegion).getByRole('button', { name: '打开 API Keys' }))
    const apiKeysRegion = await screen.findByRole('region', { name: '共享控制台 - API Keys' })
    expect(within(apiKeysRegion).getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()

    view.unmount()
    seedRole('user')
    view = renderWebhooksPage()
    expect(await screen.findByRole('heading', { name: '开发者 Webhook 接入工作台' })).toBeInTheDocument()
    const integrationRegion = screen.getByRole('region', { name: '注册后首轮回调联调建议' })
    expect(within(integrationRegion).queryByRole('button', { name: '先配置 API Keys' })).not.toBeInTheDocument()
    await user.click(within(integrationRegion).getByRole('button', { name: '查看 API 文档' }))
    const docsRegion = await screen.findByRole('region', { name: '共享控制台 - API 文档' })
    expect(within(docsRegion).getByRole('heading', { name: 'API 文档与接入控制台' })).toBeInTheDocument()
  })

  it('renders a shared integration loop card with scoped CTA contracts and stable step anchors when shared destinations are available', async () => {
    renderWebhooksPage()

    expect(await screen.findByRole('heading', { name: '开发者 Webhook 接入工作台' })).toBeInTheDocument()
    const integrationLoop = screen.getByRole('region', { name: '注册后首轮回调联调建议' })
    const loopScope = within(integrationLoop)
    expect(loopScope.getByRole('heading', { name: '注册后首轮回调联调建议' })).toBeInTheDocument()
    expect(loopScope.getByText('1. 创建首个 endpoint')).toBeInTheDocument()
    expect(loopScope.getByText('2. 验证 test delivery')).toBeInTheDocument()
    expect(loopScope.getByText('3. 回到 API 文档/消费端')).toBeInTheDocument()
    expect(loopScope.getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()
    expect(loopScope.getByRole('button', { name: '查看 API 文档' })).toBeInTheDocument()
    expect(loopScope.queryByRole('button', { name: '先配置 API Keys' })).not.toBeInTheDocument()
    expect(loopScope.queryByRole('button', { name: '返回共享工作台' })).not.toBeInTheDocument()
  })

  it('suppresses unavailable shared integration CTAs when the server menu hides them and falls back to the recommended workspace', async () => {
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
          <Route path="/" element={<section data-testid="shared-console-home-route-stub" role="region" aria-label="共享控制台首页"><h1>控制台总览</h1></section>} />
        </Routes>
      </MemoryRouter>,
    )

    const currentEndpointCard = await screen.findByRole('region', { name: '当前 endpoint' })
    const emptyActions = within(currentEndpointCard)
    expect(emptyActions.queryByRole('button', { name: '打开 API Keys' })).not.toBeInTheDocument()
    expect(emptyActions.queryByRole('button', { name: '先配置 API Keys' })).not.toBeInTheDocument()
    expect(emptyActions.queryByRole('button', { name: '查看 API 文档' })).not.toBeInTheDocument()
    const fallbackButton = emptyActions.getByRole('button', { name: '返回共享工作台' })
    expect(fallbackButton).toBeInTheDocument()

    await user.click(fallbackButton)
    const sharedHomeRegion = await screen.findByRole('region', { name: '共享控制台首页' })
    expect(within(sharedHomeRegion).getByRole('heading', { name: '控制台总览' })).toBeInTheDocument()
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

    const guidanceRegion = await screen.findByRole('region', { name: 'Webhook 运维与回调观测' })
    expect(within(guidanceRegion).getByRole('heading', { name: 'Webhook 运维与回调观测' })).toBeInTheDocument()
    expect(within(guidanceRegion).getByText('管理员视角')).toBeInTheDocument()
    expect(guidanceRegion).toHaveTextContent('failed / pending')
    expect(guidanceRegion).toHaveTextContent('last_error')
    expect(guidanceRegion).toHaveTextContent('测试投递返回 202')

    expect(screen.getByText('活跃 1 / 已停用 1')).toBeInTheDocument()

    expect(screen.getByText('已聚合 2 条最近 delivery')).toBeInTheDocument()

    expect(screen.getByText('优先排查 failed，并观察 pending 队列消化情况')).toBeInTheDocument()

    expect(screen.getByText('最近一次成功送达的回调时间')).toBeInTheDocument()
  })
})
