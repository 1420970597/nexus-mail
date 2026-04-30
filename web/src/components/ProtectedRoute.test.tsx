import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ProtectedRoute, SupplierRoute, AdminRoute } from './ProtectedRoute'
import { useAuthStore } from '../store/authStore'

function renderRoute(element: JSX.Element, initialEntry = '/protected') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<div>登录页</div>} />
        <Route path="/" element={<div>共享控制台首页</div>} />
        <Route path="/protected" element={element} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  it('redirects unauthenticated users to login', async () => {
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })

    renderRoute(
      <ProtectedRoute>
        <div>受保护页面</div>
      </ProtectedRoute>,
    )

    expect(await screen.findByText('登录页')).toBeInTheDocument()
    expect(screen.queryByText('受保护页面')).not.toBeInTheDocument()
  })

  it('renders children when a session token exists', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 1, email: 'user@nexus-mail.local', role: 'user' },
      menu: [],
    })

    renderRoute(
      <ProtectedRoute>
        <div>受保护页面</div>
      </ProtectedRoute>,
    )

    expect(await screen.findByText('受保护页面')).toBeInTheDocument()
    expect(screen.queryByText('登录页')).not.toBeInTheDocument()
  })
})

describe('SupplierRoute', () => {
  it('redirects plain users back to the shared dashboard instead of showing supplier content', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 2, email: 'user@nexus-mail.local', role: 'user' },
      menu: [],
    })

    renderRoute(
      <SupplierRoute>
        <div>供应商资源页</div>
      </SupplierRoute>,
    )

    expect(await screen.findByText('共享控制台首页')).toBeInTheDocument()
    expect(screen.queryByText('供应商资源页')).not.toBeInTheDocument()
  })

  it('allows supplier users to access supplier pages', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 3, email: 'supplier@nexus-mail.local', role: 'supplier' },
      menu: [],
    })

    renderRoute(
      <SupplierRoute>
        <div>供应商资源页</div>
      </SupplierRoute>,
    )

    expect(await screen.findByText('供应商资源页')).toBeInTheDocument()
  })

  it('allows admin users to access supplier pages from the same shared console shell', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 4, email: 'admin@nexus-mail.local', role: 'admin' },
      menu: [],
    })

    renderRoute(
      <SupplierRoute>
        <div>供应商资源页</div>
      </SupplierRoute>,
    )

    expect(await screen.findByText('供应商资源页')).toBeInTheDocument()
  })

  it('sends unauthenticated visitors to login before evaluating supplier-role access', async () => {
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })

    renderRoute(
      <SupplierRoute>
        <div>供应商资源页</div>
      </SupplierRoute>,
    )

    expect(await screen.findByText('登录页')).toBeInTheDocument()
    expect(screen.queryByText('供应商资源页')).not.toBeInTheDocument()
  })
})

describe('AdminRoute', () => {
  it('sends unauthenticated visitors to login before evaluating admin-role access', async () => {
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })

    renderRoute(
      <AdminRoute>
        <div>管理员风控页</div>
      </AdminRoute>,
    )

    expect(await screen.findByText('登录页')).toBeInTheDocument()
    expect(screen.queryByText('管理员风控页')).not.toBeInTheDocument()
  })

  it('keeps non-admin roles out of admin-only pages', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 5, email: 'supplier@nexus-mail.local', role: 'supplier' },
      menu: [],
    })

    renderRoute(
      <AdminRoute>
        <div>管理员风控页</div>
      </AdminRoute>,
    )

    expect(await screen.findByText('共享控制台首页')).toBeInTheDocument()
    expect(screen.queryByText('管理员风控页')).not.toBeInTheDocument()
  })

  it('renders admin-only content for admin roles', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 6, email: 'admin@nexus-mail.local', role: 'admin' },
      menu: [],
    })

    renderRoute(
      <AdminRoute>
        <div>管理员风控页</div>
      </AdminRoute>,
    )

    expect(await screen.findByText('管理员风控页')).toBeInTheDocument()
  })
})
