import '@testing-library/jest-dom'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminAuditPage } from './AdminAuditPage'
import { useAuthStore } from '../store/authStore'
import { ADMIN_AUDIT_ROUTE, ADMIN_RISK_ROUTE, ADMIN_USERS_ROUTE, API_KEYS_ROUTE } from '../utils/consoleNavigation'

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

  it('renders audit mission control shell with heading, action lanes, and shared bridge contracts', async () => {
    renderAdminAuditPage()

    expect(await screen.findByRole('heading', { name: '审计日志' })).toBeInTheDocument()
    const heroCard = screen.getByTestId('admin-audit-hero-card')
    expect(within(heroCard).getByText('审计中枢')).toBeInTheDocument()
    const missionFlow = screen.getByTestId('admin-audit-mission-flow')
    expect(within(missionFlow).getByRole('button', { name: '查看风控中心' })).toBeInTheDocument()
    expect(within(missionFlow).getByRole('button', { name: '打开资金工作台' })).toBeInTheDocument()
    expect(within(missionFlow).getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()

    const bridge = screen.getByTestId('admin-audit-shared-console-bridge')
    expect(within(bridge).getByText('API Keys · /api-keys')).toBeInTheDocument()
    expect(within(bridge).getByText('风控中心 · /admin/risk')).toBeInTheDocument()
    expect(within(bridge).getByText('API 文档 · /docs')).toBeInTheDocument()

    const auditTable = screen.getByTestId('admin-audit-events-table-card')
    expect(within(auditTable).getByText('denied_whitelist')).toBeInTheDocument()
    expect(within(auditTable).getByText('blocked by whitelist')).toBeInTheDocument()
  })

  it('navigates from mission-control actions to risk, finance, and api keys', async () => {
    const user = userEvent.setup()
    let view = renderAdminAuditPage()

    expect(await screen.findByRole('heading', { name: '审计日志' })).toBeInTheDocument()

    const missionFlow = screen.getByTestId('admin-audit-mission-flow')
    await user.click(within(missionFlow).getByRole('button', { name: '查看风控中心' }))
    expect(await screen.findByTestId('admin-audit-route-stub-risk')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '风控中心' })).toBeInTheDocument()

    view.unmount()
    view = renderAdminAuditPage()
    expect(await screen.findByRole('heading', { name: '审计日志' })).toBeInTheDocument()
    const refreshedMissionFlow = screen.getByTestId('admin-audit-mission-flow')
    await user.click(within(refreshedMissionFlow).getByRole('button', { name: '打开资金工作台' }))
    expect(await screen.findByTestId('admin-audit-route-stub-users')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '用户管理' })).toBeInTheDocument()

    view.unmount()
    renderAdminAuditPage()
    expect(await screen.findByRole('heading', { name: '审计日志' })).toBeInTheDocument()
    const finalMissionFlow = screen.getByTestId('admin-audit-mission-flow')
    await user.click(within(finalMissionFlow).getByRole('button', { name: '打开 API Keys' }))
    expect(await screen.findByTestId('admin-audit-route-stub-api-keys')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()
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
    expect(within(bridge).queryByText('API Keys · /api-keys')).not.toBeInTheDocument()
    expect(within(bridge).queryByText('风控中心 · /admin/risk')).not.toBeInTheDocument()
    expect(within(bridge).queryByText('API 文档 · /docs')).not.toBeInTheDocument()
    const fallbackCard = screen.getByTestId('admin-audit-shared-console-fallback')
    expect(fallbackCard).toBeInTheDocument()
    expect(within(fallbackCard).getByText('回到推荐工作台继续管理员主链路')).toBeInTheDocument()

    await user.click(within(fallbackCard).getByRole('button', { name: '返回推荐工作台' }))
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
