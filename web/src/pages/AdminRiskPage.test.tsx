import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminRiskPage } from './AdminRiskPage'
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
        <Route path={ADMIN_AUDIT_ROUTE} element={<div>审计日志页面</div>} />
        <Route path={ADMIN_USERS_ROUTE} element={<div>资金工作台页面</div>} />
        <Route path={API_KEYS_ROUTE} element={<div>API Keys 页面</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminRiskPage', () => {
  beforeEach(() => {
    mockedGetAdminRisk.mockReset()
    mockedGetAdminRiskRules.mockReset()
    mockedUpdateAdminRiskRules.mockReset()

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

    expect(await screen.findByText('Risk Mission Control')).toBeInTheDocument()
    expect(screen.getByText('风控中心')).toBeInTheDocument()
    expect(screen.getByText(/将真实风险信号、规则编辑、审计回放与高危运营处置统一收敛/)).toBeInTheDocument()
    expect(screen.getByText('高风险信号')).toBeInTheDocument()
    expect(screen.getByText('观察中信号')).toBeInTheDocument()
    expect(screen.getByText('生效规则')).toBeInTheDocument()
    expect(screen.getByText('共享控制台联动')).toBeInTheDocument()
    expect(screen.getByText('管理员主任务流')).toBeInTheDocument()
    expect(screen.getByText('共享接入桥接')).toBeInTheDocument()
    expect(screen.getByText('API Keys · /api-keys')).toBeInTheDocument()
    expect(screen.getByText('审计日志 · /admin/audit')).toBeInTheDocument()
    expect(screen.getByText('API 文档 · /docs')).toBeInTheDocument()
    expect(screen.getAllByText('高风险').length).toBeGreaterThan(0)
    expect(screen.getByText('规则命中概览')).toBeInTheDocument()
    expect(screen.getByText('处置建议')).toBeInTheDocument()
  })

  it('navigates from mission-control actions to audit, finance, and api key pages', async () => {
    const user = userEvent.setup()
    renderAdminRiskPage()

    expect(await screen.findByText('Risk Mission Control')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '查看审计日志' }))
    expect(await screen.findByText('审计日志页面')).toBeInTheDocument()

    renderAdminRiskPage()
    expect(await screen.findByText('Risk Mission Control')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '打开资金工作台' }))
    expect(await screen.findByText('资金工作台页面')).toBeInTheDocument()

    renderAdminRiskPage()
    expect(await screen.findByText('Risk Mission Control')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '打开 API Keys' }))
    expect(await screen.findByText('API Keys 页面')).toBeInTheDocument()
  })

  it('updates rules and re-fetches risk summary after saving', async () => {
    const user = userEvent.setup()
    renderAdminRiskPage()

    expect(await screen.findByText('Risk Mission Control')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '保存规则' }))

    expect(mockedUpdateAdminRiskRules).toHaveBeenCalledWith([
      { key: 'api_denied_rate', enabled: true, threshold: 10, window_minutes: 15, severity: 'high', description: 'API Key 异常访问检测', updated_at: '2026-05-02T00:00:00Z' },
      { key: 'high_timeout', enabled: true, threshold: 5, window_minutes: 60, severity: 'medium', description: '高频超时', updated_at: '2026-05-02T00:00:00Z' },
    ])
    expect(mockedGetAdminRisk).toHaveBeenCalledTimes(2)
  })
})
