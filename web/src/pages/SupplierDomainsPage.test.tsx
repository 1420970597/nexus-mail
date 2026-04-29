import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SupplierDomainsPage } from './SupplierDomainsPage'

const mockedGetSupplierResourcesOverview = vi.fn()
const mockedCreateSupplierDomain = vi.fn()
const mockedSuccess = vi.fn()
const mockedError = vi.fn()

vi.mock('../services/activation', () => ({
  getSupplierResourcesOverview: (...args: any[]) => mockedGetSupplierResourcesOverview(...args),
  createSupplierDomain: (...args: any[]) => mockedCreateSupplierDomain(...args),
}))

vi.mock('@douyinfe/semi-ui', async () => {
  const actual: any = await vi.importActual('@douyinfe/semi-ui')
  return {
    ...actual,
    Toast: {
      success: (...args: any[]) => mockedSuccess(...args),
      error: (...args: any[]) => mockedError(...args),
    },
  }
})

describe('SupplierDomainsPage', () => {
  beforeEach(() => {
    mockedGetSupplierResourcesOverview.mockReset()
    mockedCreateSupplierDomain.mockReset()
    mockedSuccess.mockReset()
    mockedError.mockReset()
  })

  it('renders supplier domains from real overview payload', async () => {
    mockedGetSupplierResourcesOverview.mockResolvedValue({
      domains: [
        { id: 1, name: 'mail.nexus.test', region: 'global', status: 'active', catch_all: true },
      ],
      accounts: [],
      mailboxes: [],
    })

    render(
      <MemoryRouter>
        <SupplierDomainsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('域名管理')).toBeInTheDocument()
    expect(await screen.findByText('mail.nexus.test')).toBeInTheDocument()
    expect(await screen.findByText('已开启')).toBeInTheDocument()
  })

  it('submits create domain form and reloads data', async () => {
    mockedGetSupplierResourcesOverview
      .mockResolvedValueOnce({ domains: [], accounts: [], mailboxes: [] })
      .mockResolvedValueOnce({
        domains: [{ id: 2, name: 'otp.nexus.test', region: 'hk', status: 'active', catch_all: true }],
        accounts: [],
        mailboxes: [],
      })
    mockedCreateSupplierDomain.mockResolvedValue({
      domain: { id: 2, name: 'otp.nexus.test', region: 'hk', status: 'active', catch_all: true },
    })

    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <SupplierDomainsPage />
      </MemoryRouter>,
    )

    const nameInput = await screen.findByPlaceholderText('mail.nexus.example')
    await user.type(nameInput, 'otp.nexus.test')
    await user.clear(screen.getByPlaceholderText('global / hk / us'))
    await user.type(screen.getByPlaceholderText('global / hk / us'), 'hk')
    await user.click(screen.getByRole('button', { name: '保存域名' }))

    await waitFor(() => {
      expect(mockedCreateSupplierDomain).toHaveBeenCalledWith({
        name: 'otp.nexus.test',
        region: 'hk',
        catch_all: true,
        status: 'active',
      })
    })
    await waitFor(() => expect(mockedSuccess).toHaveBeenCalled())
    await waitFor(() => expect(mockedGetSupplierResourcesOverview).toHaveBeenCalledTimes(2))
  })
})
