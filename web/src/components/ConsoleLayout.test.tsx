import '@testing-library/jest-dom'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ConsoleLayout } from '../layouts/ConsoleLayout'
import { API_KEYS_ROUTE, WEBHOOKS_ROUTE, resolveRouteTitle } from '../utils/consoleNavigation'
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
  it('renders canonical quick-action titles for shared routes and keeps the current page out of quick actions', () => {
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
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
      ],
      bootstrapStatus: 'ready',
    })

    renderLayout('/admin/risk')

    const headerSummary = screen.getByTestId('console-layout-header-summary')
    expect(within(headerSummary).getByRole('heading', { name: '风控中心' })).toBeInTheDocument()
    expect(within(headerSummary).getByLabelText('Tag: 单一登录后控制台')).toBeInTheDocument()
    const mainContent = screen.getByRole('main', { name: '控制台主内容' })
    expect(mainContent).toBeInTheDocument()

    const quickActions = screen.getByTestId('console-layout-quick-actions')
    expect(within(quickActions).getByRole('button', { name: /用户管理/ })).toBeInTheDocument()
    expect(within(quickActions).getByRole('button', { name: /审计日志/ })).toBeInTheDocument()
    expect(within(quickActions).queryByRole('button', { name: /风控中心/ })).not.toBeInTheDocument()
    expect(within(quickActions).queryByRole('button', { name: /API Keys/ })).not.toBeInTheDocument()
    expect(within(quickActions).queryByRole('button', { name: resolveRouteTitle(API_KEYS_ROUTE, 'admin') })).not.toBeInTheDocument()
  })

  it('renders quick actions in shared route schema order with canonical titles and navigates to the API keys route stub', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 2, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'projects', label: '项目市场', path: '/projects' },
        { key: 'orders', label: '订单中心', path: '/orders' },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
        { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
      ],
      bootstrapStatus: 'ready',
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
          <Route
            path="/projects"
            element={
              <section data-testid="console-layout-route-stub-projects">
                <h1>项目市场</h1>
              </section>
            }
          />
          <Route
            path="/api-keys"
            element={
              <section data-testid="console-layout-route-stub-api-keys">
                <h1>开发者 API 接入工作台</h1>
              </section>
            }
          />
          <Route
            path="/webhooks"
            element={
              <section data-testid="console-layout-route-stub-webhooks">
                <h1>开发者 Webhook 接入工作台</h1>
              </section>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    const quickActions = screen.getByTestId('console-layout-quick-actions')
    const orderedQuickActionIds = [
      'console-layout-quick-action-projects',
      'console-layout-quick-action-api-keys',
      'console-layout-quick-action-webhooks',
    ]
    expect(
      orderedQuickActionIds.map((testId) => within(quickActions).getByTestId(testId).textContent?.trim()),
    ).toEqual([
      '项目市场',
      resolveRouteTitle(API_KEYS_ROUTE, 'user'),
      resolveRouteTitle(WEBHOOKS_ROUTE, 'user'),
    ])
    expect(within(quickActions).queryByRole('button', { name: /^API Keys$/ })).not.toBeInTheDocument()
    expect(within(quickActions).queryByRole('button', { name: /Webhook 设置/ })).not.toBeInTheDocument()

    await user.click(within(quickActions).getByTestId('console-layout-quick-action-api-keys'))
    expect(await screen.findByTestId('console-layout-route-stub-api-keys')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: resolveRouteTitle(API_KEYS_ROUTE, 'user') })).toBeInTheDocument()
  })
})
