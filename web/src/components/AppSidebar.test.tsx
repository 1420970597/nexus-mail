import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppSidebar } from './AppSidebar'
import { useAuthStore } from '../store/authStore'

describe('AppSidebar', () => {
  afterEach(() => {
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })
  })

  it('shows supplier domain and settlement menu for supplier role', () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 2, email: 'supplier@nexus-mail.local', role: 'supplier' },
      menu: [],
    })

    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>,
    )

    expect(screen.getByText('域名管理')).toBeInTheDocument()
    expect(screen.getByText('供应商结算')).toBeInTheDocument()
    expect(screen.queryByText('风控中心')).not.toBeInTheDocument()
  })

  it('shows admin risk control menu for admin role', () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 3, email: 'admin@nexus-mail.local', role: 'admin' },
      menu: [],
    })

    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>,
    )

    expect(screen.getByText('风控中心')).toBeInTheDocument()
    expect(screen.getByText('审计日志')).toBeInTheDocument()
    expect(screen.getByText('余额中心')).toBeInTheDocument()
  })
})
