import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ProtectedRoute, SupplierRoute, AdminRoute } from './ProtectedRoute'
import { useAuthStore } from '../store/authStore'

function LoginPage() {
  return <h1>登录页</h1>
}

function SharedDashboardPage() {
  return <h1>共享控制台首页</h1>
}

function ProtectedPage() {
  return <h1>受保护页面</h1>
}

function SupplierPage() {
  return <h1>供应商资源页</h1>
}

function AdminPage() {
  return <h1>管理员风控页</h1>
}

function renderRoute(element: JSX.Element, initialEntry = '/protected') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<SharedDashboardPage />} />
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
        <ProtectedPage />
      </ProtectedRoute>,
    )

    expect(await screen.findByRole('heading', { name: '登录页' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '受保护页面' })).not.toBeInTheDocument()
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
        <ProtectedPage />
      </ProtectedRoute>,
    )

    expect(await screen.findByRole('heading', { name: '受保护页面' })).toBeInTheDocument()
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
        <SupplierPage />
      </SupplierRoute>,
    )

    expect(await screen.findByRole('heading', { name: '共享控制台首页' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '供应商资源页' })).not.toBeInTheDocument()
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
        <SupplierPage />
      </SupplierRoute>,
    )

    expect(await screen.findByRole('heading', { name: '供应商资源页' })).toBeInTheDocument()
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
        <SupplierPage />
      </SupplierRoute>,
    )

    expect(await screen.findByRole('heading', { name: '供应商资源页' })).toBeInTheDocument()
  })

  it('sends unauthenticated visitors to login before evaluating supplier-role access', async () => {
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })

    renderRoute(
      <SupplierRoute>
        <SupplierPage />
      </SupplierRoute>,
    )

    expect(await screen.findByRole('heading', { name: '登录页' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '供应商资源页' })).not.toBeInTheDocument()
  })
})

describe('AdminRoute', () => {
  it('sends unauthenticated visitors to login before evaluating admin-role access', async () => {
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })

    renderRoute(
      <AdminRoute>
        <AdminPage />
      </AdminRoute>,
    )

    expect(await screen.findByRole('heading', { name: '登录页' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '管理员风控页' })).not.toBeInTheDocument()
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
        <AdminPage />
      </AdminRoute>,
    )

    expect(await screen.findByRole('heading', { name: '共享控制台首页' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '管理员风控页' })).not.toBeInTheDocument()
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
        <AdminPage />
      </AdminRoute>,
    )

    expect(await screen.findByRole('heading', { name: '管理员风控页' })).toBeInTheDocument()
  })
})
