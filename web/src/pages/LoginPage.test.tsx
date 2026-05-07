import { render, screen, waitFor, within } from '@testing-library/react'
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
        <Route path="/" element={<div data-testid="shared-console-home">控制台总览</div>} />
        <Route
          path={API_KEYS_ROUTE}
          element={
            <section data-testid="login-route-stub-api-keys">
              <h1>开发者 API 接入工作台</h1>
            </section>
          }
        />
        <Route
          path={WEBHOOKS_ROUTE}
          element={
            <section data-testid="login-route-stub-webhooks">
              <h1>Webhook 设置</h1>
            </section>
          }
        />
        <Route
          path={DOCS_ROUTE}
          element={
            <section data-testid="login-route-stub-docs">
              <h1>API 文档</h1>
            </section>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

function getRegisterJourneyScope() {
  return within(screen.getByTestId('login-register-journey'))
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

  it('renders a compact shared-console hero with one scoped registration runway', () => {
    renderLoginPage()

    expect(screen.getByText('Nexus-Mail · 统一控制台')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '统一登录后控制台' })).toBeInTheDocument()
    expect(screen.getByTestId('login-hero-signal-grid')).toBeInTheDocument()
    expect(screen.getByTestId('login-auth-shell')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '登录并进入统一控制台' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '登录并进入统一控制台' })).toBeInTheDocument()

    const authShell = screen.getByTestId('login-auth-shell')
    const modeSwitch = within(authShell).getByTestId('login-auth-mode-switch')
    expect(modeSwitch).toHaveAttribute('role', 'tablist')
    expect(modeSwitch).toHaveAttribute('aria-label', '认证模式切换')
    const loginButton = within(modeSwitch).getByRole('tab', { name: '登录' })
    const registerButton = within(modeSwitch).getByRole('tab', { name: '注册' })
    expect(loginButton).toHaveAttribute('aria-selected', 'true')
    expect(registerButton).toHaveAttribute('aria-selected', 'false')
    expect(within(authShell).getByTestId('login-auth-guidance-banner')).toBeInTheDocument()

    const registerJourneyScope = getRegisterJourneyScope()
    expect(registerJourneyScope.getByRole('heading', { name: '注册后进入同一套控制台' })).toBeInTheDocument()
    expect(registerJourneyScope.getByRole('button', { name: /立即注册，进入共享控制台/ })).toBeInTheDocument()
  })

  it('switches the embedded auth guidance when moving from login to register mode', async () => {
    const user = userEvent.setup()

    renderLoginPage()

    const authShell = screen.getByTestId('login-auth-shell')
    expect(within(within(authShell).getByTestId('login-auth-guidance-banner')).getByText(/已有账号可直接进入共享控制台/)).toBeInTheDocument()

    const modeSwitch = within(authShell).getByTestId('login-auth-mode-switch')
    await user.click(within(modeSwitch).getByRole('tab', { name: '注册' }))

    expect(screen.getByRole('heading', { name: '创建账号并进入统一控制台' })).toBeInTheDocument()
    const registerButton = within(modeSwitch).getByRole('tab', { name: '注册' })
    const loginButton = within(modeSwitch).getByRole('tab', { name: '登录' })
    expect(registerButton).toHaveAttribute('aria-selected', 'true')
    expect(loginButton).toHaveAttribute('aria-selected', 'false')
    const registerBanner = within(screen.getByTestId('login-auth-guidance-banner'))
    expect(registerBanner.getByText(/注册成功后不会跳转到独立新手页/)).toBeInTheDocument()
    expect(registerBanner.getByText(/项目市场 → 订单中心 → API Keys/)).toBeInTheDocument()
    expect(registerBanner.queryByText(/已有账号可直接进入共享控制台/)).not.toBeInTheDocument()
  })

  it('opens register mode from the shared-console registration journey CTA', async () => {
    const user = userEvent.setup()

    renderLoginPage()

    const registerJourneyScope = getRegisterJourneyScope()
    expect(registerJourneyScope.getByRole('button', { name: /立即注册，进入共享控制台/ })).toBeInTheDocument()

    await user.click(registerJourneyScope.getByRole('button', { name: /立即注册，进入共享控制台/ }))

    expect(screen.getByRole('heading', { name: '创建账号并进入统一控制台' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '注册并进入统一控制台' })).toBeInTheDocument()
  })

  it('submits registration, persists the shared-console session, and redirects into the shared home route', async () => {
    const user = userEvent.setup()

    renderLoginPage()

    await user.click(getRegisterJourneyScope().getByRole('button', { name: /立即注册，进入共享控制台/ }))
    await user.type(screen.getByPlaceholderText('name@example.com'), 'new@example.com')
    await user.type(screen.getByPlaceholderText('至少 8 位密码'), 'Password123!')
    await user.type(screen.getByPlaceholderText('再次输入密码'), 'Password123!')
    await user.click(screen.getByRole('button', { name: '注册并进入统一控制台' }))

    await waitFor(() => expect(mockedRegister).toHaveBeenCalledWith('new@example.com', 'Password123!'))
    expect(useAuthStore.getState()).toMatchObject({
      token: 'register-token',
      refreshToken: 'register-refresh',
      user: { id: 8, email: 'new@example.com', role: 'user' },
    })
    expect(await screen.findByTestId('shared-console-home')).toBeInTheDocument()
  })

  it('blocks registration when confirmation password does not match', async () => {
    const user = userEvent.setup()

    renderLoginPage()

    await user.click(getRegisterJourneyScope().getByRole('button', { name: /立即注册，进入共享控制台/ }))
    await user.type(screen.getByPlaceholderText('name@example.com'), 'new@example.com')
    await user.type(screen.getByPlaceholderText('至少 8 位密码'), 'Password123!')
    await user.type(screen.getByPlaceholderText('再次输入密码'), 'Password123?')
    await user.click(screen.getByRole('button', { name: '注册并进入统一控制台' }))

    expect(await screen.findByText('两次输入的密码不一致')).toBeInTheDocument()
    expect(mockedRegister).not.toHaveBeenCalled()
  })
})
