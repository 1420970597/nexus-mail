import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import '@testing-library/jest-dom'
import { AdminProjectsPage } from './AdminProjectsPage'
import * as activationService from '../services/activation'
import { useAuthStore } from '../store/authStore'
import {
  ADMIN_AUDIT_ROUTE,
  ADMIN_PRICING_ROUTE,
  ADMIN_RISK_ROUTE,
  API_KEYS_ROUTE,
  DASHBOARD_ROUTE,
  DOCS_ROUTE,
  WEBHOOKS_ROUTE,
  resolveRouteTitle,
} from '../utils/consoleNavigation'

vi.mock('../services/activation', () => ({
  getAdminProjects: vi.fn(),
  getAdminProjectOfferings: vi.fn(),
  updateAdminProject: vi.fn(),
}))

const mockedGetAdminProjects = vi.mocked(activationService.getAdminProjects)
const mockedGetAdminProjectOfferings = vi.mocked(activationService.getAdminProjectOfferings)
const mockedUpdateAdminProject = vi.mocked(activationService.updateAdminProject)

function seedAdminMenu() {
  useAuthStore.setState({
    token: 'token',
    refreshToken: 'refresh-token',
    user: { id: 1, email: 'admin@nexus-mail.local', role: 'admin' },
    menu: [
      { key: 'dashboard', label: '仪表盘', path: '/' },
      { key: 'admin-pricing', label: '价格策略', path: ADMIN_PRICING_ROUTE },
      { key: 'admin-risk', label: '风控中心', path: ADMIN_RISK_ROUTE },
      { key: 'admin-audit', label: '审计日志', path: ADMIN_AUDIT_ROUTE },
      { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
      { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
      { key: 'docs', label: 'API 文档', path: DOCS_ROUTE },
    ],
  })
}

function renderAdminProjectsPage(initialEntry = ADMIN_PRICING_ROUTE) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <main aria-label="控制台主内容">
        <Routes>
          <Route path={ADMIN_PRICING_ROUTE} element={<AdminProjectsPage />} />
          <Route
            path={ADMIN_RISK_ROUTE}
            element={(
              <section data-testid="admin-pricing-route-stub-risk">
                <h1>风控中心</h1>
              </section>
            )}
          />
          <Route
            path={ADMIN_AUDIT_ROUTE}
            element={(
              <section data-testid="admin-pricing-route-stub-audit">
                <h1>审计日志</h1>
              </section>
            )}
          />
          <Route
            path={API_KEYS_ROUTE}
            element={(
              <section data-testid="admin-pricing-route-stub-api-keys">
                <h1>开发者 API 接入工作台</h1>
              </section>
            )}
          />
          <Route
            path={WEBHOOKS_ROUTE}
            element={(
              <section data-testid="admin-pricing-route-stub-webhooks">
                <h1>{resolveRouteTitle(WEBHOOKS_ROUTE, 'admin')}</h1>
              </section>
            )}
          />
          <Route
            path={DOCS_ROUTE}
            element={(
              <section data-testid="admin-pricing-route-stub-docs">
                <h1>{resolveRouteTitle(DOCS_ROUTE, 'admin')}</h1>
              </section>
            )}
          />
          <Route
            path="/"
            element={(
              <section data-testid="admin-pricing-route-stub-shared-home">
                <h1>控制台总览</h1>
              </section>
            )}
          />
        </Routes>
      </main>
    </MemoryRouter>,
  )
}

