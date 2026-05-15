import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Modal } from '@douyinfe/semi-ui'
import { ApiKeysPage } from './ApiKeysPage'
import * as apiKeyService from '../services/apiKeys'
import { useAuthStore } from '../store/authStore'
import { API_KEYS_ROUTE, DOCS_ROUTE, ORDERS_ROUTE, PROJECTS_ROUTE, WEBHOOKS_ROUTE, resolveRouteTitle } from '../utils/consoleNavigation'

vi.mock('../services/apiKeys', () => ({
  getAPIKeys: vi.fn(),
  createAPIKey: vi.fn(),
  revokeAPIKey: vi.fn(),
  updateAPIKeyWhitelist: vi.fn(),
  getAPIKeyAudit: vi.fn(),
}))

vi.mock('@douyinfe/semi-ui', async () => {
  const actual = await vi.importActual<typeof import('@douyinfe/semi-ui')>('@douyinfe/semi-ui')
  return {
    ...actual,
    Modal: {
      confirm: vi.fn(({ onOk }) => {
        onOk?.()
      }),
    },
  }
})

const mockedGetAPIKeys = vi.mocked(apiKeyService.getAPIKeys)
const mockedCreateAPIKey = vi.mocked(apiKeyService.createAPIKey)
const mockedRevokeAPIKey = vi.mocked(apiKeyService.revokeAPIKey)
const mockedUpdateAPIKeyWhitelist = vi.mocked(apiKeyService.updateAPIKeyWhitelist)
const mockedGetAPIKeyAudit = vi.mocked(apiKeyService.getAPIKeyAudit)
const mockedModalConfirm = vi.mocked(Modal.confirm)

function seedRole(role: 'user' | 'supplier' | 'admin' = 'user') {
  useAuthStore.setState({
    token: 'token',
    refreshToken: 'refresh-token',
    user: { id: 1, email: `${role}@nexus-mail.local`, role },
    menu: [
      { key: 'dashboard', label: '仪表盘', path: '/' },
      { key: 'projects', label: '项目市场', path: PROJECTS_ROUTE },
      { key: 'orders', label: '订单中心', path: ORDERS_ROUTE },
      { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
      { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
      { key: 'docs', label: 'API 文档', path: DOCS_ROUTE },
    ],
  })
}

function renderApiKeysPage(initialEntry = API_KEYS_ROUTE) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route
          path={PROJECTS_ROUTE}
          element={(
            <section data-testid="route-stub-projects">
              <h1>项目市场</h1>
            </section>
          )}
        />
        <Route
          path={ORDERS_ROUTE}
          element={(
            <section data-testid="route-stub-orders">
              <h1>订单中心</h1>
            </section>
          )}
        />
        <Route path={API_KEYS_ROUTE} element={<ApiKeysPage />} />
        <Route
          path={WEBHOOKS_ROUTE}
          element={(
            <section data-testid="route-stub-webhooks">
              <h1>{resolveRouteTitle(WEBHOOKS_ROUTE, useAuthStore.getState().user?.role)}</h1>
            </section>
          )}
        />
        <Route
          path={DOCS_ROUTE}
          element={(
            <section data-testid="route-stub-docs">
              <h1>API 文档与接入控制台</h1>
            </section>
          )}
        />
        <Route
          path="/"
          element={(
            <section data-testid="route-stub-dashboard">
              <h1>控制台总览</h1>
            </section>
          )}
        />
      </Routes>
    </MemoryRouter>,
  )
}

function getApiKeyRow(name: string) {
  return screen.getByRole('row', { name: new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })
}

