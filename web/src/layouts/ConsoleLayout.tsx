import { Avatar, Button, Breadcrumb, Layout, Space, Tag, Typography } from '@douyinfe/semi-ui'
import {
  IconActivity,
  IconArticle,
  IconBell,
  IconFile,
  IconHistogram,
  IconTickCircle,
  IconUser,
  IconSafe,
  IconServer,
} from '@douyinfe/semi-icons'
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

const quickActions = [
  {
    path: '/projects',
    label: '项目市场',
    icon: <IconFile />,
    roles: ['user', 'supplier', 'admin'],
  },
  {
    path: '/balance',
    label: '余额中心',
    icon: <IconTickCircle />,
    roles: ['user', 'supplier', 'admin'],
  },
  {
    path: '/admin/risk',
    label: '风控中心',
    icon: <IconSafe />,
    roles: ['admin'],
  },
  {
    path: '/admin/users',
    label: '用户运营',
    icon: <IconUser />,
    roles: ['admin'],
  },
  {
    path: '/admin/audit',
    label: '审计日志',
    icon: <IconActivity />,
    roles: ['admin'],
  },
  {
    path: '/supplier/domains',
    label: '域名管理',
    icon: <IconServer />,
    roles: ['supplier', 'admin'],
  },
  {
    path: '/orders',
    label: '订单中心',
    icon: <IconHistogram />,
    roles: ['user', 'supplier', 'admin'],
  },
  {
    path: '/docs',
    label: 'API 文档',
    icon: <IconArticle />,
    roles: ['user', 'supplier', 'admin'],
  },
]

function resolveRouteTitle(pathname: string) {
  return routeTitleMap[pathname] ?? titleFromPath(pathname)
}

function roleIntro(role?: string) {
  switch (role) {
    case 'admin':
      return '统一查看运营、风控与审计链路，避免在多个独立后台之间切换。'
    case 'supplier':
      return '在同一控制台内管理域名池、供货规则与结算观察。'
    default:
      return '在共享壳中完成采购、订单追踪、API 接入与回调配置。'
  }
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

  const visibleQuickActions = useMemo(
    () => quickActions.filter((item) => item.roles.includes(user?.role ?? 'user') && item.path !== location.pathname),
    [location.pathname, user?.role],
  )

  return (
    <Layout
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top left, rgba(94, 106, 210, 0.16), transparent 24%), radial-gradient(circle at top right, rgba(113, 112, 255, 0.12), transparent 18%), linear-gradient(180deg, #09090b 0%, #111827 100%)',
      }}
    >
      <Sider
        style={{
          background: 'linear-gradient(180deg, rgba(8, 9, 10, 0.98) 0%, rgba(15, 16, 17, 0.98) 48%, rgba(25, 26, 27, 0.98) 100%)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '16px 0 48px rgba(0, 0, 0, 0.28)',
          position: 'sticky',
          top: 0,
          height: '100vh',
          width: 264,
          flex: '0 0 264px',
          maxWidth: 264,
          minWidth: 264,
          overflow: 'hidden',
        }}
      >
        <AppSidebar />
      </Sider>
      <Layout>
        <Header
          style={{
            background: 'rgba(8, 9, 10, 0.68)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(18px)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 20,
            padding: '18px 28px',
            minHeight: 96,
            height: 'auto',
          }}
        >
          <Space vertical spacing={8} align="start" style={{ flex: 1, minWidth: 0 }}>
            <Breadcrumb routes={breadcrumbRoutes} style={{ color: 'rgba(208,214,224,0.72)' }} />
            <Space spacing={10} align="center" wrap>
              <Typography.Title
                heading={5}
                style={{
                  margin: 0,
                  color: '#f7f8f8',
                  fontWeight: 600,
                  letterSpacing: '-0.18px',
                }}
              >
                {resolveRouteTitle(location.pathname)}
              </Typography.Title>
              <Tag color={roleColor(user?.role)}>{roleLabel(user?.role)}</Tag>
              <Tag color="cyan" prefixIcon={<IconHistogram />}>单一登录后控制台</Tag>
            </Space>
            <Typography.Text style={{ color: 'rgba(208,214,224,0.74)', fontSize: 13, lineHeight: 1.6 }}>
              {roleIntro(user?.role)}
            </Typography.Text>
          </Space>
          <Space align="center" spacing={12} wrap style={{ justifyContent: 'flex-end' }}>
            {visibleQuickActions.slice(0, 3).map((item) => (
              <Button
                key={item.path}
                icon={item.icon}
                theme="borderless"
                style={{
                  color: '#d0d6e0',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10,
                }}
                onClick={() => navigate(item.path)}
              >
                {item.label}
              </Button>
            ))}
            <Space
              align="center"
              spacing={10}
              style={{
                padding: '10px 14px',
                borderRadius: 18,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: 'rgba(0,0,0,0.2) 0px 0px 0px 1px',
              }}
            >
              <Avatar size="small" color="blue">
                {(user?.email?.[0] ?? 'N').toUpperCase()}
              </Avatar>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#f7f8f8' }}>{user?.email ?? '未登录用户'}</div>
                <div style={{ fontSize: 12, color: 'rgba(138,143,152,0.96)' }}>{roleLabel(user?.role)}</div>
              </div>
            </Space>
            <Button
              theme="solid"
              type="primary"
              icon={<IconBell />}
              style={{
                background: '#5e6ad2',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.08)',
              }}
              onClick={onLogout}
            >
              退出登录
            </Button>
          </Space>
        </Header>
        <Content style={{ padding: 28, background: 'transparent' }}>
          <div
            style={{
              minHeight: 'calc(100vh - 156px)',
              borderRadius: 28,
              background: 'linear-gradient(180deg, rgba(15,16,17,0.92) 0%, rgba(25,26,27,0.92) 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: 'rgba(0,0,0,0.28) 0px 16px 48px',
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
