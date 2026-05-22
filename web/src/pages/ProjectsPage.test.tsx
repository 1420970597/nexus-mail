import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProjectsPage } from './ProjectsPage'
import * as activationService from '../services/activation'
import { useAuthStore } from '../store/authStore'

vi.mock('../services/activation', () => ({
  getInventory: vi.fn(),
  createActivationOrder: vi.fn(),
}))

const mockedGetInventory = vi.mocked(activationService.getInventory)
const mockedCreateActivationOrder = vi.mocked(activationService.createActivationOrder)

describe('ProjectsPage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 1, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'projects', label: '项目市场', path: '/projects' },
        { key: 'orders', label: '订单中心', path: '/orders' },
        { key: 'api-keys', label: 'API Keys', path: '/api-keys' },
        { key: 'docs', label: 'API 文档', path: '/docs' },
      ],
    })
    mockedGetInventory.mockResolvedValue({
      items: [
        {
          id: 1,
          project_id: 11,
          project_key: 'discord',
          project_name: 'Discord',
          domain_id: 21,
          domain_name: 'mail.discord.example',
          supplier_id: 9,
          price: 1200,
          stock: 35,
          success_rate: 0.92,
          priority: 10,
          source_type: 'hosted_mailbox',
          protocol_mode: 'imap_pull',
        },
        {
          id: 2,
          project_id: 12,
          project_key: 'telegram',
          project_name: 'Telegram',
          domain_id: 22,
          domain_name: 'mail.telegram.example',
          supplier_id: 10,
          price: 1500,
          stock: 0,
          success_rate: 0.81,
          priority: 20,
          source_type: 'public_mailbox_account',
          protocol_mode: 'smtp_inbound',
        },
      ],
    })
    mockedCreateActivationOrder.mockResolvedValue({
      order: {
        id: 99,
        order_no: 'ORD-99',
        project_key: 'discord',
        project_name: 'Discord',
        domain_name: 'mail.discord.example',
        email_address: 'bot@mail.discord.example',
        status: 'WAITING_EMAIL',
        quoted_price: 1200,
        final_price: 0,
        extraction_type: '',
        extraction_value: '',
        created_at: '2026-04-29T00:00:00Z',
        updated_at: '2026-04-29T00:00:00Z',
        expires_at: '2026-04-29T00:05:00Z',
      },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })
  })

  it('renders a procurement shared-console slice shell with a named hero region', async () => {
    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>,
    )

    const heroCard = await screen.findByRole('region', { name: '项目市场' })
    const heroScope = within(heroCard)
    expect(heroScope.getByRole('heading', { name: '项目市场' })).toBeInTheDocument()
    expect(heroScope.getByText('采购路径信号')).toBeInTheDocument()
    expect(heroScope.getByText('单一登录后控制台 · 用户采购工作台')).toBeInTheDocument()
  })

  it('renders shared-console hero and aggregated procurement metrics', async () => {
    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: '项目市场' })).toBeInTheDocument()
    expect(screen.getByText('可售项目')).toBeInTheDocument()
    expect(screen.getByText('可立即下单')).toBeInTheDocument()
    expect(screen.getByText('最高成功率')).toBeInTheDocument()
    expect(screen.getByText('单一登录后控制台 · 用户采购工作台')).toBeInTheDocument()
  })

  it('creates order from stocked inventory and keeps zero-stock rows disabled', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Discord')).toBeInTheDocument()

    expect(screen.getByRole('button', { name: '立即下单' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '库存不足' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: '立即下单' }))

    await screen.findByText('项目市场')
    expect(mockedCreateActivationOrder).toHaveBeenCalledWith('discord', 21)
    expect(mockedGetInventory).toHaveBeenCalledTimes(2)
  })

  it('shows empty-state next actions inside the same shared console', async () => {
    mockedGetInventory.mockResolvedValueOnce({ items: [] })

    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('当前暂无可售库存，请稍后再试或联系管理员补充供给。')).toBeInTheDocument()
    const emptyActions = await screen.findByTestId('projects-empty-state-actions')
    expect(within(emptyActions).getByRole('button', { name: '重新拉取库存' })).toBeInTheDocument()
    expect(within(emptyActions).getByRole('button', { name: '查看 API 文档' })).toBeInTheDocument()
  })

  it('renders procurement mission guidance through named shared-console regions instead of test-id-only cards', async () => {
    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>,
    )

    const missionFlow = await screen.findByRole('region', { name: '采购任务流' })
    const missionScope = within(missionFlow)
    expect(missionScope.getByRole('heading', { name: '采购任务流' })).toBeInTheDocument()
    expect(missionScope.queryByText('采购动作提示')).not.toBeInTheDocument()

    const procurementCard = within(missionFlow).getByRole('region', { name: '先挑库存，再下单' })
    const nextStepCard = within(missionFlow).getByRole('region', { name: '下单后下一步' })
    const fallbackCard = within(missionFlow).getByRole('region', { name: '共享控制台回退路径' })

    expect(within(procurementCard).getByRole('heading', { name: '先挑库存，再下单' })).toBeInTheDocument()
    expect(within(nextStepCard).getByRole('heading', { name: '下单后下一步' })).toBeInTheDocument()
    expect(within(nextStepCard).getByRole('button', { name: '打开订单中心' })).toBeInTheDocument()
    expect(within(fallbackCard).getByRole('heading', { name: '共享控制台回退路径' })).toBeInTheDocument()
  })

  it('navigates from market procurement guidance into the order center inside the shared console', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/projects']}>
        <Routes>
          <Route path="/projects" element={<ProjectsPage />} />
          <Route
            path="/orders"
            element={
              <section data-testid="projects-route-stub-orders" role="region" aria-label="共享控制台 - 订单中心">
                <h1>订单中心</h1>
              </section>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    const missionFlow = await screen.findByRole('region', { name: '采购任务流' })
    await user.click(within(missionFlow).getByRole('button', { name: '打开订单中心' }))
    const ordersRegion = await screen.findByRole('region', { name: '共享控制台 - 订单中心' })
    expect(within(ordersRegion).getByRole('heading', { name: '订单中心' })).toBeInTheDocument()
  })

  it('shows a scoped shared-console docs bridge signal in the hero so newly registered users can continue API onboarding from the market view', async () => {
    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: '项目市场' })).toBeInTheDocument()
    const heroCard = screen.getByTestId('projects-shared-console-hero')
    expect(heroCard).toHaveTextContent('继续前往开发者 API 接入工作台：文档与密钥配置仍留在同一控制台')
    expect(within(heroCard).getByText('采购路径信号')).toBeInTheDocument()
  })

  it('hides the docs continuation CTA from the procurement hero when the server menu does not expose docs access', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 1, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'projects', label: '项目市场', path: '/projects' },
        { key: 'orders', label: '订单中心', path: '/orders' },
      ],
    })

    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: '项目市场' })).toBeInTheDocument()
    const heroCard = screen.getByTestId('projects-shared-console-hero')
    expect(within(heroCard).queryByRole('button', { name: '查看 API 文档' })).not.toBeInTheDocument()
  })

  it('renders a named first-run procurement region so newly registered users keep budget, fulfillment, and API onboarding inside the same shared console lane', async () => {
    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: '项目市场' })).toBeInTheDocument()
    const lane = screen.getByRole('region', { name: '采购 → 履约 → 接入' })
    const scoped = within(lane)
    expect(scoped.getByRole('heading', { name: '采购 → 履约 → 接入' })).toBeInTheDocument()
    expect(scoped.getByText('注册后首轮采购路径')).toBeInTheDocument()
    expect(scoped.getByText('先确认真实库存与价格，再创建第一笔订单。订单结果与开发者 API 接入工作台都继续留在同一控制台。')).toBeInTheDocument()
    expect(scoped.getByRole('button', { name: /打开订单中心/ })).toBeInTheDocument()
    expect(scoped.getByRole('button', { name: /打开 API Keys/ })).toBeInTheDocument()
    expect(scoped.queryByText('注册后进入共享控制台，再按当前菜单继续选择首轮接入动作。')).not.toBeInTheDocument()
    expect(scoped.queryByRole('heading', { name: '订单结果 → API 接入 → 再次采购' })).not.toBeInTheDocument()
  })

  it('renders a mission-control next-step lane for procurement, fulfillment, and integration', async () => {
    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>,
    )

    const lane = await screen.findByRole('region', { name: '采购 → 履约 → 接入' })
    const scoped = within(lane)
    expect(scoped.getByText('注册后首轮采购路径')).toBeInTheDocument()
    expect(scoped.getByRole('heading', { name: '采购 → 履约 → 接入' })).toBeInTheDocument()
    expect(scoped.getByText('先确认真实库存与价格，再创建第一笔订单。订单结果与开发者 API 接入工作台都继续留在同一控制台。')).toBeInTheDocument()
    expect(scoped.getByRole('button', { name: /打开 API Keys/ })).toBeInTheDocument()
  })

  it('renders a darker shared-console bridge and capability matrix for the procurement slice', async () => {
    const user = userEvent.setup()

    const renderWithRoutes = () => render(
      <MemoryRouter initialEntries={['/projects']}>
        <Routes>
          <Route path="/projects" element={<ProjectsPage />} />
          <Route
            path="/orders"
            element={
              <section data-testid="projects-route-stub-orders-bridge" role="region" aria-label="共享控制台 - 订单中心">
                <h1>订单中心</h1>
              </section>
            }
          />
          <Route
            path="/api-keys"
            element={
              <section data-testid="projects-route-stub-api-keys-bridge" role="region" aria-label="共享控制台 - API Keys">
                <h1>开发者 API 接入工作台</h1>
              </section>
            }
          />
          <Route
            path="/docs"
            element={
              <section data-testid="projects-route-stub-docs-bridge" role="region" aria-label="共享控制台 - API 文档">
                <h1>API 文档与接入控制台</h1>
              </section>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    let view = renderWithRoutes()

    expect(await screen.findByRole('heading', { name: '项目市场' })).toBeInTheDocument()
    const bridge = screen.getByRole('region', { name: '共享接入桥接' })
    expect(bridge).toHaveTextContent('项目市场 → 订单中心 → 开发者 API 接入工作台 → API 文档与接入控制台')
    expect(bridge).toHaveTextContent('项目采购、履约追踪与开发接入继续留在同一深色共享控制台，不拆第二套后台。')
    expect(bridge).not.toHaveTextContent('项目采购页不是孤立列表：确认库存后，可继续回到订单中心查看履约，再进入开发者 API 接入工作台与 API 文档完成自动化接入闭环。')
    expect(within(bridge).getByRole('heading', { name: '共享接入桥接' })).toBeInTheDocument()

    const matrix = screen.getByRole('region', { name: '控制台能力矩阵' })
    const matrixScope = within(matrix)
    expect(matrixScope.getByRole('heading', { name: '控制台能力矩阵' })).toBeInTheDocument()
    expect(matrixScope.getByText('统一采购入口')).toBeInTheDocument()
    expect(matrixScope.getByText('共享接入桥接')).toBeInTheDocument()
    expect(matrixScope.getByText('单壳接入延伸')).toBeInTheDocument()
    expect(matrixScope.queryByText('共享履约桥接')).not.toBeInTheDocument()
    expect(matrixScope.queryByText('开发接入延伸')).not.toBeInTheDocument()

    await user.click(within(bridge).getByRole('button', { name: '打开订单中心' }))
    let destinationRegion = await screen.findByRole('region', { name: '共享控制台 - 订单中心' })
    expect(within(destinationRegion).getByRole('heading', { name: '订单中心' })).toBeInTheDocument()

    view.unmount()
    view = renderWithRoutes()

    expect(await screen.findByRole('heading', { name: '项目市场' })).toBeInTheDocument()
    await user.click(within(screen.getByRole('region', { name: '共享接入桥接' })).getByRole('button', { name: '打开 API Keys' }))
    destinationRegion = await screen.findByRole('region', { name: '共享控制台 - API Keys' })
    expect(within(destinationRegion).getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()

    view.unmount()
    view = renderWithRoutes()

    expect(await screen.findByRole('heading', { name: '项目市场' })).toBeInTheDocument()
    await user.click(within(screen.getByRole('region', { name: '共享接入桥接' })).getByRole('button', { name: '查看 API 文档' }))
    destinationRegion = await screen.findByRole('region', { name: '共享控制台 - API 文档' })
    expect(within(destinationRegion).getByRole('heading', { name: 'API 文档与接入控制台' })).toBeInTheDocument()

    view.unmount()
  })

  it('renders honest partial bridge descriptions when only some shared-console destinations are exposed', async () => {
    const renderForMenu = (menu: Array<{ key: string; label: string; path: string }>) => {
      useAuthStore.setState({
        token: 'token',
        refreshToken: 'refresh-token',
        user: { id: 1, email: 'user@nexus-mail.local', role: 'user' },
        menu,
      })

      return render(
        <MemoryRouter>
          <ProjectsPage />
        </MemoryRouter>,
      )
    }

    let view = renderForMenu([
      { key: 'dashboard', label: '仪表盘', path: '/' },
      { key: 'projects', label: '项目市场', path: '/projects' },
      { key: 'orders', label: '订单中心', path: '/orders' },
      { key: 'api-keys', label: 'API Keys', path: '/api-keys' },
    ])

    expect(await screen.findByRole('heading', { name: '项目市场' })).toBeInTheDocument()
    let bridge = screen.getByRole('region', { name: '共享接入桥接' })
    expect(bridge).toHaveTextContent('项目市场 → 订单中心 → 开发者 API 接入工作台')
    expect(bridge).toHaveTextContent('项目采购、履约追踪与开发接入继续留在同一深色共享控制台，当前先开放订单中心与 API Keys。')
    expect(bridge).not.toHaveTextContent('API 文档与接入控制台')
    expect(within(bridge).getByRole('button', { name: '打开订单中心' })).toBeInTheDocument()
    expect(within(bridge).getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()
    expect(within(bridge).queryByRole('button', { name: '查看 API 文档' })).not.toBeInTheDocument()

    view.unmount()
    view = renderForMenu([
      { key: 'dashboard', label: '仪表盘', path: '/' },
      { key: 'projects', label: '项目市场', path: '/projects' },
      { key: 'orders', label: '订单中心', path: '/orders' },
    ])

    expect(await screen.findByRole('heading', { name: '项目市场' })).toBeInTheDocument()
    bridge = screen.getByRole('region', { name: '共享接入桥接' })
    expect(bridge).toHaveTextContent('项目市场 → 订单中心')
    expect(bridge).toHaveTextContent('项目采购与履约追踪继续留在同一深色共享控制台，当前先沿订单中心推进下一步。')
    expect(bridge).not.toHaveTextContent('开发者 API 接入工作台')
    expect(within(bridge).getByRole('button', { name: '打开订单中心' })).toBeInTheDocument()
    expect(within(bridge).queryByRole('button', { name: '打开 API Keys' })).not.toBeInTheDocument()

    view.unmount()
    view = renderForMenu([
      { key: 'dashboard', label: '仪表盘', path: '/' },
      { key: 'projects', label: '项目市场', path: '/projects' },
      { key: 'api-keys', label: 'API Keys', path: '/api-keys' },
    ])

    expect(await screen.findByRole('heading', { name: '项目市场' })).toBeInTheDocument()
    bridge = screen.getByRole('region', { name: '共享接入桥接' })
    expect(bridge).toHaveTextContent('项目市场 → 开发者 API 接入工作台')
    expect(bridge).toHaveTextContent('项目采购与开发接入继续留在同一深色共享控制台，当前可直接前往 API Keys。')
    expect(bridge).not.toHaveTextContent('订单中心')
    expect(within(bridge).getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()
    expect(within(bridge).queryByRole('button', { name: '打开订单中心' })).not.toBeInTheDocument()

    view.unmount()
  })

  it('hides procurement bridge destinations that are not exposed by the server menu', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 1, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'projects', label: '项目市场', path: '/projects' },
      ],
    })

    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: '项目市场' })).toBeInTheDocument()
    const bridge = screen.getByRole('region', { name: '共享接入桥接' })
    expect(bridge).toHaveTextContent('项目市场')
    expect(bridge).toHaveTextContent('项目采购继续留在当前深色共享控制台，等待服务端后续开放更多共享入口。')
    expect(bridge).not.toHaveTextContent('订单中心')
    expect(bridge).not.toHaveTextContent('开发者 API 接入工作台')
    expect(bridge).not.toHaveTextContent('API 文档与接入控制台')
    expect(within(bridge).queryByRole('button', { name: '打开订单中心' })).not.toBeInTheDocument()
    expect(within(bridge).queryByRole('button', { name: '打开 API Keys' })).not.toBeInTheDocument()
    expect(within(bridge).queryByRole('button', { name: '查看 API 文档' })).not.toBeInTheDocument()
  })

  it('navigates from the procurement lane into the api keys workspace inside the shared console', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/projects']}>
        <Routes>
          <Route path="/projects" element={<ProjectsPage />} />
          <Route
            path="/api-keys"
            element={
              <section data-testid="projects-route-stub-api-keys" role="region" aria-label="共享控制台 - API Keys">
                <h1>开发者 API 接入工作台</h1>
              </section>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('注册后首轮采购路径')).toBeInTheDocument()
    const lane = screen.getByRole('region', { name: '采购 → 履约 → 接入' })
    await user.click(within(lane).getByRole('button', { name: /打开 API Keys/ }))
    const destinationRegion = await screen.findByRole('region', { name: '共享控制台 - API Keys' })
    expect(within(destinationRegion).getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()
  })

  it('shows a return-to-recommended-workspace CTA in the empty state when the user lands here from another preferred workspace', async () => {
    const user = userEvent.setup()
    mockedGetInventory.mockResolvedValueOnce({ items: [] })
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 1, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'projects', label: '项目市场', path: '/projects' },
      ],
    })

    render(
      <MemoryRouter initialEntries={['/projects']}>
        <Routes>
          <Route path="/projects" element={<ProjectsPage />} />
          <Route
            path="/"
            element={
              <section data-testid="projects-route-stub-shared-home" role="region" aria-label="共享控制台首页">
                <h1>控制台总览</h1>
              </section>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('当前暂无可售库存，请稍后再试或联系管理员补充供给。')).toBeInTheDocument()
    const emptyActions = await screen.findByTestId('projects-empty-state-actions')
    await user.click(within(emptyActions).getByRole('button', { name: '返回共享工作台' }))
    const homeRegion = await screen.findByRole('region', { name: '共享控制台首页' })
    expect(within(homeRegion).getByRole('heading', { name: '控制台总览' })).toBeInTheDocument()
  })
})
