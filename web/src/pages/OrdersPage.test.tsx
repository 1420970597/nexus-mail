import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { OrdersPage } from './OrdersPage'
import * as activationService from '../services/activation'
import { useAuthStore } from '../store/authStore'

vi.mock('../services/activation', () => ({
  getActivationOrders: vi.fn(),
  getActivationResult: vi.fn(),
  finishActivationOrder: vi.fn(),
  cancelActivationOrder: vi.fn(),
}))

const mockedGetActivationOrders = vi.mocked(activationService.getActivationOrders)
const mockedGetActivationResult = vi.mocked(activationService.getActivationResult)
const mockedFinishActivationOrder = vi.mocked(activationService.finishActivationOrder)
const mockedCancelActivationOrder = vi.mocked(activationService.cancelActivationOrder)

describe('OrdersPage', () => {
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
      ],
    })
    mockedGetActivationOrders.mockResolvedValue({
      items: [
        {
          id: 1,
          order_no: 'ORD-1',
          project_key: 'discord',
          project_name: 'Discord',
          domain_name: 'mail.discord.example',
          email_address: 'bot@mail.discord.example',
          status: 'READY',
          quoted_price: 1200,
          final_price: 1200,
          extraction_type: 'code',
          extraction_value: '123456',
          created_at: '2026-04-29T00:00:00Z',
          updated_at: '2026-04-29T00:01:00Z',
          expires_at: '2026-04-29T00:05:00Z',
        },
      ],
    })
    mockedGetActivationResult.mockResolvedValue({
      result: {
        status: 'READY',
        extraction_type: 'code',
        extraction_value: '123456',
        is_terminal: false,
        expires_in_seconds: 120,
        next_poll_after_seconds: 15,
      },
    })
    mockedFinishActivationOrder.mockResolvedValue({
      order: {
        id: 1,
        order_no: 'ORD-1',
        project_key: 'discord',
        project_name: 'Discord',
        domain_name: 'mail.discord.example',
        email_address: 'bot@mail.discord.example',
        status: 'FINISHED',
        quoted_price: 1200,
        final_price: 1200,
        extraction_type: 'code',
        extraction_value: '123456',
        created_at: '2026-04-29T00:00:00Z',
        updated_at: '2026-04-29T00:01:30Z',
        expires_at: '2026-04-29T00:05:00Z',
      },
    })
    mockedCancelActivationOrder.mockResolvedValue({
      order: {
        id: 1,
        order_no: 'ORD-1',
        project_key: 'discord',
        project_name: 'Discord',
        domain_name: 'mail.discord.example',
        email_address: 'bot@mail.discord.example',
        status: 'CANCELED',
        quoted_price: 1200,
        final_price: 0,
        extraction_type: 'code',
        extraction_value: '123456',
        created_at: '2026-04-29T00:00:00Z',
        updated_at: '2026-04-29T00:01:30Z',
        expires_at: '2026-04-29T00:05:00Z',
      },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })
  })

  it('renders the unified order workbench with real-order messaging', async () => {
    render(
      <MemoryRouter>
        <OrdersPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('统一订单工作台')).toBeInTheDocument()
    expect(screen.getByText('待收信')).toBeInTheDocument()
    expect(screen.getByText('READY / FINISHED / TIMEOUT 全部来自真实 API 返回')).toBeInTheDocument()
  })

  it('shows shared-console next actions when the order list is empty', async () => {
    mockedGetActivationOrders.mockResolvedValueOnce({ items: [] })

    render(
      <MemoryRouter>
        <OrdersPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('当前暂无订单，可先前往项目市场下单。')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '前往项目市场' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '查看 API 接入准备' })).toBeInTheDocument()
  })

  it('opens result modal for an existing order', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <OrdersPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('ORD-1')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '查看结果' }))

    expect(await screen.findByText('订单结果 · ORD-1')).toBeInTheDocument()
    expect(screen.getAllByText('123456').length).toBeGreaterThan(0)
  })
})
