import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProfilePage } from './ProfilePage'
import { useAuthStore } from '../store/authStore'
import { API_KEYS_ROUTE, PROJECTS_ROUTE } from '../utils/consoleNavigation'

describe('ProfilePage', () => {
  afterEach(() => {
    useAuthStore.setState({ token: null, refreshToken: null, user: null, menu: [] })
  })

  it('renders user-facing shared-console next actions from profile', async () => {
    const user = userEvent.setup()
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 1, email: 'user@nexus-mail.local', role: 'user' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'projects', label: '项目市场', path: PROJECTS_ROUTE },
        { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE },
        { key: 'profile', label: '个人资料', path: '/profile' },
      ],
    })

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <Routes>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path={PROJECTS_ROUTE} element={<div>项目市场页面</div>} />
          <Route path={API_KEYS_ROUTE} element={<div>API Keys 页面</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('用户接入焦点')).toBeInTheDocument()
    expect(screen.getByText('同一控制台内的下一步')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '打开项目市场' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '打开 API Keys' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '打开域名管理' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '打开风控中心' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '打开 API Keys' }))
    expect(await screen.findByText('API Keys 页面')).toBeInTheDocument()

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <Routes>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path={PROJECTS_ROUTE} element={<div>项目市场页面</div>} />
          <Route path={API_KEYS_ROUTE} element={<div>API Keys 页面</div>} />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(screen.getAllByRole('button', { name: '前往项目市场' })[0])
    expect(await screen.findByText('项目市场页面')).toBeInTheDocument()
  })

  it('renders admin-facing shared-console next actions from profile', () => {
    useAuthStore.setState({
      token: 'token',
      refreshToken: 'refresh-token',
      user: { id: 9, email: 'admin@nexus-mail.local', role: 'admin' },
      menu: [
        { key: 'dashboard', label: '仪表盘', path: '/' },
        { key: 'profile', label: '个人资料', path: '/profile' },
        { key: 'admin-risk', label: '风控中心', path: '/admin/risk' },
      ],
    })

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    )

    expect(screen.getByText('管理员运营焦点')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '打开风控中心' })).toBeInTheDocument()
  })
})
