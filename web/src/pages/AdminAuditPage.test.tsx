import '@testing-library/jest-dom'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminAuditPage } from './AdminAuditPage'
import { useAuthStore } from '../store/authStore'
import { ADMIN_AUDIT_ROUTE, ADMIN_RISK_ROUTE, ADMIN_USERS_ROUTE, API_KEYS_ROUTE, DOCS_ROUTE } from '../utils/consoleNavigation'

const mockedGetAdminAudit = vi.fn()

vi.mock('../services/auth', () => ({
  getAdminAudit: (...args: any[]) => mockedGetAdminAudit(...args),
}))

function renderAdminAuditPage(initialEntry = ADMIN_AUDIT_ROUTE) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path={ADMIN_AUDIT_ROUTE} element={<AdminAuditPage />} />
        <Route
          path={ADMIN_RISK_ROUTE}
          element={(
            <section data-testid="admin-audit-route-stub-risk">
              <h1>风控中心</h1>
            </section>
          )}
        />
        <Route
          path={ADMIN_USERS_ROUTE}
          element={(
            <section data-testid="admin-audit-route-stub-users">
              <h1>用户管理</h1>
            </section>
          )}
        />
        <Route
          path={API_KEYS_ROUTE}
          element={(
            <section data-testid="admin-audit-route-stub-api-keys">
              <h1>开发者 API 接入工作台</h1>
            </section>
          )}
        />
        <Route
          path={DOCS_ROUTE}
          element={(
            <section data-testid="admin-audit-route-stub-docs">
              <h1>API 文档与接入控制台</h1>
            </section>
          )}
        />
        <Route
          path="/"
          element={(
            <section data-testid="admin-audit-route-stub-shared-home">
              <h1>控制台总览</h1>
            </section>
          )}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminAuditPage', () => {
  beforeEach(() => {
    mockedGetAdminAudit.mockReset()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 9, email: 'admin@nexus-mail.local', role: 'admin' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'admin-audit', label: '审计日志', path: ADMIN_AUDIT_ROUTE },
        { key: 'admin-risk', label: '风控中心', path: ADMIN_RISK_ROUTE },
        { key: 'admin-users', label: '用户管理', path: ADMIN_USERS_ROUTE },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
        { key: 'docs', label: 'API 文档', path: '/docs' },
      ],
    })
    mockedGetAdminAudit.mockResolvedValue({
      items: [
        {
          id: 1,
          user_id: 7,
          api_key_id: 12,
          action: 'denied_whitelist',
          actor_type: 'system',
          note: 'blocked by whitelist',
          created_at: '2026-05-02T00:00:00Z',
        },
        {
          id: 2,
          user_id: 8,
          api_key_id: 13,
          action: 'success',
          actor_type: 'user',
          note: 'scope ok',
          created_at: '2026-05-02T00:05:00Z',
        },
      ],
    })
  })

  it('renders audit mission control shell with heading, action lanes, and shared bridge CTA contracts', async () => {
    renderAdminAuditPage()

    expect(await screen.findByRole('heading', { name: '审计日志' })).toBeInTheDocument()
    const heroCard = screen.getByTestId('admin-audit-hero-card')
    expect(within(heroCard).getByText('审计中枢')).toBeInTheDocument()
    const missionFlow = screen.getByTestId('admin-audit-mission-flow')
    expect(within(missionFlow).getByRole('button', { name: '查看风控中心' })).toBeInTheDocument()
    expect(within(missionFlow).getByRole('button', { name: '打开资金工作台' })).toBeInTheDocument()
    expect(within(missionFlow).getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()
    expect(missionFlow).toHaveTextContent('用 API Keys 与 API 文档与接入控制台继续检查鉴权契约、作用域设计和真实接口重放结果，而不是另开一套后台。')
    expect(missionFlow).not.toHaveTextContent('用 API Keys 与文档入口继续检查鉴权契约、作用域设计和真实接口重放结果，而不是另开一套后台。')

    const bridge = screen.getByRole('region', { name: '共享接入桥接' })
    expect(bridge).toHaveTextContent('审计页不是独立后台：查询完高危事件后，仍然通过风控中心、开发者 API 接入工作台与 API 文档与接入控制台在同一套控制台中继续验证真实鉴权契约与修复结果。')
    expect(bridge).not.toHaveTextContent('审计页不是独立后台：查询完高危事件后，仍然通过风控、API Keys 与 API 文档入口在同一套控制台中继续验证真实鉴权契约与修复结果。')
    expect(within(bridge).getByRole('heading', { name: '共享接入桥接' })).toBeInTheDocument()
    expect(within(bridge).getByRole('button', { name: /打开 API Keys/ })).toBeInTheDocument()
    expect(within(bridge).getByRole('button', { name: /继续查看风控/ })).toBeInTheDocument()
    expect(within(bridge).getByRole('button', { name: /查看 API 文档/ })).toBeInTheDocument()

    const capabilityMatrix = screen.getByRole('region', { name: '控制台能力矩阵' })
    expect(within(capabilityMatrix).getByRole('heading', { name: '控制台能力矩阵' })).toBeInTheDocument()
    expect(within(capabilityMatrix).getByText('统一审计入口')).toBeInTheDocument()
    expect(within(capabilityMatrix).getByText('共享接入桥接')).toBeInTheDocument()
    expect(within(capabilityMatrix).getByText('管理员菜单扩展')).toBeInTheDocument()

    const auditTable = screen.getByTestId('admin-audit-events-table-card')
    expect(within(auditTable).getByText('denied_whitelist')).toBeInTheDocument()
    expect(within(auditTable).getByText('blocked by whitelist')).toBeInTheDocument()
  })

  it('navigates from the shared-console bridge to api keys, risk, and docs destinations', async () => {
    const user = userEvent.setup()
    let view = renderAdminAuditPage()

    expect(await screen.findByRole('heading', { name: '审计日志' })).toBeInTheDocument()

    const bridge = screen.getByTestId('admin-audit-shared-console-bridge')
    await user.click(within(bridge).getByRole('button', { name: /打开 API Keys/ }))
    expect(await screen.findByTestId('admin-audit-route-stub-api-keys')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()

    view.unmount()
    view = renderAdminAuditPage()
    expect(await screen.findByRole('heading', { name: '审计日志' })).toBeInTheDocument()
    const refreshedBridge = screen.getByTestId('admin-audit-shared-console-bridge')
    await user.click(within(refreshedBridge).getByRole('button', { name: /继续查看风控/ }))
    expect(await screen.findByTestId('admin-audit-route-stub-risk')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '风控中心' })).toBeInTheDocument()

    view.unmount()
    renderAdminAuditPage()
    expect(await screen.findByRole('heading', { name: '审计日志' })).toBeInTheDocument()
    const docsBridge = screen.getByTestId('admin-audit-shared-console-bridge')
    await user.click(within(docsBridge).getByRole('button', { name: /查看 API 文档/ }))
    expect(await screen.findByTestId('admin-audit-route-stub-docs')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'API 文档与接入控制台' })).toBeInTheDocument()
  })

  it('suppresses unavailable shared-console CTAs and shows a fallback slice back to the preferred workspace', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 10, email: 'admin@nexus-mail.local', role: 'admin' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'admin-audit', label: '审计日志', path: ADMIN_AUDIT_ROUTE },
      ],
    })

    renderAdminAuditPage()

    expect(await screen.findByRole('heading', { name: '审计日志' })).toBeInTheDocument()
    const missionFlow = screen.getByTestId('admin-audit-mission-flow')
    expect(within(missionFlow).queryByRole('button', { name: '查看风控中心' })).not.toBeInTheDocument()
    expect(within(missionFlow).queryByRole('button', { name: '打开资金工作台' })).not.toBeInTheDocument()
    expect(within(missionFlow).queryByRole('button', { name: '打开 API Keys' })).not.toBeInTheDocument()
    const bridge = screen.getByTestId('admin-audit-shared-console-bridge')
    expect(within(bridge).queryByRole('button', { name: /打开 API Keys/ })).not.toBeInTheDocument()
    expect(within(bridge).queryByRole('button', { name: /继续查看风控/ })).not.toBeInTheDocument()
    expect(within(bridge).queryByRole('button', { name: /查看 API 文档/ })).not.toBeInTheDocument()
    expect(screen.queryByTestId('admin-audit-capability-matrix')).not.toBeInTheDocument()
    const fallbackCard = screen.getByTestId('admin-audit-shared-console-fallback')
    expect(fallbackCard).toBeInTheDocument()
    expect(within(fallbackCard).getByText('回到共享工作台继续管理员主链路')).toBeInTheDocument()

    await user.click(within(fallbackCard).getByRole('button', { name: '返回共享工作台' }))
    expect(await screen.findByTestId('admin-audit-route-stub-shared-home')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '控制台总览' })).toBeInTheDocument()
  })

  it('hides the fallback slice when the audit page is the only visible admin route', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 11, email: 'admin@nexus-mail.local', role: 'admin' },
      menu: [{ key: 'admin-audit', label: '审计日志', path: ADMIN_AUDIT_ROUTE }],
    })

    renderAdminAuditPage()

    expect(await screen.findByRole('heading', { name: '审计日志' })).toBeInTheDocument()
    expect(screen.queryByTestId('admin-audit-shared-console-fallback')).not.toBeInTheDocument()
  })

  it('queries audit logs with explicit filters', async () => {
    const user = userEvent.setup()
    renderAdminAuditPage()

    expect(await screen.findByRole('heading', { name: '审计日志' })).toBeInTheDocument()

    await user.type(screen.getByLabelText('用户 ID'), '9')
    await user.type(screen.getByLabelText('API Key ID'), '22')
    await user.type(screen.getByLabelText('主体类型'), 'admin')
    await user.type(screen.getByLabelText('动作'), 'revoke')
    await user.clear(screen.getByLabelText('返回条数'))
    await user.type(screen.getByLabelText('返回条数'), '20')
    await user.click(screen.getByRole('button', { name: '查询审计' }))

    await waitFor(() => {
      expect(mockedGetAdminAudit).toHaveBeenLastCalledWith({
        user_id: 9,
        api_key_id: 22,
        actor_type: 'admin',
        action: 'revoke',
        limit: 20,
      })
    })
  })
})