describe('AdminProjectsPage', () => {
  beforeEach(() => {
    seedAdminMenu()
    mockedGetAdminProjects.mockResolvedValue({
      items: [
        {
          id: 11,
          key: 'gmail',
          name: 'Gmail 验证码',
          description: '适用于 Gmail 验证类项目',
          default_price: 350,
          success_rate: 0.93,
          timeout_seconds: 180,
          is_active: true,
        },
      ],
    } as any)
    mockedGetAdminProjectOfferings.mockResolvedValue({
      items: [
        {
          id: 88,
          project_id: 11,
          project_key: 'gmail',
          project_name: 'Gmail 验证码',
          domain_id: 9,
          domain_name: 'mail.example.com',
          supplier_id: 3,
          price: 320,
          stock: 24,
          success_rate: 0.91,
          priority: 10,
          source_type: 'hosted_mailbox',
          protocol_mode: 'imap_pull',
        },
      ],
    } as any)
    mockedUpdateAdminProject.mockResolvedValue({} as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })
  })

  it('renders pricing heading, mission-flow CTAs, shared-console bridge CTAs, and capability-matrix surface inside the shared console shell', async () => {
    renderAdminProjectsPage()

    expect(await screen.findByRole('heading', { name: '价格策略' })).toBeInTheDocument()
    const heroCard = screen.getByTestId('admin-pricing-hero-card')
    expect(within(heroCard).getByText('价格策略中枢')).toBeInTheDocument()
    const missionFlow = screen.getByTestId('admin-pricing-mission-flow')
    expect(within(missionFlow).getByRole('button', { name: '查看风控中心' })).toBeInTheDocument()
    expect(within(missionFlow).getByRole('button', { name: '查看审计日志' })).toBeInTheDocument()
    expect(within(missionFlow).getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()
    const bridgeCard = screen.getByRole('region', { name: '共享接入桥接' })
    expect(within(bridgeCard).getByRole('heading', { name: '共享接入桥接' })).toBeInTheDocument()
    expect(bridgeCard).toHaveTextContent('单一登录后')
    expect(bridgeCard).toHaveTextContent('不新增独立后台')
    expect(bridgeCard).not.toHaveTextContent('共享控制台接入桥')
    expect(within(bridgeCard).getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()
    expect(within(bridgeCard).getByRole('heading', { name: 'Webhook 运维与回调观测' })).toBeInTheDocument()
    expect(within(bridgeCard).getByRole('heading', { name: 'API 文档与接入控制台' })).toBeInTheDocument()
    expect(within(bridgeCard).getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()
    expect(within(bridgeCard).getByRole('button', { name: '打开 Webhooks' })).toBeInTheDocument()
    expect(within(bridgeCard).getByRole('button', { name: '查看 API 文档' })).toBeInTheDocument()
    const capabilityMatrix = screen.getByRole('region', { name: '控制台能力矩阵' })
    expect(within(capabilityMatrix).getByRole('heading', { name: '控制台能力矩阵' })).toBeInTheDocument()
    expect(within(capabilityMatrix).getByRole('gridcell', { name: '统一运营入口' })).toBeInTheDocument()
    expect(within(capabilityMatrix).getByRole('gridcell', { name: '共享接入桥接' })).toBeInTheDocument()
    expect(within(capabilityMatrix).getByRole('gridcell', { name: '管理员菜单扩展' })).toBeInTheDocument()
    expect(within(capabilityMatrix).queryByText('角色壳模式')).not.toBeInTheDocument()
    expect(within(capabilityMatrix).queryByText('接入入口')).not.toBeInTheDocument()
    const projectEditorCard = screen.getByTestId('admin-pricing-project-editor-card')
    expect(within(projectEditorCard).getByText('编辑项目 · gmail')).toBeInTheDocument()
    const projectListCard = screen.getByTestId('admin-pricing-project-list-card')
    expect(within(projectListCard).getByText('Gmail 验证码')).toBeInTheDocument()
  })

  it('navigates through risk, audit, and integration mission cards plus shared-console bridge destinations', async () => {
    const user = userEvent.setup()
    let view = renderAdminProjectsPage()

    expect(await screen.findByRole('heading', { name: '价格策略' })).toBeInTheDocument()

    const missionFlow = screen.getByTestId('admin-pricing-mission-flow')
    await user.click(within(missionFlow).getByRole('button', { name: '查看风控中心' }))
    expect(await screen.findByTestId('admin-pricing-route-stub-risk')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '风控中心' })).toBeInTheDocument()

    view.unmount()
    view = renderAdminProjectsPage()
    expect(await screen.findByRole('heading', { name: '价格策略' })).toBeInTheDocument()
    await user.click(within(screen.getByTestId('admin-pricing-mission-flow')).getByRole('button', { name: '查看审计日志' }))
    expect(await screen.findByTestId('admin-pricing-route-stub-audit')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '审计日志' })).toBeInTheDocument()

    view.unmount()
    view = renderAdminProjectsPage()
    expect(await screen.findByRole('heading', { name: '价格策略' })).toBeInTheDocument()
    await user.click(within(screen.getByTestId('admin-pricing-mission-flow')).getByRole('button', { name: '打开 API Keys' }))
    expect(await screen.findByTestId('admin-pricing-route-stub-api-keys')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()

    view.unmount()
    view = renderAdminProjectsPage()
    expect(await screen.findByRole('heading', { name: '价格策略' })).toBeInTheDocument()
    await user.click(within(screen.getByTestId('admin-pricing-shared-console-bridge')).getByRole('button', { name: '打开 Webhooks' }))
    expect(await screen.findByTestId('admin-pricing-route-stub-webhooks')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Webhook 运维与回调观测' })).toBeInTheDocument()

    view.unmount()
    view = renderAdminProjectsPage()
    expect(await screen.findByRole('heading', { name: '价格策略' })).toBeInTheDocument()
    await user.click(within(screen.getByTestId('admin-pricing-shared-console-bridge')).getByRole('button', { name: '查看 API 文档' }))
    expect(await screen.findByTestId('admin-pricing-route-stub-docs')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'API 文档与接入控制台' })).toBeInTheDocument()
    view.unmount()
  })

  it('submits project updates through the real admin service contract', async () => {
    const user = userEvent.setup()
    renderAdminProjectsPage()

    expect(await screen.findByText('编辑项目 · gmail')).toBeInTheDocument()

    const nameInput = screen.getByLabelText('项目名称')
    await user.clear(nameInput)
    await user.type(nameInput, 'Gmail 国际验证码')

    const descriptionInput = screen.getByLabelText('项目描述')
    await user.clear(descriptionInput)
    await user.type(descriptionInput, '管理端更新后的项目描述')

    const priceInput = screen.getByLabelText('默认价格（分）')
    await user.clear(priceInput)
    await user.type(priceInput, '420')

    const successRateInput = screen.getByLabelText('成功率')
    await user.clear(successRateInput)
    await user.type(successRateInput, '0.95')

    const timeoutInput = screen.getByLabelText('超时时间（秒）')
    await user.clear(timeoutInput)
    await user.type(timeoutInput, '240')

    await user.click(screen.getByRole('button', { name: '保存配置' }))

    await waitFor(() => expect(mockedUpdateAdminProject).toHaveBeenCalled())
    expect(mockedUpdateAdminProject).toHaveBeenLastCalledWith(11, {
      name: 'Gmail 国际验证码',
      description: '管理端更新后的项目描述',
      default_price: 420,
      success_rate: 0.95,
      timeout_seconds: 240,
      is_active: false,
    })
  })

  it('keeps only the fallback CTA when admin pricing is isolated from risk/audit/integration entries', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 3, email: 'admin@nexus-mail.local', role: 'admin' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: DASHBOARD_ROUTE },
        { key: 'admin-pricing', label: '价格策略', path: ADMIN_PRICING_ROUTE },
      ],
    })

    renderAdminProjectsPage()

    expect(await screen.findByRole('heading', { name: '价格策略' })).toBeInTheDocument()
    expect(screen.queryByTestId('admin-pricing-mission-flow')).not.toBeInTheDocument()
    const mainContent = screen.getByRole('main', { name: '控制台主内容' })
    expect(within(mainContent).queryByRole('button', { name: '查看风控中心' })).not.toBeInTheDocument()
    expect(within(mainContent).queryByRole('button', { name: '查看审计日志' })).not.toBeInTheDocument()
    expect(within(mainContent).queryByRole('button', { name: '打开 API Keys' })).not.toBeInTheDocument()

    const capabilityMatrix = screen.getByTestId('admin-pricing-capability-matrix')
    expect(within(capabilityMatrix).getByText('等待共享接入桥接能力')).toBeInTheDocument()
    expect(within(capabilityMatrix).getByText('等待管理员菜单扩展能力')).toBeInTheDocument()
    expect(within(capabilityMatrix).queryByText('API Keys / Webhooks / Docs 与管理员价格策略保持同壳联动')).not.toBeInTheDocument()

    const fallbackButton = screen.getByRole('button', { name: '返回共享工作台' })
    expect(fallbackButton).toBeInTheDocument()

    await user.click(fallbackButton)
    expect(await screen.findByTestId('admin-pricing-route-stub-shared-home')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '控制台总览' })).toBeInTheDocument()
  })

  it('keeps the capability matrix honest when only API Keys bridge and risk menu remain visible', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 3, email: 'admin@nexus-mail.local', role: 'admin' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: DASHBOARD_ROUTE },
        { key: 'admin-pricing', label: '价格策略', path: ADMIN_PRICING_ROUTE },
        { key: 'admin-risk', label: '风控中心', path: ADMIN_RISK_ROUTE },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
      ],
    })

    renderAdminProjectsPage()

    expect(await screen.findByRole('heading', { name: '价格策略' })).toBeInTheDocument()
    const capabilityMatrix = screen.getByTestId('admin-pricing-capability-matrix')
    expect(within(capabilityMatrix).getByText('API Keys 已与管理员价格策略保持同壳联动，其余接入入口等待菜单开放')).toBeInTheDocument()
    expect(within(capabilityMatrix).getByText('等待管理员菜单扩展能力')).toBeInTheDocument()
    expect(within(capabilityMatrix).queryByText('API Keys / Webhooks / Docs 与管理员价格策略保持同壳联动')).not.toBeInTheDocument()
  })
})
