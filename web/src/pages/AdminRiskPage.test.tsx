import '@testing-library/jest-dom'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminRiskPage } from './AdminRiskPage'
import { useAuthStore } from '../store/authStore'
import { ADMIN_AUDIT_ROUTE, ADMIN_RISK_ROUTE, ADMIN_USERS_ROUTE, API_KEYS_ROUTE, DOCS_ROUTE } from '../utils/consoleNavigation'

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
          element={<section data-testid="admin-risk-route-stub-api-keys"><h1>开发者 API 接入工作台</h1></section>}
        />
        <Route
          path={DOCS_ROUTE}
          element={<section data-testid="admin-risk-route-stub-docs"><h1>API 文档与接入控制台</h1></section>}
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

  it('renders risk mission control shell with shared-console guidance and CTA bridge contracts', async () => {
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
    expect(within(missionSignals).getByText('共享接入桥接')).toBeInTheDocument()
    expect(within(missionSignals).queryByText('共享控制台联动')).not.toBeInTheDocument()

    const missionFlow = screen.getByTestId('admin-risk-mission-flow')
    expect(within(missionFlow).getByText('管理员主任务流')).toBeInTheDocument()

    const bridge = screen.getByTestId('admin-risk-shared-console-bridge')
    const bridgeLinks = screen.getByTestId('admin-risk-shared-console-links')
    expect(within(bridgeLinks).getByRole('button', { name: /打开 API Keys/ })).toBeInTheDocument()
    expect(within(bridgeLinks).getByRole('button', { name: /继续查看审计/ })).toBeInTheDocument()
    expect(within(bridgeLinks).getByRole('button', { name: /查看 API 文档/ })).toBeInTheDocument()
    expect(within(bridge).getByText('规则调整后，继续用 API Keys、审计日志与 API 文档复核限流、白名单与契约是否同步生效。')).toBeInTheDocument()
    expect(within(bridge).queryByText('调整规则或确认风险后，仍然需要通过同一控制台中的 API Keys、审计日志与 API 文档复盘限流、白名单、作用域和真实接口契约是否一致生效。')).not.toBeInTheDocument()

    const highRiskMetric = screen.getByTestId('admin-risk-high-risk-metric')
    expect(within(highRiskMetric).getByText('高风险')).toBeInTheDocument()

    const overviewCard = screen.getByTestId('admin-risk-overview-card')
    expect(within(overviewCard).getByText('规则命中概览')).toBeInTheDocument()

    const actionsCard = screen.getByTestId('admin-risk-actions-card')
    expect(within(actionsCard).getByText('处置建议')).toBeInTheDocument()
  })

  it('navigates from the shared-console bridge to api keys, audit, and docs destinations', async () => {
    const user = userEvent.setup()
    let view = renderAdminRiskPage()

    expect(await screen.findByRole('heading', { name: '风控中心' })).toBeInTheDocument()

    let bridgeLinks = screen.getByTestId('admin-risk-shared-console-links')
    await user.click(within(bridgeLinks).getByRole('button', { name: /打开 API Keys/ }))
    let apiKeysRouteStub = await screen.findByTestId('admin-risk-route-stub-api-keys')
    expect(within(apiKeysRouteStub).getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()

    view.unmount()
    view = renderAdminRiskPage()
    expect(await screen.findByRole('heading', { name: '风控中心' })).toBeInTheDocument()
    bridgeLinks = screen.getByTestId('admin-risk-shared-console-links')
    await user.click(within(bridgeLinks).getByRole('button', { name: /继续查看审计/ }))
    const auditRouteStub = await screen.findByTestId('admin-risk-route-stub-audit')
    expect(within(auditRouteStub).getByRole('heading', { name: '审计日志' })).toBeInTheDocument()

    view.unmount()
    view = renderAdminRiskPage()
    expect(await screen.findByRole('heading', { name: '风控中心' })).toBeInTheDocument()
    bridgeLinks = screen.getByTestId('admin-risk-shared-console-links')
    await user.click(within(bridgeLinks).getByRole('button', { name: /查看 API 文档/ }))
    const docsRouteStub = await screen.findByTestId('admin-risk-route-stub-docs')
    expect(within(docsRouteStub).getByRole('heading', { name: 'API 文档与接入控制台' })).toBeInTheDocument()
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
    expect(within(apiKeysRouteStub).getByRole('heading', { name: '开发者 API 接入工作台' })).toBeInTheDocument()
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
    const bridgeLinks = screen.getByTestId('admin-risk-shared-console-links')
    expect(within(bridgeLinks).queryByRole('button', { name: /打开 API Keys/ })).not.toBeInTheDocument()
    expect(within(bridgeLinks).queryByRole('button', { name: /继续查看审计/ })).not.toBeInTheDocument()
    expect(within(bridgeLinks).queryByRole('button', { name: /查看 API 文档/ })).not.toBeInTheDocument()
    const fallbackCard = screen.getByTestId('admin-risk-shared-console-fallback')
    expect(fallbackCard).toBeInTheDocument()
    expect(within(fallbackCard).getByText('回到共享工作台继续管理员主链路')).toBeInTheDocument()

    await user.click(within(fallbackCard).getByRole('button', { name: '返回共享工作台' }))
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
