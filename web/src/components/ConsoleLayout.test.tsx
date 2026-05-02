import '@testing-library/jest-dom'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ConsoleLayout } from '../layouts/ConsoleLayout'
import { useAuthStore } from '../store/authStore'

function renderLayout(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route
          path="*"
          element={
            <ConsoleLayout onLogout={() => {}}>
              <div>页面内容</div>
            </ConsoleLayout>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ConsoleLayout', () => {
  it('renders shared route title, keeps the current page out of quick actions, and exposes a main landmark', () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 1, email: 'admin@nexus-mail.local', role: 'admin' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'projects', label: '项目市场', path: '/projects' },
        { key: 'admin-users', label: '用户管理', path: '/admin/users' },
        { key: 'admin-risk', label: '风控中心', path: '/admin/risk' },
        { key: 'admin-audit', label: '审计日志', path: '/admin/audit' },
        { key: 'api-keys', label: 'API Keys', path: '/api-keys' },
      ],
    })

    renderLayout('/admin/risk')

    expect(screen.getAllByText('风控中心').length).toBeGreaterThan(0)
    expect(screen.getAllByText('管理员控制台').length).toBeGreaterThan(0)
    expect(screen.getByRole('main', { name: '控制台主内容' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /风控中心/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /用户管理/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /审计日志/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /API Keys/ })).not.toBeInTheDocument()
  })

  it('renders quick actions in shared route schema order and navigates through them', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 2, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'projects', label: '项目市场', path: '/projects' },
        { key: 'orders', label: '订单中心', path: '/orders' },
        { key: 'balance', label: '余额中心', path: '/balance' },
        { key: 'api-keys', label: 'API Keys', path: '/api-keys' },
        { key: 'docs', label: 'API 文档', path: '/docs' },
      ],
    })

    render(
      <MemoryRouter initialEntries={['/orders']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route
            path="*"
            element={
              <ConsoleLayout onLogout={() => {}}>
                <div>页面内容</div>
              </ConsoleLayout>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    const quickActions = screen.getAllByRole('button').filter((button) =>
      ['项目市场', '余额中心', 'API 文档', 'API Keys'].includes(button.textContent ?? ''),
    )
    expect(quickActions.map((button) => button.textContent)).toEqual(['项目市场', '余额中心', 'API 文档'])

    await user.click(screen.getByRole('button', { name: /项目市场/ }))
    expect(await screen.findAllByText('项目市场')).not.toHaveLength(0)
  })
})
