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

  it('renders a procurement shared-console slice shell', async () => {
    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('共享控制台采购切片')).toBeInTheDocument()
    expect(screen.getByText('项目市场')).toBeInTheDocument()
    expect(screen.getByText('让注册后的首轮采购、订单回流与 API 接入准备都保持在同一套深色共享控制台里继续完成。')).toBeInTheDocument()
    expect(screen.getByText('采购路径信号')).toBeInTheDocument()
  })

  it('renders shared-console hero and aggregated procurement metrics', async () => {
    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('共享控制台采购切片')).toBeInTheDocument()
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

    const orderButtons = screen.getAllByRole('button', { name: /立即下单|库存不足/ })
    expect(orderButtons[0]).toBeEnabled()
    expect(orderButtons[1]).toBeDisabled()

    await user.click(orderButtons[0])

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
    expect(screen.getByRole('button', { name: '重新拉取库存' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '查看 API 文档' })).toBeInTheDocument()
  })

  it('renders procurement mission guidance that keeps first-run purchasing inside the shared console', async () => {
    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('采购动作提示')).toBeInTheDocument()
    expect(screen.getByText('先挑库存，再下单')).toBeInTheDocument()
    expect(screen.getByText('下单后下一步')).toBeInTheDocument()
    expect(screen.getByText('共享控制台回退路径')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '打开订单中心' })).toBeInTheDocument()
  })

  it('navigates from market procurement guidance into the order center inside the shared console', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/projects']}>
        <Routes>
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/orders" element={<div>订单中心页面</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('采购动作提示')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '打开订单中心' }))
    expect(await screen.findByText('订单中心页面')).toBeInTheDocument()
  })

  it('shows an integration CTA in the hero so newly registered users can continue API onboarding from the market view', async () => {
    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('共享控制台采购切片')).toBeInTheDocument()
    expect(screen.getByText('继续 API 接入准备：文档与密钥配置仍留在同一控制台')).toBeInTheDocument()
  })

  it('hides the docs continuation CTA when the server menu does not expose docs access', async () => {
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

    expect(await screen.findByText('共享控制台采购切片')).toBeInTheDocument()
    expect(screen.queryByText('继续 API 接入准备：文档与密钥配置仍留在同一控制台')).not.toBeInTheDocument()
  })

  it('renders a mission-control next-step lane for procurement, fulfillment, and integration', async () => {
    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('注册后首轮采购路径')).toBeInTheDocument()
    const lane = screen.getByText('注册后首轮采购路径').closest('.semi-card')
    expect(lane).not.toBeNull()
    const scoped = within(lane as HTMLElement)
    expect(scoped.getByText('采购 → 履约 → 接入')).toBeInTheDocument()
    expect(scoped.getByText('先确认真实库存与价格，再创建第一笔订单。订单结果与 API 接入准备都继续留在同一控制台。')).toBeInTheDocument()
    expect(scoped.getByRole('button', { name: /打开 API Keys/ })).toBeInTheDocument()
  })

  it('navigates from the procurement lane into the api keys workspace inside the shared console', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/projects']}>
        <Routes>
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/api-keys" element={<div>开发者 API 接入工作台</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('注册后首轮采购路径')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /打开 API Keys/ }))
    expect(await screen.findByText('开发者 API 接入工作台')).toBeInTheDocument()
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
          <Route path="/" element={<div>控制台总览页面</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('当前暂无可售库存，请稍后再试或联系管理员补充供给。')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: '返回推荐工作台' })[0])
    expect(await screen.findByText('控制台总览页面')).toBeInTheDocument()
  })
})
