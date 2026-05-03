import '@testing-library/jest-dom'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { SettingsPage } from './SettingsPage'
import { useAuthStore } from '../store/authStore'
import { userFirstRunStorageKeyForUser } from './DashboardPage'
import { API_KEYS_ROUTE, DOCS_ROUTE, ORDERS_ROUTE, PROFILE_ROUTE, PROJECTS_ROUTE, SETTINGS_ROUTE, WEBHOOKS_ROUTE } from '../utils/consoleNavigation'

function getButtonByLabel(scope: ReturnType<typeof within>, label: string) {
  const button = scope.getByRole('button', { name: new RegExp(label) })
  expect(button).toBeInTheDocument()
  return button
}

function renderSettingsPage(initialEntry = SETTINGS_ROUTE) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<div>共享控制台首页</div>} />
        <Route path={PROJECTS_ROUTE} element={<div>项目市场页面</div>} />
        <Route path={ORDERS_ROUTE} element={<div>订单中心页面</div>} />
        <Route path={API_KEYS_ROUTE} element={<div>API Keys 页面</div>} />
        <Route path={DOCS_ROUTE} element={<div>API 文档页面</div>} />
        <Route path={PROFILE_ROUTE} element={<div>个人资料页面</div>} />
        <Route path={WEBHOOKS_ROUTE} element={<div>Webhook 设置页面</div>} />
        <Route path="/supplier/resources" element={<div>供应商资源页面</div>} />
        <Route path="/supplier/settlements" element={<div>供应商结算页面</div>} />
        <Route path={SETTINGS_ROUTE} element={<SettingsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SettingsPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('shows the user first-run checklist only for plain users and reopens onboarding inside the same shared console', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 11, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'projects', label: '项目市场', path: PROJECTS_ROUTE },
        { key: 'orders', label: '订单中心', path: ORDERS_ROUTE },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
        { key: 'settings', label: '设置中心', path: SETTINGS_ROUTE },
      ],
    })

    renderSettingsPage()

    expect(await screen.findByText('首次使用清单')).toBeInTheDocument()
    expect(screen.getByText('新注册普通用户建议先完成项目市场、订单中心与 API 接入三步；供应商 / 管理员能力会在后续角色扩展时出现在同一套共享控制台内。')).toBeInTheDocument()

    const checklistCard = screen.getByTestId('settings-user-first-run-checklist')
    const checklistScope = within(checklistCard)

    await user.click(checklistScope.getByRole('button', { name: '打开项目市场' }))
    expect(await screen.findByText('项目市场页面')).toBeInTheDocument()

    renderSettingsPage()
    const checklistCardAgain = await screen.findByTestId('settings-user-first-run-checklist')
    const checklistScopeAgain = within(checklistCardAgain)
    expect(checklistScopeAgain.getByRole('button', { name: '查看订单中心' })).toBeInTheDocument()
    expect(checklistScopeAgain.getByRole('button', { name: '管理 API Keys' })).toBeInTheDocument()

    await user.click(getButtonByLabel(checklistScopeAgain, '重新打开首轮引导'))

    expect(window.localStorage.getItem(userFirstRunStorageKeyForUser(11))).toBe('false')
    expect(await screen.findByText('共享控制台首页')).toBeInTheDocument()
    expect(screen.queryByText('供应商资源页面')).not.toBeInTheDocument()
    expect(screen.queryByText('供应商结算页面')).not.toBeInTheDocument()
  })

  it('renders a dark shared-console control center with canonical navigation links for regular users', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 21, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'projects', label: '项目市场', path: PROJECTS_ROUTE },
        { key: 'orders', label: '订单中心', path: ORDERS_ROUTE },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
        { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
        { key: 'docs', label: 'API 文档', path: DOCS_ROUTE },
        { key: 'profile', label: '个人资料', path: PROFILE_ROUTE },
        { key: 'settings', label: '设置中心', path: SETTINGS_ROUTE },
      ],
    })

    renderSettingsPage()

    expect(await screen.findByText('Console Mission Control')).toBeInTheDocument()
    expect(screen.getByText('接入与账户设置不再停留在浅色占位页，而是收敛为与仪表盘一致的深色共享控制台工作台。')).toBeInTheDocument()
    expect(screen.getByTestId('settings-mission-cards')).toBeInTheDocument()
    expect(screen.getByText('控制台能力矩阵')).toBeInTheDocument()
    expect(screen.getByText('深色共享工作台')).toBeInTheDocument()
    expect(screen.getAllByText('注册后连续路径').length).toBeGreaterThan(0)
    expect(screen.getByText('Docs / Webhooks / API Keys 已统一到单一壳内导航。')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /打开 API 文档/ })).toBeInTheDocument()
    const missionCards = screen.getByTestId('settings-mission-cards')
    expect(within(missionCards).getByRole('button', { name: /打开 Webhook 设置/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /打开 API 文档/ }))
    expect(await screen.findByText('API 文档页面')).toBeInTheDocument()
  })

  it('hides the first-run checklist for supplier users while keeping shared shortcuts', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 12, email: 'supplier@nexus-mail.local', role: 'supplier' },
      menu: [
        { key: 'profile', label: '个人资料', path: PROFILE_ROUTE },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
        { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
        { key: 'docs', label: 'API 文档', path: DOCS_ROUTE },
        { key: 'supplier-resources', label: '供应商资源', path: '/supplier/resources' },
        { key: 'supplier-settlements', label: '供应商结算', path: '/supplier/settlements' },
      ],
    })

    renderSettingsPage()

    expect(await screen.findByText('设置中心')).toBeInTheDocument()
    expect(screen.queryByText('首次使用清单')).not.toBeInTheDocument()
    expect(screen.getByText('控制台运行快捷入口')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '查看供应商资源' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '前往供应商结算' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '管理 API Keys' })).toBeInTheDocument()
  })
})
