import '@testing-library/jest-dom'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ConsoleLayout } from '../layouts/ConsoleLayout'
import { useAuthStore } from '../store/authStore'

function renderLayout(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
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
  it('renders shared route title and excludes the current page from quick actions', () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 1, email: 'admin@nexus-mail.local', role: 'admin' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'projects', label: '项目市场', path: '/projects' },
        { key: 'admin-risk', label: '风控中心', path: '/admin/risk' },
        { key: 'admin-audit', label: '审计日志', path: '/admin/audit' },
        { key: 'api-keys', label: 'API Keys', path: '/api-keys' },
      ],
    })

    renderLayout('/admin/risk')

    expect(screen.getAllByText('风控中心').length).toBeGreaterThan(0)
    expect(screen.getAllByText('管理员控制台').length).toBeGreaterThan(0)
    const quickActionButtons = screen.getAllByRole('button')
    expect(quickActionButtons.some((button) => button.textContent?.includes('项目市场'))).toBe(true)
    expect(quickActionButtons.some((button) => button.textContent?.includes('审计日志'))).toBe(true)
  })

  it('navigates through quick actions using the shared route schema order', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 2, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'projects', label: '项目市场', path: '/projects' },
        { key: 'orders', label: '订单中心', path: '/orders' },
        { key: 'api-keys', label: 'API Keys', path: '/api-keys' },
        { key: 'docs', label: 'API 文档', path: '/docs' },
      ],
    })

    render(
      <MemoryRouter initialEntries={['/orders']}>
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

    const navigationRoot = screen.getByRole('menu')
    const projectNavItem = within(navigationRoot).getAllByText('项目市场')[0]

    await user.click(projectNavItem)
    expect(await screen.findAllByText('项目市场')).not.toHaveLength(0)
  })
})
