import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from '@douyinfe/semi-ui'
import { ApiKeysPage } from './ApiKeysPage'
import * as apiKeyService from '../services/apiKeys'
import { useAuthStore } from '../store/authStore'

vi.mock('../services/apiKeys', () => ({
  getAPIKeys: vi.fn(),
  createAPIKey: vi.fn(),
  revokeAPIKey: vi.fn(),
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
const mockedGetAPIKeyAudit = vi.mocked(apiKeyService.getAPIKeyAudit)
const mockedModalConfirm = vi.mocked(Modal.confirm)

function seedRole(role: 'user' | 'supplier' | 'admin' = 'user') {
  useAuthStore.setState({
    token: 'token',
    refreshToken: 'refresh-token',
    user: { id: 1, email: `${role}@nexus-mail.local`, role },
    menu: [],
  })
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
  })

  afterEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })
  })

  it('renders role-specific guidance for current user role', async () => {
    seedRole('supplier')
    render(<ApiKeysPage />)

    expect(await screen.findByText('供给系统 API 接入工作台')).toBeInTheDocument()
    expect(screen.getByText('供应商视角')).toBeInTheDocument()
    expect(screen.getByText(/优先设置固定出口 IP 白名单/)).toBeInTheDocument()
  })

  it('loads and creates api key with trimmed scopes and whitelist', async () => {
    const user = userEvent.setup()

    render(<ApiKeysPage />)
    expect(await screen.findByText('默认密钥')).toBeInTheDocument()
    await user.type(screen.getByLabelText('名称'), '新密钥')
    await user.type(screen.getByLabelText('权限范围'), ' finance:write , , activation:read ')
    await user.type(screen.getByLabelText('IP 白名单'), ' 10.0.0.0/24, ,127.0.0.1 ')
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
    render(<ApiKeysPage />)
    expect(await screen.findByText('已撤销密钥')).toBeInTheDocument()

    const revokeButtons = screen.getAllByRole('button', { name: '撤销' })
    expect(revokeButtons[0]).toBeEnabled()
    expect(revokeButtons[1]).toBeDisabled()
  })

  it('reloads list after revoking an active key', async () => {
    const user = userEvent.setup()

    render(<ApiKeysPage />)
    expect(await screen.findByText('默认密钥')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: '撤销' })[0])

    await waitFor(() => expect(mockedRevokeAPIKey).toHaveBeenCalledWith(1))
    expect(mockedGetAPIKeys).toHaveBeenCalledTimes(2)
  })

  it('does not revoke when modal confirm is cancelled', async () => {
    const user = userEvent.setup()

    mockedModalConfirm.mockImplementationOnce(({ onCancel }) => {
      onCancel?.()
    })

    render(<ApiKeysPage />)
    expect(await screen.findByText('默认密钥')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: '撤销' })[0])

    await waitFor(() => expect(mockedModalConfirm).toHaveBeenCalled())
    expect(mockedRevokeAPIKey).not.toHaveBeenCalled()
  })

  it('renders plaintext api key in one-time banner after creation', async () => {
    const user = userEvent.setup()

    render(<ApiKeysPage />)
    expect(await screen.findByText('默认密钥')).toBeInTheDocument()

    await user.type(screen.getByLabelText('名称'), '新密钥')
    await user.click(screen.getByRole('button', { name: '创建新密钥' }))

    expect(await screen.findByText(/nmx_created_secret/)).toBeInTheDocument()
    expect(screen.queryByText('nmx_created_secret', { selector: 'td' })).not.toBeInTheDocument()
  })

  it('renders audit entries and summary cards', async () => {
    render(<ApiKeysPage />)

    expect(await screen.findByText('开发者 API 接入工作台')).toBeInTheDocument()
    expect(screen.getByText('活跃 Key')).toBeInTheDocument()
    expect(screen.getByText('白名单保护')).toBeInTheDocument()
    expect(screen.getByText('create')).toBeInTheDocument()
    expect(screen.getByText('当前密钥')).toBeInTheDocument()
  })
})
