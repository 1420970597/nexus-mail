import '@testing-library/jest-dom'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { SettingsPage } from './SettingsPage'
import { useAuthStore } from '../store/authStore'
import { userFirstRunStorageKeyForUser } from './DashboardPage'
import { API_KEYS_ROUTE, ORDERS_ROUTE, PROJECTS_ROUTE } from '../utils/consoleNavigation'

function renderSettingsPage(initialEntry = '/settings') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<div>共享控制台首页</div>} />
        <Route path={PROJECTS_ROUTE} element={<div>项目市场页面</div>} />
        <Route path={ORDERS_ROUTE} element={<div>订单中心页面</div>} />
        <Route path={API_KEYS_ROUTE} element={<div>API Keys 页面</div>} />
        <Route path="/supplier/resources" element={<div>供应商资源页面</div>} />
        <Route path="/supplier/settlements" element={<div>供应商结算页面</div>} />
        <Route path="/settings" element={<SettingsPage />} />
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
        { key: 'settings', label: '设置中心', path: '/settings' },
      ],
    })

    renderSettingsPage()

    expect(await screen.findByText('首次使用清单')).toBeInTheDocument()
    expect(screen.getByText('新注册普通用户建议先完成项目市场、订单中心与 API 接入三步；供应商 / 管理员能力会在后续角色扩展时出现在同一套共享控制台内。')).toBeInTheDocument()

    const checklistCard = screen.getByText('首次使用清单').closest('.semi-card')
    expect(checklistCard).not.toBeNull()
    const checklistScope = within(checklistCard as HTMLElement)

    await user.click(checklistScope.getByRole('button', { name: '打开项目市场' }))
    expect(await screen.findByText('项目市场页面')).toBeInTheDocument()

    renderSettingsPage()
    const checklistCardAgain = await screen.findByText('首次使用清单')
    const checklistScopeAgain = within(checklistCardAgain.closest('.semi-card') as HTMLElement)
    expect(checklistScopeAgain.getByRole('button', { name: '查看订单中心' })).toBeInTheDocument()
    expect(checklistScopeAgain.getByRole('button', { name: '管理 API Keys' })).toBeInTheDocument()

    const checklistButtons = checklistScopeAgain.getAllByRole('button')
    const reopenButton = checklistButtons.find((button) => button.textContent?.includes('重新打开首轮引导'))
    expect(reopenButton).toBeDefined()
    await user.click(reopenButton as HTMLButtonElement)

    expect(window.localStorage.getItem(userFirstRunStorageKeyForUser(11))).toBe('false')
    expect(await screen.findByText('共享控制台首页')).toBeInTheDocument()
    expect(screen.queryByText('供应商资源页面')).not.toBeInTheDocument()
    expect(screen.queryByText('供应商结算页面')).not.toBeInTheDocument()
  })

  it('hides the first-run checklist for supplier users while keeping shared shortcuts', async () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 12, email: 'supplier@nexus-mail.local', role: 'supplier' },
      menu: [
        { key: 'profile', label: '个人资料', path: '/profile' },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
        { key: 'webhooks', label: 'Webhook 设置', path: '/webhooks' },
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
