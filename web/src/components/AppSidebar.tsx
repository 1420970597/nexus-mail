import { Nav } from '@douyinfe/semi-ui'
import {
  IconActivity,
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
  docs: <IconSetting />,
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
    )
  }
  base.push({ key: 'docs', label: 'API 文档', path: '/docs' })
  return base
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

  return (
    <div style={{ height: '100%', color: '#fff' }}>
      <div style={{ padding: '20px 16px', fontSize: 20, fontWeight: 700, color: '#fff' }}>Nexus-Mail</div>
      <Nav
        selectedKeys={[location.pathname]}
        style={{ maxWidth: '100%', height: 'calc(100% - 72px)', background: 'transparent' }}
        items={items}
        onSelect={(data) => navigate(String(data.itemKey))}
        footer={{ collapseButton: false }}
      />
    </div>
  )
}
