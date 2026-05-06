import '@testing-library/jest-dom'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminRiskPage } from './AdminRiskPage'
import { useAuthStore } from '../store/authStore'
import { ADMIN_AUDIT_ROUTE, ADMIN_RISK_ROUTE, ADMIN_USERS_ROUTE, API_KEYS_ROUTE } from '../utils/consoleNavigation'

const mockedGetAdminRisk = vi.fn()
const mockedGetAdminRiskRules = vi.fn()
const mockedUpdateAdminRiskRules = vi.fn()

vi.mock('../services/auth', () => ({
  getAdminRisk: (...args: any[]) => mockedGetAdminRisk(...args),
  getAdminRiskRules: (...args: any[]) => mockedGetAdminRiskRules(...args),
  updateAdminRiskRules: (...args: any[]) => mockedUpdateAdminRiskRules(...args),
}))

function renderAdminRiskPage(initialEntry = ADMIN_RISK_ROUTE) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path={ADMIN_RISK_ROUTE} element={<AdminRiskPage />} />
        <Route
          path={ADMIN_AUDIT_ROUTE}
          element={<section data-testid="admin-risk-route-stub-audit"><h1>审计日志</h1></section>}
        />
        <Route
          path={ADMIN_USERS_ROUTE}
          element={<section data-testid="admin-risk-route-stub-users"><h1>用户管理</h1></section>}
        />
        <Route
          path={API_KEYS_ROUTE}
          element={<section data-testid="admin-risk-route-stub-api-keys"><h1>API Keys</h1></section>}
        />
        <Route
          path="/"
          element={<section data-testid="admin-risk-route-stub-dashboard"><h1>控制台总览</h1></section>}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminRiskPage', () => {
  beforeEach(() => {
    mockedGetAdminRisk.mockReset()
    mockedGetAdminRiskRules.mockReset()
    mockedUpdateAdminRiskRules.mockReset()

    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 9, email: 'admin@nexus-mail.local', role: 'admin' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'admin-risk', label: '风控中心', path: ADMIN_RISK_ROUTE },
        { key: 'admin-audit', label: '审计日志', path: ADMIN_AUDIT_ROUTE },
        { key: 'admin-users', label: '用户管理', path: ADMIN_USERS_ROUTE },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
        { key: 'docs', label: 'API 文档', path: '/docs' },
      ],
    })

    mockedGetAdminRisk.mockResolvedValue({
      generated_at: '2026-05-02T00:00:00Z',
      summary: {
        open_disputes: 2,
        denied_whitelist: 3,
        denied_scope: 1,
        denied_invalid: 0,
        denied_rate_limit: 4,
        timeout_orders: 5,
        canceled_orders: 2,
        high_risk_signal_count: 3,
        medium_risk_signal_count: 2,
      },
      signals: [
        { category: 'auth', severity: 'high', count: 3, title: 'API Key 触发限流', detail: '最近 15 分钟检测到 3 次 denied_rate_limit 事件' },
        { category: 'auth', severity: 'high', count: 2, title: '白名单拒绝频繁', detail: '疑似调用方出口变化导致 denied_whitelist 上升' },
        { category: 'orders', severity: 'medium', count: 2, title: '超时订单增加', detail: '近期 timeout 占比升高，需结合供应商履约确认' },
      ],
    })
    mockedGetAdminRiskRules.mockResolvedValue({
      items: [
        { key: 'api_denied_rate', enabled: true, threshold: 10, window_minutes: 15, severity: 'high', description: 'API Key 异常访问检测', updated_at: '2026-05-02T00:00:00Z' },
        { key: 'high_timeout', enabled: true, threshold: 5, window_minutes: 60, severity: 'medium', description: '高频超时', updated_at: '2026-05-02T00:00:00Z' },
      ],
    })
    mockedUpdateAdminRiskRules.mockImplementation(async (items) => ({ items }))
  })

  it('renders risk mission control shell with shared-console guidance and runtime metrics', async () => {
    renderAdminRiskPage()

    expect(await screen.findByRole('heading', { name: '风控中心' })).toBeInTheDocument()
    const heroCard = screen.getByTestId('admin-risk-hero-card')
    expect(within(heroCard).getByText('风控中枢')).toBeInTheDocument()
    expect(screen.getByText('风控中心')).toBeInTheDocument()
    expect(screen.getByText(/将真实风险信号、规则编辑、审计回放与高危运营处置统一收敛/)).toBeInTheDocument()

    const missionSignals = screen.getByTestId('admin-risk-mission-signals')
    expect(within(missionSignals).getByText('高风险信号')).toBeInTheDocument()
    expect(within(missionSignals).getByText('观察中信号')).toBeInTheDocument()
    expect(within(missionSignals).getByText('生效规则')).toBeInTheDocument()
    expect(within(missionSignals).getByText('共享控制台联动')).toBeInTheDocument()

    const missionFlow = screen.getByTestId('admin-risk-mission-flow')
    expect(within(missionFlow).getByText('管理员主任务流')).toBeInTheDocument()

    const bridge = screen.getByTestId('admin-risk-shared-console-bridge')
    expect(within(bridge).getByText('API Keys · /api-keys')).toBeInTheDocument()
    expect(within(bridge).getByText('审计日志 · /admin/audit')).toBeInTheDocument()
    expect(within(bridge).getByText('API 文档 · /docs')).toBeInTheDocument()

    const highRiskMetric = screen.getByTestId('admin-risk-high-risk-metric')
    expect(within(highRiskMetric).getByText('高风险')).toBeInTheDocument()

    const overviewCard = screen.getByTestId('admin-risk-overview-card')
    expect(within(overviewCard).getByText('规则命中概览')).toBeInTheDocument()

    const actionsCard = screen.getByTestId('admin-risk-actions-card')
    expect(within(actionsCard).getByText('处置建议')).toBeInTheDocument()
  })

  it('navigates from mission-control actions to audit, finance, and api key pages', async () => {
    const user = userEvent.setup()
    let view = renderAdminRiskPage()

    expect(await screen.findByRole('heading', { name: '风控中心' })).toBeInTheDocument()

    const missionFlow = screen.getByTestId('admin-risk-mission-flow')
    await user.click(within(missionFlow).getByRole('button', { name: '查看审计日志' }))
    const auditRouteStub = await screen.findByTestId('admin-risk-route-stub-audit')
    expect(within(auditRouteStub).getByRole('heading', { name: '审计日志' })).toBeInTheDocument()

    view.unmount()
    view = renderAdminRiskPage()
    expect(await screen.findByRole('heading', { name: '风控中心' })).toBeInTheDocument()
    const refreshedMissionFlow = screen.getByTestId('admin-risk-mission-flow')
    await user.click(within(refreshedMissionFlow).getByRole('button', { name: '打开资金工作台' }))
    const usersRouteStub = await screen.findByTestId('admin-risk-route-stub-users')
    expect(within(usersRouteStub).getByRole('heading', { name: '用户管理' })).toBeInTheDocument()

    view.unmount()
    renderAdminRiskPage()
    expect(await screen.findByRole('heading', { name: '风控中心' })).toBeInTheDocument()
    const finalMissionFlow = screen.getByTestId('admin-risk-mission-flow')
    await user.click(within(finalMissionFlow).getByRole('button', { name: '打开 API Keys' }))
    const apiKeysRouteStub = await screen.findByTestId('admin-risk-route-stub-api-keys')
    expect(within(apiKeysRouteStub).getByRole('heading', { name: 'API Keys' })).toBeInTheDocument()
  })

  it('suppresses unavailable shared-console CTAs and shows a fallback slice back to the preferred workspace', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 10, email: 'admin@nexus-mail.local', role: 'admin' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'admin-risk', label: '风控中心', path: ADMIN_RISK_ROUTE },
      ],
    })

    renderAdminRiskPage()

    expect(await screen.findByRole('heading', { name: '风控中心' })).toBeInTheDocument()
    const missionFlow = screen.getByTestId('admin-risk-mission-flow')
    expect(within(missionFlow).queryByRole('button', { name: '查看审计日志' })).not.toBeInTheDocument()
    expect(within(missionFlow).queryByRole('button', { name: '打开资金工作台' })).not.toBeInTheDocument()
    expect(within(missionFlow).queryByRole('button', { name: '打开 API Keys' })).not.toBeInTheDocument()
    const bridge = screen.getByTestId('admin-risk-shared-console-bridge')
    expect(within(bridge).queryByText('API Keys · /api-keys')).not.toBeInTheDocument()
    expect(within(bridge).queryByText('审计日志 · /admin/audit')).not.toBeInTheDocument()
    expect(within(bridge).queryByText('API 文档 · /docs')).not.toBeInTheDocument()
    const fallbackCard = screen.getByTestId('admin-risk-shared-console-fallback')
    expect(fallbackCard).toBeInTheDocument()
    expect(within(fallbackCard).getByText('回到推荐工作台继续管理员主链路')).toBeInTheDocument()

    await user.click(within(fallbackCard).getByRole('button', { name: '返回推荐工作台' }))
    const dashboardRouteStub = await screen.findByTestId('admin-risk-route-stub-dashboard')
    expect(within(dashboardRouteStub).getByRole('heading', { name: '控制台总览' })).toBeInTheDocument()
  })

  it('hides the fallback slice when the risk page is the only visible admin route', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 11, email: 'admin@nexus-mail.local', role: 'admin' },
      menu: [{ key: 'admin-risk', label: '风控中心', path: ADMIN_RISK_ROUTE }],
    })

    renderAdminRiskPage()

    expect(await screen.findByRole('heading', { name: '风控中心' })).toBeInTheDocument()
    expect(screen.queryByTestId('admin-risk-shared-console-fallback')).not.toBeInTheDocument()
  })

  it('updates rules and re-fetches risk summary after saving', async () => {
    const user = userEvent.setup()
    renderAdminRiskPage()

    expect(await screen.findByRole('heading', { name: '风控中心' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '保存规则' }))

    expect(mockedUpdateAdminRiskRules).toHaveBeenCalledWith([
      { key: 'api_denied_rate', enabled: true, threshold: 10, window_minutes: 15, severity: 'high', description: 'API Key 异常访问检测', updated_at: '2026-05-02T00:00:00Z' },
      { key: 'high_timeout', enabled: true, threshold: 5, window_minutes: 60, severity: 'medium', description: '高频超时', updated_at: '2026-05-02T00:00:00Z' },
    ])
    expect(mockedGetAdminRisk).toHaveBeenCalledTimes(2)
  })
})
