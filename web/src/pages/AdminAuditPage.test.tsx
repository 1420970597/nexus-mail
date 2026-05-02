import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
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
        <Route path={ADMIN_RISK_ROUTE} element={<div>风控中心页面</div>} />
        <Route path={ADMIN_USERS_ROUTE} element={<div>资金工作台页面</div>} />
        <Route path={API_KEYS_ROUTE} element={<div>API Keys 页面</div>} />
        <Route path="/" element={<div>共享控制台首页</div>} />
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

  it('renders audit mission control shell with shared-console follow-up guidance', async () => {
    renderAdminAuditPage()

    expect(await screen.findByText('Audit Mission Control')).toBeInTheDocument()
    expect(screen.getByText('审计日志')).toBeInTheDocument()
    expect(screen.getByText(/将真实 `\/api\/v1\/admin\/audit` 回放、风险联动、高危运营后果与接入契约复盘放在同一套深色共享控制台中/)).toBeInTheDocument()
    expect(screen.getByText('高风险动作')).toBeInTheDocument()
    expect(screen.getByText('审计总数')).toBeInTheDocument()
    expect(screen.getAllByText('主体类型').length).toBeGreaterThan(0)
    expect(screen.getByText('最近动作')).toBeInTheDocument()
    expect(screen.getByText('管理员主任务流')).toBeInTheDocument()
    expect(screen.getByText('共享接入桥接')).toBeInTheDocument()
    expect(screen.getByText('API Keys · /api-keys')).toBeInTheDocument()
    expect(screen.getByText('风控中心 · /admin/risk')).toBeInTheDocument()
    expect(screen.getByText('API 文档 · /docs')).toBeInTheDocument()
    expect(screen.getAllByText('denied_whitelist').length).toBeGreaterThan(0)
    expect(screen.getByText('blocked by whitelist')).toBeInTheDocument()
  })

  it('navigates from mission-control actions to risk, finance, and api keys', async () => {
    const user = userEvent.setup()
    renderAdminAuditPage()

    expect(await screen.findByText('Audit Mission Control')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '查看风控中心' }))
    expect(await screen.findByText('风控中心页面')).toBeInTheDocument()

    renderAdminAuditPage()
    expect(await screen.findByText('Audit Mission Control')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '打开资金工作台' }))
    expect(await screen.findByText('资金工作台页面')).toBeInTheDocument()

    renderAdminAuditPage()
    expect(await screen.findByText('Audit Mission Control')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '打开 API Keys' }))
    expect(await screen.findByText('API Keys 页面')).toBeInTheDocument()
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

    expect(await screen.findByText('Audit Mission Control')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '查看风控中心' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '打开资金工作台' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '打开 API Keys' })).not.toBeInTheDocument()
    expect(screen.queryByText('API Keys · /api-keys')).not.toBeInTheDocument()
    expect(screen.queryByText('风控中心 · /admin/risk')).not.toBeInTheDocument()
    expect(screen.queryByText('API 文档 · /docs')).not.toBeInTheDocument()
    expect(screen.getByTestId('admin-audit-shared-console-fallback')).toBeInTheDocument()
    expect(screen.getByText('回到推荐工作台继续管理员主链路')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '返回推荐工作台' }))
    expect(await screen.findByText('共享控制台首页')).toBeInTheDocument()
  })

  it('hides the fallback slice when the audit page is the only visible admin route', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 11, email: 'admin@nexus-mail.local', role: 'admin' },
      menu: [{ key: 'admin-audit', label: '审计日志', path: ADMIN_AUDIT_ROUTE }],
    })

    renderAdminAuditPage()

    expect(await screen.findByText('Audit Mission Control')).toBeInTheDocument()
    expect(screen.queryByTestId('admin-audit-shared-console-fallback')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '返回推荐工作台' })).not.toBeInTheDocument()
  })

  it('queries audit logs with explicit filters', async () => {
    const user = userEvent.setup()
    renderAdminAuditPage()

    expect(await screen.findByText('Audit Mission Control')).toBeInTheDocument()

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
