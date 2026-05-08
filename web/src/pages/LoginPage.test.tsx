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
        <Route
          path="/"
          element={(
            <section data-testid="shared-console-home">
              <h1>控制台总览</h1>
            </section>
          )}
        />
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
              <h1>开发者 Webhook 接入工作台</h1>
            </section>
          }
        />
        <Route
          path={DOCS_ROUTE}
          element={
            <section data-testid="login-route-stub-docs">
              <h1>API 文档与接入控制台</h1>
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

  it('renders a denser shared-console entry with a compact readiness summary and product-style registration runway', () => {
    renderLoginPage()

    expect(screen.getByText('Nexus-Mail · 统一控制台')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '统一登录后控制台' })).toBeInTheDocument()

    const readinessScope = within(screen.getByTestId('login-control-plane-readiness'))
    expect(readinessScope.getByRole('heading', { name: '控制台入口摘要' })).toBeInTheDocument()
    expect(readinessScope.getByText('统一入口')).toBeInTheDocument()
    expect(readinessScope.getByText('登录与注册同入口')).toBeInTheDocument()
    expect(readinessScope.getByText('共享控制台')).toBeInTheDocument()
    expect(readinessScope.getByText('登录后直达同一壳')).toBeInTheDocument()
    expect(readinessScope.getByText('开发接入')).toBeInTheDocument()
    expect(readinessScope.getByText('Keys · Webhooks · Docs')).toBeInTheDocument()
    expect(screen.getByTestId('login-control-plane-readiness').querySelectorAll('[data-testid="login-readiness-item"]')).toHaveLength(3)
    expect(readinessScope.queryByText('角色菜单')).not.toBeInTheDocument()
    expect(readinessScope.queryByText('按服务端角色切换')).not.toBeInTheDocument()
    expect(screen.queryByTestId('login-role-workspaces')).not.toBeInTheDocument()
    expect(screen.queryByText('开发环境快捷账号')).not.toBeInTheDocument()

    expect(screen.getByTestId('login-auth-shell')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '登录并进入统一控制台' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '登录并进入统一控制台' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('name@example.com')).toHaveStyle({ color: 'rgb(247, 248, 248)' })
    expect(screen.getByPlaceholderText('请输入密码')).toHaveStyle({ color: 'rgb(247, 248, 248)' })

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
    expect(registerJourneyScope.getByRole('heading', { name: '首轮接入路径' })).toBeInTheDocument()
    expect(registerJourneyScope.getByText('注册后沿同一导航完成首个 Key、Webhook 与文档核对。')).toBeInTheDocument()
    expect(registerJourneyScope.getByText('STEP 01')).toBeInTheDocument()
    expect(registerJourneyScope.getByText('STEP 02')).toBeInTheDocument()
    expect(registerJourneyScope.getByText('STEP 03')).toBeInTheDocument()
    expect(registerJourneyScope.getByRole('heading', { name: '创建 Key' })).toBeInTheDocument()
    expect(registerJourneyScope.getByRole('heading', { name: '配置 Webhook' })).toBeInTheDocument()
    expect(registerJourneyScope.getByRole('heading', { name: '对照文档' })).toBeInTheDocument()
    expect(registerJourneyScope.getByText('最小权限起步')).toBeInTheDocument()
    expect(registerJourneyScope.getByText('生成首个最小权限 API Key。')).toBeInTheDocument()
    expect(registerJourneyScope.getByText('先确认回调地址，再补投递验证。')).toBeInTheDocument()
    expect(registerJourneyScope.getByText('文档核对')).toBeInTheDocument()
    expect(registerJourneyScope.getByText('回到同一控制台核对请求契约。')).toBeInTheDocument()
    expect(registerJourneyScope.queryByText('生成首个 API Key。')).not.toBeInTheDocument()
    expect(registerJourneyScope.queryByText('补齐回调地址并发起一次联调。')).not.toBeInTheDocument()
    expect(registerJourneyScope.queryByText('回到文档核对请求契约。')).not.toBeInTheDocument()
    expect(registerJourneyScope.queryByRole('heading', { name: '注册后进入同一套控制台' })).not.toBeInTheDocument()
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
