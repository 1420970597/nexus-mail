import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { BalancePage } from './BalancePage'
import * as financeService from '../services/finance'

vi.mock('../services/finance', () => ({
  getWalletOverview: vi.fn(),
  getWalletTransactions: vi.fn(),
  topupWallet: vi.fn(),
  createUserOrderDispute: vi.fn(),
}))

const mockedGetWalletOverview = vi.mocked(financeService.getWalletOverview)
const mockedGetWalletTransactions = vi.mocked(financeService.getWalletTransactions)
const mockedTopupWallet = vi.mocked(financeService.topupWallet)
const mockedCreateUserOrderDispute = vi.mocked(financeService.createUserOrderDispute)

describe('BalancePage', () => {
  beforeEach(() => {
    mockedGetWalletOverview.mockResolvedValue({
      wallet: {
        user_id: 7,
        email: 'user@nexus-mail.local',
        available_balance: 12500,
        frozen_balance: 3200,
        pending_settlement: 1800,
      },
    } as any)
    mockedGetWalletTransactions.mockResolvedValue({
      items: [
        {
          id: 1,
          type: 'topup',
          direction: 'credit',
          balance_type: 'available',
          amount: 1200,
          order_id: 0,
          note: 'manual topup',
        },
      ],
    } as any)
    mockedTopupWallet.mockResolvedValue({} as any)
    mockedCreateUserOrderDispute.mockResolvedValue({
      dispute: {
        id: 9,
        order_id: 123,
        status: 'open',
        reason: '验证码错误',
      },
    } as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders wallet workbench metrics and guidance', async () => {
    render(
      <MemoryRouter>
        <BalancePage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('余额与争议工作台')).toBeInTheDocument()
    expect(screen.getByText('可用余额')).toBeInTheDocument()
    expect(screen.getByText('冻结余额')).toBeInTheDocument()
    expect(screen.getByText('待结算')).toBeInTheDocument()
    expect(screen.getByText('最近流水 / 争议')).toBeInTheDocument()
  })

  it('supports topup and dispute submission flows', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <BalancePage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('钱包流水')).toBeInTheDocument()

    await user.type(screen.getByLabelText('金额（分）'), '2000')
    await user.type(screen.getByLabelText('备注'), 'online')
    await user.click(screen.getByRole('button', { name: '确认充值' }))
    await waitFor(() => expect(mockedTopupWallet).toHaveBeenCalledWith(2000, 'online'))

    await user.type(screen.getByLabelText('订单 ID'), '123')
    await user.type(screen.getByLabelText('争议原因'), '验证码错误')
    await user.click(screen.getByRole('button', { name: '提交争议' }))
    await waitFor(() => expect(mockedCreateUserOrderDispute).toHaveBeenCalledWith(123, '验证码错误'))
    expect(await screen.findByText('验证码错误')).toBeInTheDocument()
  })
})
