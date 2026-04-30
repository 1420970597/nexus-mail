import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProfilePage } from './ProfilePage'
import { useAuthStore } from '../store/authStore'
import { API_KEYS_ROUTE, DOCS_ROUTE, ORDERS_ROUTE, PROFILE_ROUTE, PROJECTS_ROUTE, WEBHOOKS_ROUTE } from '../utils/consoleNavigation'

function renderProfilePage(initialEntry = PROFILE_ROUTE) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path={PROFILE_ROUTE} element={<ProfilePage />} />
        <Route path={PROJECTS_ROUTE} element={<div>项目市场页面</div>} />
        <Route path={ORDERS_ROUTE} element={<div>订单中心页面</div>} />
        <Route path={API_KEYS_ROUTE} element={<div>API Keys 页面</div>} />
        <Route path={WEBHOOKS_ROUTE} element={<div>Webhook 设置页面</div>} />
        <Route path={DOCS_ROUTE} element={<div>API 文档页面</div>} />
        <Route path="/supplier/domains" element={<div>域名管理页面</div>} />
        <Route path="/admin/risk" element={<div>风控中心页面</div>} />
        <Route path="/" element={<div>共享控制台首页</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProfilePage', () => {
  afterEach(() => {
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })
  })

  it('renders a user-facing profile mission control shell and shared-console capability cards', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 1, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'projects', label: '项目市场', path: PROJECTS_ROUTE },
        { key: 'orders', label: '订单中心', path: ORDERS_ROUTE },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
        { key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE },
        { key: 'docs', label: 'API 文档', path: DOCS_ROUTE },
        { key: 'profile', label: '个人资料', path: PROFILE_ROUTE },
      ],
    })

    renderProfilePage()

    expect(screen.getByText('Profile Mission Control')).toBeInTheDocument()
    expect(screen.getByText('账号身份、会话边界与下一步操作都在同一套深色共享控制台内完成，不额外拆出角色后台。')).toBeInTheDocument()
    expect(screen.getByText('用户接入焦点')).toBeInTheDocument()
    expect(screen.getByText('控制台桥接能力')).toBeInTheDocument()
    expect(screen.getByText('深色共享账号中枢')).toBeInTheDocument()
    expect(screen.getByText('采购与订单串联')).toBeInTheDocument()
    expect(screen.getByText('集成准备')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '前往 API Keys' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '打开 Webhook 设置' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '打开 API 文档' })).toBeInTheDocument()
    expect(screen.getByText('当前账号默认以用户身份进入共享控制台；如后续被服务端授予供应商或管理员角色，菜单会继续在同一壳内扩展。')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '前往 API Keys' }))
    expect(await screen.findByText('API Keys 页面')).toBeInTheDocument()

    renderProfilePage()
    await user.click(screen.getByRole('button', { name: '打开 Webhook 设置' }))
    expect(await screen.findByText('Webhook 设置页面')).toBeInTheDocument()

    renderProfilePage()
    await user.click(screen.getByRole('button', { name: '打开 API 文档' }))
    expect(await screen.findByText('API 文档页面')).toBeInTheDocument()
  })

  it('renders supplier-facing shared-console role guidance without user procurement copy leakage', () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 8, email: 'supplier@nexus-mail.local', role: 'supplier' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'profile', label: '个人资料', path: PROFILE_ROUTE },
        { key: 'supplier-domains', label: '域名管理', path: '/supplier/domains' },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
      ],
    })

    renderProfilePage()

    expect(screen.getByText('供应商运营焦点')).toBeInTheDocument()
    expect(screen.getByText('供应商角色扩展')).toBeInTheDocument()
    expect(screen.getByText('当前账号已被服务端授予供应商角色；供给链路仍然挂载在同一套共享控制台内，不切换独立后台。')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '返回共享工作台' })).toBeInTheDocument()
    expect(screen.queryByText('采购与订单串联')).not.toBeInTheDocument()
  })

  it('renders admin-facing shared-console role guidance without user procurement copy leakage', () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 9, email: 'admin@nexus-mail.local', role: 'admin' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'profile', label: '个人资料', path: PROFILE_ROUTE },
        { key: 'admin-risk', label: '风控中心', path: '/admin/risk' },
      ],
    })

    renderProfilePage()

    expect(screen.getByText('管理员运营焦点')).toBeInTheDocument()
    expect(screen.getByText('管理员角色扩展')).toBeInTheDocument()
    expect(screen.getByText('当前账号已被服务端授予管理员角色；高危运营、风控与审计动作继续在同一套共享控制台内完成。')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '返回共享工作台' })).toBeInTheDocument()
    expect(screen.queryByText('采购与订单串联')).not.toBeInTheDocument()
  })
})
