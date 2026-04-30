import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import '@testing-library/jest-dom'
import { LoginPage } from './LoginPage'
import * as authService from '../services/auth'
import { useAuthStore } from '../store/authStore'
import { API_KEYS_ROUTE, DOCS_ROUTE, WEBHOOKS_ROUTE } from '../utils/consoleNavigation'

vi.mock('../services/auth', async () => {
  const actual = await vi.importActual<typeof import('../services/auth')>('../services/auth')
  return {
    ...actual,
    login: vi.fn(),
    register: vi.fn(),
  }
})

const mockedLogin = vi.mocked(authService.login)
const mockedRegister = vi.mocked(authService.register)

function renderLoginPage(initialEntry = '/login') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>共享控制台首页</div>} />
        <Route path={API_KEYS_ROUTE} element={<div>API Keys 页面</div>} />
        <Route path={WEBHOOKS_ROUTE} element={<div>Webhook 设置页面</div>} />
        <Route path={DOCS_ROUTE} element={<div>API 文档页面</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    mockedLogin.mockResolvedValue({
      token: 'login-token',
      refresh_token: 'login-refresh',
      user: { id: 7, email: 'user@example.com', role: 'user' },
    })
    mockedRegister.mockResolvedValue({
      token: 'register-token',
      refresh_token: 'register-refresh',
      user: { id: 8, email: 'new@example.com', role: 'user' },
    })
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })
  })

  afterEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })
  })

  it('shows shared integration stage cards on the registration shell and opens register mode from the CTA', async () => {
    const user = userEvent.setup()

    renderLoginPage()

    expect(screen.getByText('注册后默认进入共享控制台')).toBeInTheDocument()
    expect(screen.getByText('Shared Console')).toBeInTheDocument()
    expect(screen.getByText(/Registration → API Keys → Webhooks → Docs/)).toBeInTheDocument()
    expect(screen.getByText('注册完成后建议立即创建首个 API Key、绑定出口白名单，并继续接入 Webhook / API 文档。')).toBeInTheDocument()
    expect(screen.getByText('先发放最小权限 API Key')).toBeInTheDocument()
    expect(screen.getByText('再验证 Webhook 回调')).toBeInTheDocument()
    expect(screen.getByText('最后回到 API 文档')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /立即注册，进入共享控制台/ }))

    expect(screen.getByRole('heading', { name: '注册 Nexus-Mail' })).toBeInTheDocument()
    expect(screen.getByText('仅需邮箱与密码即可开通账户；注册成功后直接进入同一套控制台。')).toBeInTheDocument()
  })

  it('submits registration and persists the shared-console session', async () => {
    const user = userEvent.setup()

    renderLoginPage()

    await user.click(screen.getByRole('button', { name: /立即注册，进入共享控制台/ }))
    await user.type(screen.getByPlaceholderText('name@example.com'), 'new@example.com')
    await user.type(screen.getByPlaceholderText('至少 8 位密码'), 'Password123!')
    await user.type(screen.getByPlaceholderText('再次输入密码'), 'Password123!')
    await user.click(screen.getByRole('button', { name: '创建账户并进入控制台' }))

    await waitFor(() => expect(mockedRegister).toHaveBeenCalledWith('new@example.com', 'Password123!'))
    expect(useAuthStore.getState()).toMatchObject({
      token: 'register-token',
      refreshToken: 'register-refresh',
      user: { id: 8, email: 'new@example.com', role: 'user' },
    })
    expect(await screen.findByText('共享控制台首页')).toBeInTheDocument()
  })

  it('blocks registration when confirmation password does not match', async () => {
    const user = userEvent.setup()

    renderLoginPage()

    await user.click(screen.getByRole('button', { name: /立即注册，进入共享控制台/ }))
    await user.type(screen.getByPlaceholderText('name@example.com'), 'new@example.com')
    await user.type(screen.getByPlaceholderText('至少 8 位密码'), 'Password123!')
    await user.type(screen.getByPlaceholderText('再次输入密码'), 'Password123?')
    await user.click(screen.getByRole('button', { name: '创建账户并进入控制台' }))

    expect(await screen.findByText('两次输入的密码不一致')).toBeInTheDocument()
    expect(mockedRegister).not.toHaveBeenCalled()
  })
})
