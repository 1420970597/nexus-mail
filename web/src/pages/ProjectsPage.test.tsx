import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ProjectsPage } from './ProjectsPage'
import * as activationService from '../services/activation'

vi.mock('../services/activation', () => ({
  getInventory: vi.fn(),
  createActivationOrder: vi.fn(),
}))

const mockedGetInventory = vi.mocked(activationService.getInventory)
const mockedCreateActivationOrder = vi.mocked(activationService.createActivationOrder)

describe('ProjectsPage', () => {
  beforeEach(() => {
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
  })

  it('renders shared-console hero and aggregated procurement metrics', async () => {
    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('用户采购入口')).toBeInTheDocument()
    expect(screen.getByText('可售项目')).toBeInTheDocument()
    expect(screen.getByText('可立即下单')).toBeInTheDocument()
    expect(screen.getByText('最高成功率')).toBeInTheDocument()
    expect(screen.getByText('单一登录后控制台 · 用户工作台')).toBeInTheDocument()
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

    await waitFor(() => expect(mockedCreateActivationOrder).toHaveBeenCalledWith('discord', 21))
    expect(mockedGetInventory).toHaveBeenCalledTimes(2)
  })
})
