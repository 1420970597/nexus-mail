import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { OrdersPage } from './OrdersPage'
import * as activationService from '../services/activation'

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
    mockedGetActivationOrders.mockResolvedValue({
      items: [
        {
          id: 1,
          order_no: 'ORD-1',
          project_key: 'discord',
          project_name: 'Discord',
          domain_name: 'mail.discord.example',
          email_address: 'user-1@mail.discord.example',
          status: 'READY',
          quoted_price: 1200,
          final_price: 1200,
          extraction_type: 'code',
          extraction_value: '123456',
          created_at: '2026-04-29T00:00:00Z',
          updated_at: '2026-04-29T00:00:00Z',
          expires_at: '2026-04-29T00:05:00Z',
        },
        {
          id: 2,
          order_no: 'ORD-2',
          project_key: 'telegram',
          project_name: 'Telegram',
          domain_name: 'mail.telegram.example',
          email_address: 'user-2@mail.telegram.example',
          status: 'WAITING_EMAIL',
          quoted_price: 1500,
          final_price: 0,
          extraction_type: '',
          extraction_value: '',
          created_at: '2026-04-29T00:00:00Z',
          updated_at: '2026-04-29T00:00:00Z',
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
        next_poll_after_seconds: 5,
      },
    })
    mockedFinishActivationOrder.mockResolvedValue({ order: {} as any })
    mockedCancelActivationOrder.mockResolvedValue({ order: {} as any })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders shared order-workbench metrics and guidance', async () => {
    render(
      <MemoryRouter>
        <OrdersPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('统一订单工作台')).toBeInTheDocument()
    expect(screen.getByText('待收信')).toBeInTheDocument()
    expect(screen.getByText('待完成')).toBeInTheDocument()
    expect(screen.getByText('已完成')).toBeInTheDocument()
    expect(screen.getByText('最近邮箱')).toBeInTheDocument()
  })

  it('opens result modal and finishes ready orders only', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <OrdersPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('ORD-1')).toBeInTheDocument()

    const finishButtons = screen.getAllByRole('button', { name: '完成订单' })
    expect(finishButtons[0]).toBeEnabled()
    expect(finishButtons[1]).toBeDisabled()

    await user.click(screen.getAllByRole('button', { name: '查看结果' })[0])
    await waitFor(() => expect(mockedGetActivationResult).toHaveBeenCalledWith(1))
    expect(await screen.findAllByText('123456')).toHaveLength(2)

    const actionableFinishButton = screen.getAllByRole('button', { name: '完成订单' }).find((button) => !button.hasAttribute('disabled'))
    expect(actionableFinishButton).toBeDefined()
    await user.click(actionableFinishButton!)
    await waitFor(() => expect(mockedFinishActivationOrder).toHaveBeenCalledWith(1))
    expect(mockedGetActivationOrders).toHaveBeenCalledTimes(2)
  })
})
