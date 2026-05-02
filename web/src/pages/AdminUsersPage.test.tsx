import { render, screen, waitFor, within } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AdminUsersPage, buildDisputeResolutionPayload } from './AdminUsersPage'
import * as financeService from '../services/finance'

vi.mock('../services/finance', () => ({
  adminAdjustWallet: vi.fn(),
  getAdminWalletUsers: vi.fn(),
  getAdminDisputes: vi.fn(),
  resolveAdminDispute: vi.fn(),
  settleSupplierPending: vi.fn(),
}))

const mockedGetAdminWalletUsers = vi.mocked(financeService.getAdminWalletUsers)
const mockedGetAdminDisputes = vi.mocked(financeService.getAdminDisputes)
const mockedResolveAdminDispute = vi.mocked(financeService.resolveAdminDispute)
const mockedAdminAdjustWallet = vi.mocked(financeService.adminAdjustWallet)
const mockedSettleSupplierPending = vi.mocked(financeService.settleSupplierPending)

describe('AdminUsersPage dispute handling', () => {
  beforeEach(() => {
    mockedGetAdminWalletUsers.mockResolvedValue({
      items: [
        {
          user_id: 2,
          email: 'user@nexus-mail.local',
          available_balance: 1000,
          frozen_balance: 0,
          pending_settlement: 0,
          updated_at: '2026-04-28T00:00:00Z',
        },
      ],
    })
    mockedGetAdminDisputes.mockResolvedValue({
      items: [
        {
          id: 8,
          order_id: 10,
          project_key: 'discord',
          supplier_id: 7,
          user_id: 2,
          status: 'open',
          reason: '验证码错误',
          resolution_type: '',
          resolution_note: '',
          refund_amount: 0,
          created_at: '2026-04-28T00:00:00Z',
          updated_at: '2026-04-28T00:00:00Z',
        },
      ],
    })
    mockedResolveAdminDispute.mockResolvedValue({
      dispute: {
        id: 8,
        order_id: 10,
        project_key: 'discord',
        supplier_id: 7,
        user_id: 2,
        status: 'resolved',
        reason: '验证码错误',
        resolution_type: 'refund',
        resolution_note: '确认退款',
        refund_amount: 200,
        created_at: '2026-04-28T00:00:00Z',
        updated_at: '2026-04-28T00:00:00Z',
        resolved_at: '2026-04-28T00:01:00Z',
      },
    })
    mockedAdminAdjustWallet.mockResolvedValue({
      wallet: {
        user_id: 2,
        email: 'user@nexus-mail.local',
        available_balance: 1200,
        frozen_balance: 0,
        updated_at: '2026-04-28T00:00:00Z',
      },
    })
    mockedSettleSupplierPending.mockResolvedValue({
      payout: {
        supplier_id: 7,
        settled_amount: 1000,
        pending_balance: 0,
        settled_balance: 1000,
        entry_count: 1,
        reason: '月度结算',
        settled_at: '2026-04-28T00:00:00Z',
      },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('uses select controls for dispute resolution and submits explicit refund contract', async () => {
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('验证码错误')).toBeInTheDocument()
    const disputeCard = screen.getByTestId('admin-users-dispute-resolution-card')

    fireEvent.change(within(disputeCard).getByLabelText('争议单 ID'), { target: { value: '8' } })
    fireEvent.change(within(disputeCard).getByLabelText('退款金额（分）'), { target: { value: '200' } })
    fireEvent.change(within(disputeCard).getByLabelText('处理备注'), { target: { value: '确认退款' } })
    expect(within(disputeCard).getByText('通过并处理')).toBeInTheDocument()
    expect(within(disputeCard).getByText(/必须选择“原路退款”/)).toBeInTheDocument()
    fireEvent.click(within(disputeCard).getByRole('button', { name: '处理争议单' }))

    await waitFor(() => expect(mockedResolveAdminDispute).toHaveBeenCalledWith(8, {
      status: 'resolved',
      resolution_type: 'refund',
      resolution_note: '确认退款',
      refund_amount: 200,
    }))
  })

  it('normalizes rejected disputes to zero refund before calling api', () => {
    expect(buildDisputeResolutionPayload({
      dispute_id: '9',
      status: 'rejected',
      resolution_type: 'refund',
      resolution_note: '证据不足',
      refund_amount: 300,
    })).toEqual({
      disputeId: 9,
      payload: {
        status: 'rejected',
        resolution_type: 'manual_adjustment',
        resolution_note: '证据不足',
        refund_amount: 0,
      },
    })
  })

  it('keeps manual adjustment when resolved without refund', () => {
    expect(buildDisputeResolutionPayload({
      dispute_id: 10,
      status: 'resolved',
      resolution_type: 'manual_adjustment',
      resolution_note: '无需退款',
      refund_amount: 0,
    })).toEqual({
      disputeId: 10,
      payload: {
        status: 'resolved',
        resolution_type: 'manual_adjustment',
        resolution_note: '无需退款',
        refund_amount: 0,
      },
    })
  })

  it('submits confirmation phrases for high-risk wallet and settlement operations', async () => {
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>,
    )
    expect(await screen.findByText('验证码错误')).toBeInTheDocument()

    const adjustmentCard = screen.getByTestId('admin-users-adjustment-card')
    fireEvent.change(within(adjustmentCard).getByLabelText('用户 ID'), { target: { value: '2' } })
    fireEvent.change(within(adjustmentCard).getByLabelText('金额（分）'), { target: { value: '500' } })
    fireEvent.change(within(adjustmentCard).getByLabelText('原因'), { target: { value: '运营补偿' } })
    fireEvent.change(within(adjustmentCard).getByLabelText('二次确认'), { target: { value: '确认调账' } })
    fireEvent.click(within(adjustmentCard).getByRole('button', { name: '执行调账' }))
    await waitFor(() => expect(mockedAdminAdjustWallet).toHaveBeenCalledWith(2, 500, '运营补偿', '确认调账'))

    const settlementCard = screen.getByTestId('admin-users-settlement-card')
    fireEvent.change(within(settlementCard).getByLabelText('供应商用户 ID'), { target: { value: '7' } })
    fireEvent.change(within(settlementCard).getByLabelText('结算说明'), { target: { value: '月度结算' } })
    fireEvent.change(within(settlementCard).getByLabelText('二次确认'), { target: { value: '确认结算' } })
    fireEvent.click(within(settlementCard).getByRole('button', { name: '确认结算' }))
    await waitFor(() => expect(mockedSettleSupplierPending).toHaveBeenCalledWith(7, '月度结算', '确认结算'))
  })

  it('applies explicit admin dispute filters only after clicking query', async () => {
    render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>,
    )
    expect(await screen.findByText('验证码错误')).toBeInTheDocument()
    const listCard = screen.getByTestId('admin-users-dispute-list-card')

    fireEvent.change(within(listCard).getByLabelText('状态筛选'), { target: { value: 'resolved' } })
    fireEvent.change(within(listCard).getByLabelText('最多条数'), { target: { value: '25' } })
    expect(mockedGetAdminDisputes).toHaveBeenCalledTimes(1)

    fireEvent.click(within(listCard).getByRole('button', { name: '查询争议单' }))

    await waitFor(() => expect(mockedGetAdminDisputes).toHaveBeenLastCalledWith({ status: 'resolved', limit: 25 }))
  })
})
