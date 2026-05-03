import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Modal } from '@douyinfe/semi-ui'
import { ApiKeysPage } from './ApiKeysPage'
import * as apiKeyService from '../services/apiKeys'
import { useAuthStore } from '../store/authStore'
import { API_KEYS_ROUTE, DOCS_ROUTE, ORDERS_ROUTE, PROJECTS_ROUTE, WEBHOOKS_ROUTE } from '../utils/consoleNavigation'

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
        <Route path={PROJECTS_ROUTE} element={<div>项目市场页面</div>} />
        <Route path={ORDERS_ROUTE} element={<div>订单中心页面</div>} />
        <Route path={API_KEYS_ROUTE} element={<ApiKeysPage />} />
        <Route path={WEBHOOKS_ROUTE} element={<div>Webhook 设置页面</div>} />
        <Route path={DOCS_ROUTE} element={<div>API 文档页面</div>} />
        <Route path="/" element={<div>共享控制台首页</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

function getApiKeyRow(name: string) {
  const rowLabel = screen.getByText(name)
  const row = rowLabel.closest('[role="row"]')
  expect(row).not.toBeNull()
  return row as HTMLElement
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

    expect(await screen.findByText('开发者 API 接入工作台')).toBeInTheDocument()
    expect(screen.getByText('共享控制台 · 供应商扩展')).toBeInTheDocument()
    expect(screen.getByText(/优先设置固定出口 IP 白名单/)).toBeInTheDocument()
  })

  it('loads and creates api key with trimmed scopes and whitelist', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <ApiKeysPage />
      </MemoryRouter>,
    )
    expect(await screen.findByText('默认密钥')).toBeInTheDocument()
    await user.type(screen.getByLabelText('名称'), '新密钥')
    await user.type(screen.getByLabelText('权限范围'), ' finance:write , , activation:read ')
    await user.type(screen.getByPlaceholderText('127.0.0.1,10.0.0.0/24'), ' 10.0.0.0/24, ,127.0.0.1 ')
    await user.click(screen.getByRole('button', { name: '创建新密钥' }))

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
    expect(await screen.findByText('已撤销密钥')).toBeInTheDocument()

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
    expect(await screen.findByText('默认密钥')).toBeInTheDocument()

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
    expect(await screen.findByText('默认密钥')).toBeInTheDocument()

    await user.click(within(getApiKeyRow('默认密钥')).getByRole('button', { name: /编辑白名单/ }))
    const whitelistInput = screen.getByPlaceholderText('172.18.0.1,10.0.0.0/24')
    expect((whitelistInput as HTMLInputElement).value).toContain('127.0.0.1')
    await user.clear(whitelistInput)
    await user.type(whitelistInput, ' 172.18.0.1 , , 10.0.0.0/24 ')
    await user.click(screen.getByRole('button', { name: '保存白名单' }))

    await waitFor(() => expect(mockedUpdateAPIKeyWhitelist).toHaveBeenCalledWith(1, ['172.18.0.1', '10.0.0.0/24']))
    expect(mockedGetAPIKeys).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(screen.getByPlaceholderText('127.0.0.1,10.0.0.0/24')).toBeInTheDocument())
  })

  it('allows clearing whitelist to remove restrictions', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <ApiKeysPage />
      </MemoryRouter>,
    )
    expect(await screen.findByText('默认密钥')).toBeInTheDocument()

    await user.click(within(getApiKeyRow('默认密钥')).getByRole('button', { name: /编辑白名单/ }))
    const whitelistInput = screen.getByPlaceholderText('172.18.0.1,10.0.0.0/24')
    await user.clear(whitelistInput)
    await user.click(screen.getByRole('button', { name: '保存白名单' }))

    await waitFor(() => expect(mockedUpdateAPIKeyWhitelist).toHaveBeenCalledWith(1, []))
  })

  it('shows backend error when whitelist update fails', async () => {
    const user = userEvent.setup()
    mockedUpdateAPIKeyWhitelist.mockRejectedValueOnce({
      response: { data: { error: 'IP 白名单仅支持合法 IP 或 CIDR' } },
    })

    render(
      <MemoryRouter>
        <ApiKeysPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('默认密钥')).toBeInTheDocument()
    await user.click(within(getApiKeyRow('默认密钥')).getByRole('button', { name: /编辑白名单/ }))
    await user.clear(screen.getByPlaceholderText('172.18.0.1,10.0.0.0/24'))
    await user.type(screen.getByPlaceholderText('172.18.0.1,10.0.0.0/24'), 'invalid-entry')
    await user.click(screen.getByRole('button', { name: '保存白名单' }))

    await waitFor(() => expect(mockedUpdateAPIKeyWhitelist).toHaveBeenCalledWith(1, ['invalid-entry']))
    expect(await screen.findByText('IP 白名单仅支持合法 IP 或 CIDR')).toBeInTheDocument()
  })

  it('navigates from the existing shared integration CTAs into the docs workspace', async () => {
    const user = userEvent.setup()
    mockedGetAPIKeys.mockResolvedValueOnce({ items: [] })

    renderApiKeysPage()
    expect(await screen.findByText('暂无 API Key，先创建第一个凭证完成接入。')).toBeInTheDocument()
    expect(screen.getByText('完成创建、复制、权限规划与白名单维护，再结合 API 文档与 Webhook 页面打通真实接入链路。')).toBeInTheDocument()
    expect(screen.getByText('新建后仅展示一次明文密钥，请立即复制保存；后续列表仅显示 key_preview。若需要程序化回调，请继续前往 Webhook 设置与 API 文档。')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '查看 API 文档' }))
    expect(await screen.findByText('API 文档页面')).toBeInTheDocument()
  })

  it('keeps the integration fallback lane inside the shared console and renders the docs bridge copy when docs is available', async () => {
    renderApiKeysPage()

    expect(await screen.findByText('共享接入回退路径')).toBeInTheDocument()
    expect(screen.getByText('API Keys → Webhook → 文档')).toBeInTheDocument()
    expect(screen.getByText('保持共享控制台中的接入顺序：先发放最小权限密钥，再继续回调联调与文档核对；如果当前角色未暴露这些入口，则回到推荐工作台继续真实业务主链路。')).toBeInTheDocument()
  })

  it('suppresses integration CTAs and returns to the preferred workspace when webhook/docs routes are unavailable', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 2, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
      ],
    })

    renderApiKeysPage()

    expect(await screen.findByText('共享接入回退路径')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '返回项目市场' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '继续配置 Webhook' })).not.toBeInTheDocument()
    expect(screen.queryAllByRole('button', { name: '查看 API 文档' })).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: /返回推荐工作台/ }))
    expect(await screen.findByText('共享控制台首页')).toBeInTheDocument()
  })

  it('uses modal confirmation for revoke flow', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <ApiKeysPage />
      </MemoryRouter>,
    )
    expect(await screen.findByText('默认密钥')).toBeInTheDocument()
    await user.click(within(getApiKeyRow('默认密钥')).getByRole('button', { name: '撤销' }))

    expect(mockedModalConfirm).toHaveBeenCalledTimes(1)
  })
})
