import { render, screen, waitFor } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import { ApiKeysPage } from './ApiKeysPage'
import * as apiKeyService from '../services/apiKeys'

vi.mock('../services/apiKeys', () => ({
  getAPIKeys: vi.fn(),
  createAPIKey: vi.fn(),
  revokeAPIKey: vi.fn(),
  getAPIKeyAudit: vi.fn(),
}))

const mockedGetAPIKeys = vi.mocked(apiKeyService.getAPIKeys)
const mockedCreateAPIKey = vi.mocked(apiKeyService.createAPIKey)
const mockedRevokeAPIKey = vi.mocked(apiKeyService.revokeAPIKey)
const mockedGetAPIKeyAudit = vi.mocked(apiKeyService.getAPIKeyAudit)

describe('ApiKeysPage', () => {
  beforeEach(() => {
    mockedGetAPIKeys.mockResolvedValue({
      items: [
        {
          id: 1,
          name: '默认密钥',
          key_preview: 'nmx_abcd...1234',
          scopes: ['activation:read'],
          whitelist: ['127.0.0.1'],
          status: 'active',
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
        id: 2,
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
  })

  it('loads and creates api key with whitelist', async () => {
    render(<ApiKeysPage />)
    expect(await screen.findByText('默认密钥')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('名称'), { target: { value: '新密钥' } })
    fireEvent.change(screen.getByLabelText('权限范围'), { target: { value: 'finance:write' } })
    fireEvent.change(screen.getByLabelText('IP 白名单'), { target: { value: '10.0.0.0/24' } })
    fireEvent.click(screen.getByRole('button', { name: '创建新密钥' }))
    await waitFor(() => expect(mockedCreateAPIKey).toHaveBeenCalled())
    expect(await screen.findByText(/nmx_created_secret/)).toBeInTheDocument()
  })
})
