import { Nav, Tag, Typography } from '@douyinfe/semi-ui'
import {
  IconActivity,
  IconArticle,
  IconBolt,
  IconComponent,
  IconHome,
  IconPriceTag,
  IconSafe,
  IconServer,
  IconSetting,
  IconUser,
} from '@douyinfe/semi-icons'
import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MenuItem, useAuthStore } from '../store/authStore'

const iconMap: Record<string, JSX.Element> = {
  dashboard: <IconHome />,
  projects: <IconComponent />,
  orders: <IconActivity />,
  balance: <IconPriceTag />,
  profile: <IconUser />,
  'api-keys': <IconSafe />,
  webhooks: <IconBolt />,
  settings: <IconSetting />,
  'supplier-domains': <IconServer />,
  'supplier-resources': <IconPriceTag />,
  'supplier-offerings': <IconBolt />,
  'supplier-settlements': <IconActivity />,
  'admin-users': <IconUser />,
  'admin-suppliers': <IconServer />,
  'admin-pricing': <IconPriceTag />,
  'admin-risk': <IconSafe />,
  'admin-audit': <IconActivity />,
  docs: <IconArticle />,
}

function fallbackMenu(role?: string): MenuItem[] {
  const base: MenuItem[] = [
    { key: 'dashboard', label: '仪表盘', path: '/' },
    { key: 'projects', label: '项目市场', path: '/projects' },
    { key: 'orders', label: '订单中心', path: '/orders' },
    { key: 'balance', label: '余额中心', path: '/balance' },
    { key: 'profile', label: '个人资料', path: '/profile' },
    { key: 'api-keys', label: 'API Keys', path: '/api-keys' },
    { key: 'settings', label: '设置中心', path: '/settings' },
  ]
  if (role === 'supplier' || role === 'admin') {
    base.push(
      { key: 'supplier-domains', label: '域名管理', path: '/supplier/domains' },
      { key: 'supplier-resources', label: '供应商资源', path: '/supplier/resources' },
      { key: 'supplier-offerings', label: '供货规则', path: '/supplier/offerings' },
      { key: 'supplier-settlements', label: '供应商结算', path: '/supplier/settlements' },
    )
  }
  if (role === 'admin') {
    base.push(
      { key: 'admin-users', label: '用户管理', path: '/admin/users' },
      { key: 'admin-suppliers', label: '供应商管理', path: '/admin/suppliers' },
      { key: 'admin-pricing', label: '价格策略', path: '/admin/pricing' },
      { key: 'admin-risk', label: '风控中心', path: '/admin/risk' },
      { key: 'admin-audit', label: '审计日志', path: '/admin/audit' },
      { key: 'webhooks', label: 'Webhook 设置', path: '/webhooks' },
    )
  }
  base.push({ key: 'docs', label: 'API 文档', path: '/docs' })
  return base
}

function roleMeta(role?: string) {
  switch (role) {
    case 'admin':
      return { label: '管理员', color: 'red' as const, description: '风控 / 审计 / 运营配置' }
    case 'supplier':
      return { label: '供应商', color: 'green' as const, description: '资源供给 / 供货规则 / 结算' }
    default:
      return { label: '用户', color: 'blue' as const, description: '采购 / API 接入 / Webhook' }
  }
}

export function AppSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, menu } = useAuthStore()

  const items = useMemo(() => {
    const source = menu.length > 0 ? menu : fallbackMenu(user?.role)
    return source.map((item) => ({
      itemKey: item.path,
      text: item.label,
      icon: iconMap[item.key] ?? <IconSetting />,
    }))
  }, [menu, user?.role])

  const meta = roleMeta(user?.role)

  return (
    <div style={{ height: '100%', color: '#fff', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '24px 18px 18px' }}>
        <Typography.Title heading={4} style={{ color: '#f8fafc', margin: 0 }}>
          Nexus-Mail
        </Typography.Title>
        <Typography.Text style={{ color: 'rgba(226,232,240,0.72)' }}>Shared Console</Typography.Text>
        <div style={{ marginTop: 14 }}>
          <Tag color={meta.color}>{meta.label}</Tag>
        </div>
        <Typography.Paragraph style={{ color: 'rgba(226,232,240,0.72)', marginTop: 12, marginBottom: 0, fontSize: 12, lineHeight: 1.6 }}>
          {meta.description}
        </Typography.Paragraph>
      </div>
      <Nav
        selectedKeys={[location.pathname]}
        style={{ maxWidth: '100%', flex: 1, background: 'transparent' }}
        items={items}
        onSelect={(data) => navigate(String(data.itemKey))}
        footer={{ collapseButton: false }}
      />
      <div style={{ padding: '0 18px 18px', color: 'rgba(148,163,184,0.88)', fontSize: 12 }}>
        单一登录后控制台 · 按角色扩展菜单
      </div>
    </div>
  )
}
