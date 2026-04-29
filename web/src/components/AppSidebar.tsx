import { Nav, Space, Tag, Typography } from '@douyinfe/semi-ui'
import {
  IconActivity,
  IconArticle,
  IconBolt,
  IconComponent,
  IconHome,
  IconHistogram,
  IconPriceTag,
  IconSafe,
  IconSetting,
  IconServer,
  IconUser,
} from '@douyinfe/semi-icons'
import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MenuItem, useAuthStore } from '../store/authStore'

const iconMap: Record<string, JSX.Element> = {
  dashboard: <IconHome />,
  projects: <IconComponent />,
  orders: <IconHistogram />,
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
      return { label: '管理员', color: 'red' as const, description: '风控 / 审计 / 运营配置', pill: '运营指挥台' }
    case 'supplier':
      return { label: '供应商', color: 'green' as const, description: '资源供给 / 供货规则 / 结算', pill: '供给运营台' }
    default:
      return { label: '用户', color: 'blue' as const, description: '采购 / API 接入 / Webhook', pill: '采购接入台' }
  }
}

function groupedMenu(source: MenuItem[]) {
  const userItems = source.filter((item) => ['/','/projects','/orders','/balance','/profile','/api-keys','/settings','/docs'].includes(item.path))
  const supplierItems = source.filter((item) => item.path.startsWith('/supplier/'))
  const adminItems = source.filter((item) => item.path.startsWith('/admin/') || item.path === '/webhooks')
  return { userItems, supplierItems, adminItems }
}

function toNavItems(items: MenuItem[]) {
  return items.map((item) => ({
    itemKey: item.path,
    text: item.label,
    icon: iconMap[item.key] ?? <IconSetting />,
  }))
}

export function AppSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, menu } = useAuthStore()

  const source = useMemo(() => (menu.length > 0 ? menu : fallbackMenu(user?.role)), [menu, user?.role])
  const { userItems, supplierItems, adminItems } = useMemo(() => groupedMenu(source), [source])
  const meta = roleMeta(user?.role)

  return (
    <div style={{ height: '100%', color: '#fff', display: 'flex', flexDirection: 'column', background: 'transparent' }}>
      <div style={{ padding: '24px 18px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Space vertical spacing={8} align="start" style={{ width: '100%' }}>
          <Tag
            shape="circle"
            color="cyan"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#d0d6e0',
            }}
          >
            Nexus-Mail · Shared Console
          </Tag>
          <Typography.Title
            heading={4}
            style={{ color: '#f7f8f8', margin: 0, letterSpacing: '-0.24px', fontWeight: 600 }}
          >
            Nexus-Mail
          </Typography.Title>
          <Typography.Text style={{ color: 'rgba(208,214,224,0.74)' }}>Single login, multi-role workspace</Typography.Text>
          <Space spacing={8} align="center" wrap>
            <Tag color={meta.color}>{meta.label}</Tag>
            <Tag color="grey">{meta.pill}</Tag>
          </Space>
          <Typography.Paragraph
            style={{ color: 'rgba(138,143,152,0.96)', marginBottom: 0, fontSize: 12, lineHeight: 1.7 }}
          >
            {meta.description}
          </Typography.Paragraph>
        </Space>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 0' }}>
        <SidebarGroup
          title="基础工作台"
          description="所有角色共享的采购、订单与集成入口"
          selectedPath={location.pathname}
          items={userItems}
          navigate={navigate}
        />
        {supplierItems.length > 0 ? (
          <SidebarGroup
            title="供应商扩展"
            description="域名池、资源供给、供货规则与结算闭环"
            selectedPath={location.pathname}
            items={supplierItems}
            navigate={navigate}
          />
        ) : null}
        {adminItems.length > 0 ? (
          <SidebarGroup
            title="管理员扩展"
            description="用户运营、供应商经营、风控审计与 Webhook"
            selectedPath={location.pathname}
            items={adminItems}
            navigate={navigate}
          />
        ) : null}
      </div>

      <div style={{ padding: '14px 18px 18px', color: 'rgba(138,143,152,0.96)', fontSize: 12, lineHeight: 1.7 }}>
        单一登录后控制台 · 共享布局骨架 · 按角色差异化菜单与页面
      </div>
    </div>
  )
}

function SidebarGroup({
  title,
  description,
  items,
  selectedPath,
  navigate,
}: {
  title: string
  description: string
  items: MenuItem[]
  selectedPath: string
  navigate: (path: string) => void
}) {
  if (items.length === 0) {
    return null
  }

  return (
    <div
      style={{
        marginBottom: 14,
        borderRadius: 16,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '12px 14px 6px' }}>
        <Typography.Text style={{ color: '#f7f8f8', fontWeight: 600, fontSize: 13 }}>{title}</Typography.Text>
        <Typography.Paragraph style={{ color: 'rgba(138,143,152,0.9)', margin: '6px 0 0', fontSize: 12, lineHeight: 1.6 }}>
          {description}
        </Typography.Paragraph>
      </div>
      <Nav
        selectedKeys={[selectedPath]}
        style={{ maxWidth: '100%', flex: 1, background: 'transparent' }}
        items={toNavItems(items)}
        onSelect={(data) => navigate(String(data.itemKey))}
        footer={{ collapseButton: false }}
      />
    </div>
  )
}