describe('ApiKeysPage', () => {
  beforeEach(() => {
    seedRole('user')
    mockedGetAPIKeys.mockResolvedValue({
      items: [
        {
          id: 1,
          name: '默认密钥',
          key_preview: 'nmx_abcd...1234',
          scopes: ['activation:read'],
          whitelist: ['127.0.0.1'],
          status: 'active',
          last_used_at: '2026-01-02T00:00:00Z',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
        {
          id: 2,
          name: '已撤销密钥',
          key_preview: 'nmx_revoked...9999',
          scopes: ['finance:write'],
          whitelist: [],
          status: 'revoked',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ],
    })
    mockedGetAPIKeyAudit.mockResolvedValue({
      items: [
        {
          id: 9,
          action: 'create',
          actor_type: 'user',
          note: '创建 API Key',
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
    })
    mockedCreateAPIKey.mockResolvedValue({
      plaintext_key: 'nmx_created_secret',
      api_key: {
        id: 3,
        name: '新密钥',
        key_preview: 'nmx_efgh...5678',
        scopes: ['finance:write'],
        whitelist: ['10.0.0.0/24'],
        status: 'active',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    })
    mockedRevokeAPIKey.mockResolvedValue({
      api_key: {
        id: 1,
        name: '默认密钥',
        key_preview: 'nmx_abcd...1234',
        scopes: ['activation:read'],
        whitelist: ['127.0.0.1'],
        status: 'revoked',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    })
    mockedUpdateAPIKeyWhitelist.mockResolvedValue({
      api_key: {
        id: 1,
        name: '默认密钥',
        key_preview: 'nmx_abcd...1234',
        scopes: ['activation:read'],
        whitelist: ['172.18.0.1', '10.0.0.0/24'],
        status: 'active',
        last_used_at: '2026-01-02T00:00:00Z',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-03T00:00:00Z',
      },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })
  })

  it('renders role-specific guidance for current user role', async () => {
    seedRole('supplier')
    render(
      <MemoryRouter>
        <ApiKeysPage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()
    const heroScope = within(screen.getByTestId('api-keys-hero-card'))
    expect(heroScope.getByText('共享控制台 · 供应商扩展')).toBeInTheDocument()
    expect(heroScope.getByText(/优先设置固定出口 IP 白名单/)).toBeInTheDocument()
    expect(heroScope.getByText(/按供货能力拆分不同 scopes/)).toBeInTheDocument()
  })

  it('uses role-aware webhook route identity inside the shared integration bridge for supplier and admin users', async () => {
    const user = userEvent.setup()

    seedRole('supplier')
    let view = renderApiKeysPage()
    const firstKeysCard = await screen.findByTestId('api-keys-current-keys-card')
    await within(firstKeysCard).findByText('默认密钥')
    const supplierBridge = within(screen.getByTestId('api-keys-shared-console-bridge'))
    expect(screen.getByTestId('api-keys-shared-console-bridge')).toHaveTextContent('API Keys → 供给事件回调工作台 → API 文档与接入控制台')
    expect(screen.getByTestId('api-keys-shared-console-bridge')).not.toHaveTextContent('API Keys → 开发者 Webhook 接入工作台 → API 文档与接入控制台')
    await user.click(supplierBridge.getByRole('button', { name: /继续配置 Webhook/ }))
    const supplierWebhookStub = await screen.findByTestId('route-stub-webhooks')
    expect(within(supplierWebhookStub).getByRole('heading', { name: '供给事件回调工作台' })).toBeInTheDocument()

    view.unmount()
    seedRole('admin')
    view = renderApiKeysPage()
    const secondKeysCard = await screen.findByTestId('api-keys-current-keys-card')
    await within(secondKeysCard).findByText('默认密钥')
    const adminBridge = within(screen.getByTestId('api-keys-shared-console-bridge'))
    expect(screen.getByTestId('api-keys-shared-console-bridge')).toHaveTextContent('API Keys → Webhook 运维与回调观测 → API 文档与接入控制台')
    expect(screen.getByTestId('api-keys-shared-console-bridge')).not.toHaveTextContent('API Keys → 开发者 Webhook 接入工作台 → API 文档与接入控制台')
    await user.click(adminBridge.getByRole('button', { name: /继续配置 Webhook/ }))
    const adminWebhookStub = await screen.findByTestId('route-stub-webhooks')
    expect(within(adminWebhookStub).getByRole('heading', { name: 'Webhook 运维与回调观测' })).toBeInTheDocument()
  })

  it('loads and creates api key with trimmed scopes and whitelist', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <ApiKeysPage />
      </MemoryRouter>,
    )
    const keysCard = await screen.findByTestId('api-keys-current-keys-card')
    await within(keysCard).findByText('默认密钥')
    const createCard = screen.getByTestId('api-keys-create-card')
    const nameInput = screen.getByLabelText('名称')
    const scopesInput = screen.getByLabelText('权限范围')
    const whitelistInput = screen.getByPlaceholderText('127.0.0.1,10.0.0.0/24')

    fireEvent.change(nameInput, { target: { value: '新密钥' } })
    fireEvent.change(scopesInput, { target: { value: ' finance:write , , activation:read ' } })
    fireEvent.change(whitelistInput, { target: { value: ' 10.0.0.0/24, ,127.0.0.1 ' } })
    await user.click(within(createCard).getByRole('button', { name: '创建新密钥' }))

    await waitFor(() =>
      expect(mockedCreateAPIKey).toHaveBeenCalledWith({
        name: '新密钥',
        scopes: ['finance:write', 'activation:read'],
        whitelist: ['10.0.0.0/24', '127.0.0.1'],
      }),
    )
    expect(await screen.findByText(/nmx_created_secret/)).toBeInTheDocument()
    expect(screen.queryByText('nmx_created_secret', { selector: 'td' })).not.toBeInTheDocument()
  })

  it('disables revoke action for revoked keys and keeps active keys revocable', async () => {
    render(
      <MemoryRouter>
        <ApiKeysPage />
      </MemoryRouter>,
    )
    const keysCard = await screen.findByTestId('api-keys-current-keys-card')
    await within(keysCard).findByText('已撤销密钥')

    const activeRow = within(getApiKeyRow('默认密钥'))
    const revokedRow = within(getApiKeyRow('已撤销密钥'))
    expect(activeRow.getByRole('button', { name: '撤销' })).toBeEnabled()
    expect(revokedRow.getByRole('button', { name: '撤销' })).toBeDisabled()
  })

  it('reloads list after revoking an active key', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <ApiKeysPage />
      </MemoryRouter>,
    )
    const keysCard = await screen.findByTestId('api-keys-current-keys-card')
    await within(keysCard).findByText('默认密钥')

    await user.click(within(getApiKeyRow('默认密钥')).getByRole('button', { name: '撤销' }))

    await waitFor(() => expect(mockedRevokeAPIKey).toHaveBeenCalledWith(1))
    expect(mockedGetAPIKeys).toHaveBeenCalledTimes(2)
  })

  it('updates whitelist with normalized entries and reloads list', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <ApiKeysPage />
      </MemoryRouter>,
    )
    const keysCard = await screen.findByTestId('api-keys-current-keys-card')
    await within(keysCard).findByText('默认密钥')

    mockedGetAPIKeys.mockResolvedValueOnce({
      items: [
        {
          id: 1,
          name: '默认密钥',
          key_preview: 'nmx_abcd...1234',
          scopes: ['activation:read'],
          whitelist: ['172.18.0.1', '10.0.0.0/24'],
          status: 'active',
          last_used_at: '2026-01-02T00:00:00Z',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-03T00:00:00Z',
        },
        {
          id: 2,
          name: '已撤销密钥',
          key_preview: 'nmx_revoked...9999',
          scopes: ['finance:write'],
          whitelist: [],
          status: 'revoked',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ],
    })
    await user.click(within(getApiKeyRow('默认密钥')).getByRole('button', { name: /编辑白名单/ }))
    const whitelistEditor = screen.getByTestId('api-keys-whitelist-editor-card')
    const whitelistInput = within(whitelistEditor).getByPlaceholderText('172.18.0.1,10.0.0.0/24')
    expect((whitelistInput as HTMLInputElement).value).toContain('127.0.0.1')
    await user.clear(whitelistInput)
    await user.type(whitelistInput, ' 172.18.0.1 , , 10.0.0.0/24 ')
    await user.click(within(whitelistEditor).getByRole('button', { name: '保存白名单' }))

    await waitFor(() => expect(mockedUpdateAPIKeyWhitelist).toHaveBeenCalledWith(1, ['172.18.0.1', '10.0.0.0/24']))
    expect(mockedGetAPIKeys).toHaveBeenCalledTimes(2)
    const updatedRow = await screen.findByRole('row', { name: /默认密钥/i })
    expect(within(updatedRow).getByText('172.18.0.1')).toBeInTheDocument()
    expect(within(updatedRow).getByText('10.0.0.0/24')).toBeInTheDocument()
  })

  it('allows clearing whitelist to remove restrictions and reloads list', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <ApiKeysPage />
      </MemoryRouter>,
    )
    const keysCard = await screen.findByTestId('api-keys-current-keys-card')
    await within(keysCard).findByText('默认密钥')

    await user.click(within(getApiKeyRow('默认密钥')).getByRole('button', { name: /编辑白名单/ }))
    const whitelistEditor = screen.getByTestId('api-keys-whitelist-editor-card')
    const whitelistInput = within(whitelistEditor).getByPlaceholderText('172.18.0.1,10.0.0.0/24')
    await user.clear(whitelistInput)
    await user.click(within(whitelistEditor).getByRole('button', { name: '保存白名单' }))

    await waitFor(() => expect(mockedUpdateAPIKeyWhitelist).toHaveBeenCalledWith(1, []))
    expect(mockedGetAPIKeys).toHaveBeenCalledTimes(2)
  })

  it('shows backend error when whitelist update fails', async () => {
    const user = userEvent.setup()
    mockedUpdateAPIKeyWhitelist.mockRejectedValueOnce({ response: { data: { error: '白名单格式不合法' } } })

    render(
      <MemoryRouter>
        <ApiKeysPage />
      </MemoryRouter>,
    )
    const keysCard = await screen.findByTestId('api-keys-current-keys-card')
    await within(keysCard).findByText('默认密钥')

    await user.click(within(getApiKeyRow('默认密钥')).getByRole('button', { name: /编辑白名单/ }))
    const whitelistEditor = screen.getByTestId('api-keys-whitelist-editor-card')
    const whitelistInput = within(whitelistEditor).getByPlaceholderText('172.18.0.1,10.0.0.0/24')
    await user.clear(whitelistInput)
    await user.type(whitelistInput, 'invalid host')
    await user.click(within(whitelistEditor).getByRole('button', { name: '保存白名单' }))

    await waitFor(() => expect(mockedUpdateAPIKeyWhitelist).toHaveBeenCalledWith(1, ['invalid host']))
    expect(await screen.findByText('白名单格式不合法')).toBeInTheDocument()
    expect(within(whitelistEditor).getByPlaceholderText('172.18.0.1,10.0.0.0/24')).toBeInTheDocument()
  })

  it('renders audit trail, shared navigation bridge actions, and the capability matrix contract', async () => {
    renderApiKeysPage()

    expect(await screen.findByRole('heading', { name: '创建 API Key' })).toBeInTheDocument()
    const auditCard = screen.getByTestId('api-keys-audit-log-card')
    const auditScope = within(auditCard)
    expect(auditScope.getByText('创建 API Key')).toBeInTheDocument()
    expect(auditScope.getByText('create')).toBeInTheDocument()

    const bridgeRegion = screen.getByRole('region', { name: '共享接入桥接' })
    const bridgeScope = within(bridgeRegion)
    expect(bridgeRegion).toHaveTextContent('API Keys → 开发者 Webhook 接入工作台 → API 文档与接入控制台')
    expect(bridgeScope.getByRole('heading', { name: '共享接入桥接' })).toBeInTheDocument()
    expect(bridgeScope.getByRole('button', { name: /继续配置 Webhook/ })).toBeInTheDocument()
    expect(bridgeScope.getByRole('button', { name: /查看 API 文档/ })).toBeInTheDocument()
    expect(bridgeScope.getByRole('button', { name: /返回项目市场/ })).toBeInTheDocument()
    expect(bridgeScope.queryByRole('button', { name: /前往 Webhook 设置/ })).not.toBeInTheDocument()
    expect(screen.getByText(/若需要程序化回调，请继续配置 Webhook并查看 API 文档。/)).toBeInTheDocument()
    expect(screen.queryByText(/若需要程序化回调，请继续前往 Webhook 设置与 API 文档。/)).not.toBeInTheDocument()

    const capabilityMatrix = screen.getByRole('region', { name: '控制台能力矩阵' })
    expect(within(capabilityMatrix).getByRole('heading', { name: '控制台能力矩阵' })).toBeInTheDocument()
    expect(within(capabilityMatrix).getByText('统一凭证入口')).toBeInTheDocument()
    expect(within(capabilityMatrix).getByText('共享接入桥接')).toBeInTheDocument()
    expect(within(capabilityMatrix).getByText('角色菜单扩展')).toBeInTheDocument()
  })

  it('navigates to shared integration routes from the scoped bridge before and after key creation', async () => {
    const user = userEvent.setup()

    let view = renderApiKeysPage()

    const firstKeysCard = await screen.findByTestId('api-keys-current-keys-card')
    await within(firstKeysCard).findByText('默认密钥')
    await user.click(within(screen.getByTestId('api-keys-shared-console-bridge')).getByRole('button', { name: /继续配置 Webhook/ }))
    expect(await screen.findByTestId('route-stub-webhooks')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: resolveRouteTitle(WEBHOOKS_ROUTE, useAuthStore.getState().user?.role) })).toBeInTheDocument()

    view.unmount()
    view = renderApiKeysPage()
    const secondKeysCard = await screen.findByTestId('api-keys-current-keys-card')
    await within(secondKeysCard).findByText('默认密钥')
    await user.click(within(screen.getByTestId('api-keys-shared-console-bridge')).getByRole('button', { name: /查看 API 文档/ }))
    expect(await screen.findByTestId('route-stub-docs')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'API 文档与接入控制台' })).toBeInTheDocument()

    view.unmount()
    view = renderApiKeysPage()
    const thirdKeysCard = await screen.findByTestId('api-keys-current-keys-card')
    await within(thirdKeysCard).findByText('默认密钥')
    await user.click(within(screen.getByTestId('api-keys-shared-console-bridge')).getByRole('button', { name: /返回项目市场/ }))
    expect(await screen.findByTestId('route-stub-projects')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '项目市场' })).toBeInTheDocument()

    mockedCreateAPIKey.mockResolvedValueOnce({
      plaintext_key: 'nmx_created_secret_2',
      api_key: {
        id: 4,
        name: '联调密钥',
        key_preview: 'nmx_link...2468',
        scopes: ['activation:write'],
        whitelist: [],
        status: 'active',
        created_at: '2026-01-03T00:00:00Z',
        updated_at: '2026-01-03T00:00:00Z',
      },
    })
    mockedGetAPIKeys.mockResolvedValueOnce({
      items: [
        {
          id: 1,
          name: '默认密钥',
          key_preview: 'nmx_abcd...1234',
          scopes: ['activation:read'],
          whitelist: ['127.0.0.1'],
          status: 'active',
          last_used_at: '2026-01-02T00:00:00Z',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ],
    })
    mockedGetAPIKeyAudit.mockResolvedValueOnce({
      items: [
        {
          id: 10,
          action: 'create',
          actor_type: 'user',
          note: '创建联调密钥',
          created_at: '2026-01-03T00:00:00Z',
        },
      ],
    })

    view.unmount()
    renderApiKeysPage()
    const finalKeysCard = await screen.findByTestId('api-keys-current-keys-card')
    await within(finalKeysCard).findByText('默认密钥')
    const createCard = screen.getByTestId('api-keys-create-card')
    fireEvent.change(screen.getByLabelText('名称'), { target: { value: '联调密钥' } })
    fireEvent.change(screen.getByLabelText('权限范围'), { target: { value: 'activation:write' } })
    await user.click(within(createCard).getByRole('button', { name: '创建新密钥' }))
    expect(await screen.findByText(/nmx_created_secret_2/)).toBeInTheDocument()
    await user.click(within(screen.getByTestId('api-keys-shared-console-bridge')).getByRole('button', { name: /继续配置 Webhook/ }))
    expect(await screen.findByTestId('route-stub-webhooks')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: resolveRouteTitle(WEBHOOKS_ROUTE, useAuthStore.getState().user?.role) })).toBeInTheDocument()
  })

  it('shows canonical webhook/docs CTAs in the empty-state action area', async () => {
    mockedGetAPIKeys.mockResolvedValueOnce({ items: [] })
    const user = userEvent.setup()

    renderApiKeysPage()

    const keysCard = await screen.findByTestId('api-keys-current-keys-card')
    const emptyScope = within(keysCard)
    expect(emptyScope.getByText('暂无 API Key，先创建第一个凭证完成接入。')).toBeInTheDocument()
    expect(emptyScope.getByRole('button', { name: '继续配置 Webhook' })).toBeInTheDocument()
    expect(emptyScope.getByRole('button', { name: '查看 API 文档' })).toBeInTheDocument()
    expect(emptyScope.queryByRole('button', { name: '前往 Webhook 设置' })).not.toBeInTheDocument()

    await user.click(emptyScope.getByRole('button', { name: '继续配置 Webhook' }))
    expect(await screen.findByTestId('route-stub-webhooks')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: resolveRouteTitle(WEBHOOKS_ROUTE, useAuthStore.getState().user?.role) })).toBeInTheDocument()
  })

  it('shows a named shared-console fallback region when projects, webhooks, and docs are absent from menu but a preferred route still exists', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 3, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
      ],
    })

    renderApiKeysPage()

    const keysCard = await screen.findByTestId('api-keys-current-keys-card')
    await within(keysCard).findByText('默认密钥')
    const fallback = screen.getByRole('region', { name: '返回共享工作台' })
    expect(within(fallback).getByRole('heading', { name: '返回共享工作台' })).toBeInTheDocument()
    expect(within(fallback).getByText(/当 Webhook、文档与项目入口暂未由服务端暴露时，先回到共享工作台继续共享控制台中的真实业务主链路。/)).toBeInTheDocument()
    expect(within(fallback).getByTestId('api-keys-shared-console-fallback-button')).toBeInTheDocument()
  })

  it('navigates via the scoped fallback CTA to the preferred shared-console route stub', async () => {
    const user = userEvent.setup()

    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 3, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
      ],
    })

    renderApiKeysPage()

    const keysCard = await screen.findByTestId('api-keys-current-keys-card')
    await within(keysCard).findByText('默认密钥')
    const fallback = screen.getByRole('region', { name: '返回共享工作台' })
    await user.click(within(fallback).getByTestId('api-keys-shared-console-fallback-button'))
    expect(await screen.findByTestId('route-stub-dashboard')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '控制台总览' })).toBeInTheDocument()
  })

  it('opens confirmation modal with precise revoke warning copy', async () => {
    const user = userEvent.setup()

    renderApiKeysPage()
    expect(await screen.findByText('默认密钥')).toBeInTheDocument()

    await user.click(within(getApiKeyRow('默认密钥')).getByRole('button', { name: '撤销' }))

    expect(mockedModalConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '确认撤销 API Key「默认密钥」？',
        content: '撤销后该 Key 将无法继续访问受保护接口，请确认调用方已完成切换。',
        okText: '确认撤销',
        cancelText: '取消',
      }),
    )
    expect(mockedRevokeAPIKey).toHaveBeenCalledWith(1)
  })
})
