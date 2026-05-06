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
          <Route path={ADMIN_RISK_ROUTE} element={<div>风控中心页面</div>} />
          <Route path={ADMIN_AUDIT_ROUTE} element={<div>审计日志页面</div>} />
          <Route path={API_KEYS_ROUTE} element={<div>API Keys 页面</div>} />
          <Route path={WEBHOOKS_ROUTE} element={<div>Webhook 设置页面</div>} />
          <Route path={DOCS_ROUTE} element={<div>API 文档页面</div>} />
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

  it('renders pricing heading, mission-flow CTAs, and capability-matrix surface inside the shared console shell', async () => {
    renderAdminProjectsPage()

    expect(await screen.findByRole('heading', { name: '价格策略' })).toBeInTheDocument()
    const heroCard = screen.getByTestId('admin-pricing-hero-card')
    expect(within(heroCard).getByText('价格策略中枢')).toBeInTheDocument()
    const missionFlow = screen.getByTestId('admin-pricing-mission-flow')
    expect(within(missionFlow).getByRole('button', { name: '查看风控中心' })).toBeInTheDocument()
    expect(within(missionFlow).getByRole('button', { name: '查看审计日志' })).toBeInTheDocument()
    expect(within(missionFlow).getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()
    expect(screen.getByText('控制台能力矩阵')).toBeInTheDocument()
    expect(screen.getByText('编辑项目 · gmail')).toBeInTheDocument()
    expect(screen.getAllByText('Gmail 验证码').length).toBeGreaterThan(0)
  })

  it('navigates through risk, audit, and integration mission cards inside the shared console', async () => {
    const user = userEvent.setup()
    let view = renderAdminProjectsPage()

    expect(await screen.findByRole('heading', { name: '价格策略' })).toBeInTheDocument()

    const missionFlow = screen.getByTestId('admin-pricing-mission-flow')
    await user.click(within(missionFlow).getByRole('button', { name: '查看风控中心' }))
    expect(await screen.findByText('风控中心页面')).toBeInTheDocument()

    view.unmount()
    view = renderAdminProjectsPage()
    expect(await screen.findByRole('heading', { name: '价格策略' })).toBeInTheDocument()
    await user.click(within(screen.getByTestId('admin-pricing-mission-flow')).getByRole('button', { name: '查看审计日志' }))
    expect(await screen.findByText('审计日志页面')).toBeInTheDocument()

    view.unmount()
    view = renderAdminProjectsPage()
    expect(await screen.findByRole('heading', { name: '价格策略' })).toBeInTheDocument()
    await user.click(within(screen.getByTestId('admin-pricing-mission-flow')).getByRole('button', { name: '打开 API Keys' }))
    expect(await screen.findByText('API Keys 页面')).toBeInTheDocument()
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

    const fallbackButton = screen.getByTestId('admin-pricing-fallback-button')
    expect(fallbackButton).toBeInTheDocument()

    await user.click(fallbackButton)
    expect(await screen.findByTestId('admin-pricing-route-stub-shared-home')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '控制台总览' })).toBeInTheDocument()
  })
})
