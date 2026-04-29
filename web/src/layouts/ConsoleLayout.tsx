import { Avatar, Button, Breadcrumb, Layout, Space, Tag, Typography } from '@douyinfe/semi-ui'
import { IconArticle, IconHistogram } from '@douyinfe/semi-icons'
import { ReactNode, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AppSidebar } from '../components/AppSidebar'
import { useAuthStore } from '../store/authStore'

const { Sider, Content, Header } = Layout

interface ConsoleLayoutProps {
  children: ReactNode
  onLogout: () => void
}

function roleLabel(role?: string) {
  switch (role) {
    case 'admin':
      return '管理员控制台'
    case 'supplier':
      return '供应商控制台'
    case 'user':
      return '用户控制台'
    default:
      return '共享控制台'
  }
}

function roleColor(role?: string) {
  switch (role) {
    case 'admin':
      return 'red'
    case 'supplier':
      return 'green'
    default:
      return 'blue'
  }
}

function titleFromPath(pathname: string) {
  if (pathname === '/') return '控制台总览'
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return '控制台总览'
  const raw = segments[segments.length - 1]
  return raw
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const routeTitleMap: Record<string, string> = {
  '/': '控制台总览',
  '/projects': '项目市场',
  '/orders': '订单中心',
  '/balance': '余额中心',
  '/profile': '个人资料',
  '/api-keys': 'API Keys',
  '/webhooks': 'Webhook 设置',
  '/settings': '设置中心',
  '/supplier/domains': '域名管理',
  '/supplier/resources': '供应商资源',
  '/supplier/offerings': '供货规则',
  '/supplier/settlements': '供应商结算',
  '/admin/users': '用户管理',
  '/admin/suppliers': '供应商管理',
  '/admin/pricing': '价格策略',
  '/admin/risk': '风控中心',
  '/admin/audit': '审计日志',
  '/docs': 'API 文档',
}

function resolveRouteTitle(pathname: string) {
  return routeTitleMap[pathname] ?? titleFromPath(pathname)
}

export function ConsoleLayout({ children, onLogout }: ConsoleLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const breadcrumbRoutes = useMemo(() => {
    const segments = location.pathname.split('/').filter(Boolean)
    const items = [{ path: '/', name: '控制台' }]
    let current = ''
    for (const segment of segments) {
      current += `/${segment}`
      items.push({ path: current, name: resolveRouteTitle(current) })
    }
    return items
  }, [location.pathname])

  return (
    <Layout
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%)',
      }}
    >
      <Sider
        style={{
          background: 'linear-gradient(180deg, #0f172a 0%, #111827 52%, #172554 100%)',
          borderRight: '1px solid rgba(148,163,184,0.12)',
          boxShadow: '8px 0 32px rgba(15, 23, 42, 0.16)',
          position: 'sticky',
          top: 0,
          height: '100vh',
          width: 248,
          flex: '0 0 248px',
          maxWidth: 248,
        }}
      >
        <AppSidebar />
      </Sider>
      <Layout>
        <Header
          style={{
            background: 'rgba(255,255,255,0.76)',
            borderBottom: '1px solid rgba(148,163,184,0.16)',
            backdropFilter: 'blur(18px)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            padding: '0 28px',
            height: 76,
          }}
        >
          <Space vertical spacing={4} align="start">
            <Breadcrumb routes={breadcrumbRoutes} />
            <Space spacing={8} align="center">
              <Typography.Title heading={5} style={{ margin: 0 }}>
                {resolveRouteTitle(location.pathname)}
              </Typography.Title>
              <Tag color={roleColor(user?.role)}>{roleLabel(user?.role)}</Tag>
            </Space>
          </Space>
          <Space align="center" spacing={12}>
            <Tag color="cyan" prefixIcon={<IconHistogram />}>单一登录后控制台</Tag>
            <Button theme="borderless" icon={<IconArticle />} onClick={() => navigate('/docs')}>
              使用说明
            </Button>
            <Space
              align="center"
              spacing={10}
              style={{
                padding: '8px 12px',
                borderRadius: 18,
                background: 'rgba(255,255,255,0.88)',
                border: '1px solid rgba(148,163,184,0.18)',
              }}
            >
              <Avatar size="small" color="blue">
                {(user?.email?.[0] ?? 'N').toUpperCase()}
              </Avatar>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{user?.email ?? '未登录用户'}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{roleLabel(user?.role)}</div>
              </div>
            </Space>
            <Button onClick={onLogout}>退出登录</Button>
          </Space>
        </Header>
        <Content style={{ padding: 28, background: 'transparent' }}>
          <div
            style={{
              minHeight: 'calc(100vh - 132px)',
              borderRadius: 28,
              background: 'rgba(255,255,255,0.76)',
              border: '1px solid rgba(148,163,184,0.12)',
              boxShadow: '0 22px 60px rgba(15, 23, 42, 0.08)',
              padding: 24,
            }}
          >
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}
