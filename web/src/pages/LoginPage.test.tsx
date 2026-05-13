import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

const expectedRoleWorkspaces = [
  {
    title: '共享路由常驻同一壳',
    routes: '项目市场 · 订单中心 · API Keys',
    detailKeyword: '登录后控制台',
  },
  {
    title: '额外工作区按服务端角色展开',
    routes: '域名池 · 资源 · 供货规则 · 结算',
    detailKeyword: '服务端授予对应角色后',
  },
  {
    title: '运营治理仍留在共享控制台',
    routes: '风控中心 · 审计日志 · 运营协同',
    detailKeyword: '控制台骨架',
  },
]

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

  it('renders a denser shared-console entry with a compact signal strip and product-style registration runway', () => {
    renderLoginPage()

    expect(screen.getByText('Nexus-Mail · 统一控制台')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '统一登录后控制台' })).toBeInTheDocument()
    const entrySummary = within(screen.getByTestId('login-entry-summary'))
    expect(entrySummary.getByRole('heading', { name: '统一登录后控制台' })).toBeInTheDocument()
    expect(entrySummary.getByText('统一入口、共享控制台与接入路径，在同一登录面完成切换。')).toBeInTheDocument()
    expect(entrySummary.queryByText('统一入口、共享壳与接入路径，在同一登录面完成切换。')).not.toBeInTheDocument()
    expect(screen.queryByText('只保留登录入口、共享控制台与接入路径这三个稳定承诺，减少登录前的解释成本。')).not.toBeInTheDocument()

    const readinessScope = within(screen.getByTestId('login-control-plane-readiness'))
    expect(readinessScope.getByRole('heading', { name: '控制台入口信号' })).toBeInTheDocument()
    expect(readinessScope.getByText('先确认统一入口、共享壳与接入落点，再进入登录或注册。')).toBeInTheDocument()
    expect(readinessScope.getByText('统一入口')).toBeInTheDocument()
    expect(readinessScope.getByText('登录 / 注册同入口')).toBeInTheDocument()
    expect(readinessScope.getByText('共享控制台')).toBeInTheDocument()
    expect(readinessScope.getByText('登录后进入同一壳')).toBeInTheDocument()
    expect(readinessScope.getByText('开发接入')).toBeInTheDocument()
    expect(readinessScope.getByText('Keys · Webhooks · Docs')).toBeInTheDocument()
    expect(screen.getByTestId('login-control-plane-readiness').querySelectorAll('[data-testid="login-readiness-item"]')).toHaveLength(3)
    expect(readinessScope.queryByText('控制台入口摘要')).not.toBeInTheDocument()
    expect(readinessScope.queryByText('登录前只保留统一入口、共享控制台与接入路径三条最小事实。')).not.toBeInTheDocument()
    expect(readinessScope.queryByText('角色菜单')).not.toBeInTheDocument()
    expect(readinessScope.queryByText('按服务端角色切换')).not.toBeInTheDocument()
    expect(screen.queryByText('开发环境快捷账号')).not.toBeInTheDocument()

    const roleWorkspaceScope = within(screen.getByTestId('login-role-workspaces'))
    expect(roleWorkspaceScope.getByRole('heading', { name: '角色工作区如何在同一壳内展开' })).toBeInTheDocument()
    expect(roleWorkspaceScope.getByText('先用同一入口登录；额外工作区只会在服务端授予对应角色后出现在同一套控制台菜单里。')).toBeInTheDocument()
    expect(roleWorkspaceScope.queryByText('登录前不展示任何角色差异。')).not.toBeInTheDocument()
    const roleWorkspaceCards = within(screen.getByTestId('login-role-workspaces')).getAllByTestId('login-role-workspace-card')
    expect(roleWorkspaceCards).toHaveLength(3)
    expectedRoleWorkspaces.forEach((workspace, index) => {
      const card = within(roleWorkspaceCards[index])
      expect(card.getByText(workspace.title)).toBeInTheDocument()
      expect(card.getByText(workspace.routes)).toBeInTheDocument()
      expect(card.getByText(new RegExp(workspace.detailKeyword))).toBeInTheDocument()
    })

    const capabilityMatrix = within(screen.getByTestId('login-capability-matrix'))
    expect(capabilityMatrix.getByText('控制台能力矩阵')).toBeInTheDocument()
    expect(capabilityMatrix.getAllByTestId('login-capability-matrix-item')).toHaveLength(3)
    expect(capabilityMatrix.getByText('统一登录入口')).toBeInTheDocument()
    expect(capabilityMatrix.getByText('共享接入桥接')).toBeInTheDocument()
    expect(capabilityMatrix.getByText('服务端菜单扩展')).toBeInTheDocument()
    expect(capabilityMatrix.getByText('登录 / 注册同入口，避免拆出第二套身份站。')).toBeInTheDocument()
    expect(capabilityMatrix.getByText('API Keys、Webhook 与文档核对继续留在同一控制台导航里。')).toBeInTheDocument()
    expect(capabilityMatrix.getByText('供应商 / 管理员工作区只在授权后于同一壳内展开。')).toBeInTheDocument()
    expect(capabilityMatrix.queryByText('多后台切换')).not.toBeInTheDocument()

    expect(screen.getByTestId('login-auth-shell')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '登录并进入统一控制台' })).toBeInTheDocument()
    expect(screen.getByText('登录后按角色展开工作区，继续同一套导航。')).toBeInTheDocument()
    expect(screen.queryByText('登录后按角色展开工作区，无需切换后台。')).not.toBeInTheDocument()
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

    const registerJourneyRegion = screen.getByRole('region', { name: '首轮接入路径' })
    const registerJourneyScope = within(registerJourneyRegion)
    expect(registerJourneyScope.getByRole('heading', { name: '首轮接入路径' })).toBeInTheDocument()
    expect(registerJourneyScope.getByText('注册后进入共享控制台，再按当前菜单继续选择首轮接入动作。')).toBeInTheDocument()
    expect(registerJourneyScope.queryByText('注册后进入共享控制台，沿同一导航完成首轮接入。')).not.toBeInTheDocument()
    expect(registerJourneyScope.queryByText('注册后进入共享控制台，按同一导航完成首轮接入。')).not.toBeInTheDocument()
    expect(registerJourneyScope.queryByText('注册后进入共享控制台，按 API Keys → Webhook → Docs 完成首轮接入。')).not.toBeInTheDocument()
    expect(registerJourneyScope.queryByText('注册后沿同一导航完成首个 Key、Webhook 与文档核对。')).not.toBeInTheDocument()
    expect(registerJourneyScope.queryByRole('heading', { name: '注册后第一轮动作' })).not.toBeInTheDocument()
    expect(registerJourneyScope.queryByText('在同一控制台完成 Key、Webhook 与文档核对。')).not.toBeInTheDocument()

    const apiKeysRunway = registerJourneyScope.getByTestId('login-runway-card-api-keys')
    expect(within(apiKeysRunway).getByText('STEP 01')).toBeInTheDocument()
    expect(within(apiKeysRunway).getByRole('heading', { name: 'API Keys 起步' })).toBeInTheDocument()
    expect(within(apiKeysRunway).getByText('最小权限起步')).toBeInTheDocument()
    expect(within(apiKeysRunway).getByText('生成首个最小权限密钥。')).toBeInTheDocument()
    expect(within(apiKeysRunway).queryByText('生成首个最小权限密钥，作为接入起点。')).not.toBeInTheDocument()
    expect(within(apiKeysRunway).queryByText('生成首个最小权限 API Key。')).not.toBeInTheDocument()
    expect(within(apiKeysRunway).queryByText('生成首个最小权限密钥，作为共享控制台内的起点。')).not.toBeInTheDocument()

    const webhooksRunway = registerJourneyScope.getByTestId('login-runway-card-webhooks')
    expect(within(webhooksRunway).getByText('STEP 02')).toBeInTheDocument()
    expect(within(webhooksRunway).getByRole('heading', { name: 'Webhook 联调' })).toBeInTheDocument()
    expect(within(webhooksRunway).getByText('真实回调验证')).toBeInTheDocument()
    expect(within(webhooksRunway).getByText('确认回调地址并发起真实联调。')).toBeInTheDocument()
    expect(within(webhooksRunway).queryByText('确认回调地址，随后发起真实联调。')).not.toBeInTheDocument()
    expect(within(webhooksRunway).queryByText('确认回调地址并发起一次真实联调。')).not.toBeInTheDocument()
    expect(within(webhooksRunway).queryByText('确认回调地址，随后补一次真实联调。')).not.toBeInTheDocument()

    const docsRunway = registerJourneyScope.getByTestId('login-runway-card-docs')
    expect(within(docsRunway).getByText('STEP 03')).toBeInTheDocument()
    expect(within(docsRunway).getByRole('heading', { name: '文档核对' })).toBeInTheDocument()
    expect(within(docsRunway).getByText('契约核对')).toBeInTheDocument()
    expect(within(docsRunway).getByText('查看 API 文档并核对请求契约。')).toBeInTheDocument()
    expect(within(docsRunway).queryByText('核对 API 文档与请求契约。')).not.toBeInTheDocument()
    expect(within(docsRunway).queryByText('核对 API 文档、请求契约与回放链路。')).not.toBeInTheDocument()

    expect(registerJourneyScope.queryByRole('heading', { name: '创建 Key' })).not.toBeInTheDocument()
    expect(registerJourneyScope.queryByRole('heading', { name: '配置 Webhook' })).not.toBeInTheDocument()
    expect(registerJourneyScope.queryByRole('heading', { name: '对照文档' })).not.toBeInTheDocument()
    expect(registerJourneyScope.queryByText('先确认回调地址，再补投递验证。')).not.toBeInTheDocument()
    expect(registerJourneyScope.queryByText('回到文档页核对请求契约与回放链路。')).not.toBeInTheDocument()
    expect(registerJourneyScope.queryByRole('heading', { name: '注册后进入同一套控制台' })).not.toBeInTheDocument()
    expect(registerJourneyScope.getByRole('button', { name: /立即注册，进入共享控制台/ })).toBeInTheDocument()
  })

  it('switches the embedded auth guidance when moving from login to register mode', async () => {
    const user = userEvent.setup()

    renderLoginPage()

    const authShell = screen.getByTestId('login-auth-shell')
    expect(within(within(authShell).getByTestId('login-auth-guidance-banner')).getByText(/已有账号可直接进入共享控制台，继续同一套工作区。/)).toBeInTheDocument()

    const modeSwitch = within(authShell).getByTestId('login-auth-mode-switch')
    await user.click(within(modeSwitch).getByRole('tab', { name: '注册' }))

    expect(screen.getByRole('heading', { name: '创建账号并进入统一控制台' })).toBeInTheDocument()
    const registerBanner = within(screen.getByTestId('login-auth-guidance-banner'))
    expect(registerBanner.getByText(/注册后直接进入共享控制台，你可以继续前往项目市场、订单中心与 API Keys。/)).toBeInTheDocument()
    expect(within(screen.getByTestId('login-auth-copy-block')).getByText('注册后直接进入共享控制台，你可以继续前往项目市场、订单中心与 API Keys。')).toBeInTheDocument()
    expect(registerBanner.queryByText(/注册后直接进入共享控制台，沿同一导航前往项目市场、订单中心与 API Keys。/)).not.toBeInTheDocument()
    expect(registerBanner.queryByText(/注册后直接进入共享控制台，再沿同一导航前往项目市场、订单中心与 API Keys。/)).not.toBeInTheDocument()
    const modeSwitchScope = within(modeSwitch)
    const registerButton = modeSwitchScope.getByRole('tab', { name: '注册' })
    const loginButton = within(modeSwitch).getByRole('tab', { name: '登录' })
    expect(registerButton).toHaveAttribute('aria-selected', 'true')
    expect(loginButton).toHaveAttribute('aria-selected', 'false')
    expect(registerBanner.queryByText(/注册成功后不会跳转到独立新手页/)).not.toBeInTheDocument()
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
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), { target: { value: 'new@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('至少 8 位密码'), { target: { value: 'Password123!' } })
    fireEvent.change(screen.getByPlaceholderText('再次输入密码'), { target: { value: 'Password123!' } })
    await user.click(screen.getByRole('button', { name: '注册并进入统一控制台' }))

    await waitFor(() => expect(mockedRegister).toHaveBeenCalledWith('new@example.com', 'Password123!'))
    expect(useAuthStore.getState()).toMatchObject({
      token: 'register-token',
      refreshToken: 'register-refresh',
      user: { id: 8, email: 'new@example.com', role: 'user' },
    })
    expect(await screen.findByTestId('shared-console-home')).toBeInTheDocument()
  })

  it('blocks registration when email is invalid before calling the API', async () => {
    const user = userEvent.setup()

    renderLoginPage()

    await user.click(getRegisterJourneyScope().getByRole('button', { name: /立即注册，进入共享控制台/ }))
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), { target: { value: 'invalid-email' } })
    fireEvent.change(screen.getByPlaceholderText('至少 8 位密码'), { target: { value: 'Password123!' } })
    fireEvent.change(screen.getByPlaceholderText('再次输入密码'), { target: { value: 'Password123!' } })
    await user.click(screen.getByRole('button', { name: '注册并进入统一控制台' }))

    expect(await screen.findByText('请输入有效邮箱')).toBeInTheDocument()
    expect(mockedRegister).not.toHaveBeenCalled()
  })

  it('blocks registration when password is shorter than 8 characters before calling the API', async () => {
    const user = userEvent.setup()

    renderLoginPage()

    await user.click(getRegisterJourneyScope().getByRole('button', { name: /立即注册，进入共享控制台/ }))
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), { target: { value: 'new@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('至少 8 位密码'), { target: { value: 'short7!' } })
    fireEvent.change(screen.getByPlaceholderText('再次输入密码'), { target: { value: 'short7!' } })
    await user.click(screen.getByRole('button', { name: '注册并进入统一控制台' }))

    expect(await screen.findByText('密码长度至少为 8 位')).toBeInTheDocument()
    expect(mockedRegister).not.toHaveBeenCalled()
  })

  it('accepts registration when password is exactly 8 characters long', async () => {
    const user = userEvent.setup()
    const exactBoundaryPassword = 'Abc12!@#'

    mockedRegister.mockResolvedValueOnce({
      token: 'register-token-8',
      refresh_token: 'register-refresh-8',
      user: { id: 18, email: 'boundary@example.com', role: 'user' },
    })

    renderLoginPage()

    await user.click(getRegisterJourneyScope().getByRole('button', { name: /立即注册，进入共享控制台/ }))
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), { target: { value: 'boundary@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('至少 8 位密码'), { target: { value: exactBoundaryPassword } })
    fireEvent.change(screen.getByPlaceholderText('再次输入密码'), { target: { value: exactBoundaryPassword } })
    await user.click(screen.getByRole('button', { name: '注册并进入统一控制台' }))

    await waitFor(() => expect(mockedRegister).toHaveBeenCalledWith('boundary@example.com', exactBoundaryPassword))
    expect(await screen.findByTestId('shared-console-home')).toBeInTheDocument()
  })

  it('blocks registration when confirmation password does not match', async () => {
    const user = userEvent.setup()

    renderLoginPage()

    await user.click(getRegisterJourneyScope().getByRole('button', { name: /立即注册，进入共享控制台/ }))
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), { target: { value: 'new@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('至少 8 位密码'), { target: { value: 'Password123!' } })
    fireEvent.change(screen.getByPlaceholderText('再次输入密码'), { target: { value: 'Password123?' } })
    await user.click(screen.getByRole('button', { name: '注册并进入统一控制台' }))

    expect(await screen.findByText('两次输入的密码不一致')).toBeInTheDocument()
    expect(mockedRegister).not.toHaveBeenCalled()
  })
})
