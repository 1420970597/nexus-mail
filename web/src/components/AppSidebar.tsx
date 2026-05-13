import { Nav, Space, Tag, Typography } from '@douyinfe/semi-ui'
import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { groupedConsolePaths, hasMenuPath, resolveRouteDefinition, resolveRouteTitle } from '../utils/consoleNavigation'
import { MenuItem, useAuthStore } from '../store/authStore'

export const SHARED_CONSOLE_MENU_LOADING_LABEL = '正在同步服务端菜单权限...'

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
  const groups = groupedConsolePaths()
  const userItems = source.filter((item) => groups.shared.includes(item.path))
  const supplierItems = source.filter((item) => groups.supplier.includes(item.path))
  const adminItems = source.filter((item) => groups.admin.includes(item.path))
  return { userItems, supplierItems, adminItems }
}

function integrationBridgeStatus(source: MenuItem[]) {
  const hasApiKeys = hasMenuPath(source, '/api-keys')
  const hasWebhooks = hasMenuPath(source, '/webhooks')
  const hasDocs = hasMenuPath(source, '/docs')
  if (hasApiKeys && hasWebhooks && hasDocs) {
    return '已连通'
  }
  if (hasApiKeys || hasWebhooks || hasDocs) {
    return '部分开放'
  }
  return '待开放'
}

function toNavItems(items: MenuItem[], role?: string) {
  return items.map((item) => ({
    itemKey: item.path,
    text: resolveRouteTitle(item.path, role),
    icon: resolveRouteDefinition(item.path)?.icon,
  }))
}

export function AppSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, menu } = useAuthStore()

  const menuReady = menu.length > 0
  const { userItems, supplierItems, adminItems } = useMemo(() => groupedMenu(menu), [menu])
  const meta = roleMeta(user?.role)
  const topologyItems = useMemo(
    () => [
      { key: 'shared', label: '共享菜单', value: String(userItems.length) },
      { key: 'role', label: '角色工作区', value: String(supplierItems.length + adminItems.length) },
      { key: 'bridge', label: '接入桥接', value: integrationBridgeStatus(menu) },
    ],
    [adminItems.length, menu, supplierItems.length, userItems.length],
  )

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
            Nexus-Mail · 统一控制台
          </Tag>
          <Typography.Title
            heading={4}
            style={{ color: '#f7f8f8', margin: 0, letterSpacing: '-0.24px', fontWeight: 600 }}
          >
            Nexus-Mail
          </Typography.Title>
          <Typography.Text style={{ color: 'rgba(208,214,224,0.74)' }}>单一登录 · 按角色切换工作区</Typography.Text>
          <div data-testid="app-sidebar-role-summary" role="region" aria-label="当前角色摘要" style={{ width: '100%' }}>
            <Space spacing={8} align="center" wrap>
              <Tag color={meta.color}>{meta.label}</Tag>
              <Tag color="grey">{meta.pill}</Tag>
            </Space>
            <Typography.Title
              heading={6}
              style={{ color: '#f7f8f8', margin: '10px 0 4px', fontSize: 12, letterSpacing: '0.02em' }}
            >
              当前角色摘要
            </Typography.Title>
            <Typography.Paragraph
              style={{ color: 'rgba(138,143,152,0.96)', marginBottom: 0, fontSize: 12, lineHeight: 1.7 }}
            >
              {meta.description}
            </Typography.Paragraph>
          </div>
          <div
            data-testid="app-sidebar-workspace-topology"
            role="region"
            aria-label="控制台拓扑"
            style={{
              width: '100%',
              borderRadius: 16,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.02) 100%)',
              border: '1px solid rgba(255,255,255,0.06)',
              padding: '14px 14px 12px',
            }}
          >
            <Typography.Title
              heading={6}
              style={{ color: '#f7f8f8', margin: '0 0 10px', fontSize: 12, letterSpacing: '0.01em' }}
            >
              控制台拓扑
            </Typography.Title>
            <div
              style={{
                marginTop: 10,
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 8,
              }}
            >
              {topologyItems.map((item) => (
                <div
                  key={item.key}
                  style={{
                    borderRadius: 12,
                    background: 'rgba(8,9,10,0.64)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    padding: '10px 10px 9px',
                  }}
                >
                  <div style={{ color: 'rgba(138,143,152,0.92)', fontSize: 11, lineHeight: 1.4 }}>{item.label}</div>
                  <div style={{ color: '#f7f8f8', fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>{`${item.label} ${item.value}`}</div>
                </div>
              ))}
            </div>
          </div>
        </Space>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 0' }}>
        {menuReady ? (
          <>
            <SidebarGroup
              testId="app-sidebar-shared-group"
              title="基础工作台"
              description="所有角色共享的采购、订单与集成入口"
              selectedPath={location.pathname}
              items={userItems}
              role={user?.role}
              navigate={navigate}
            />
            {supplierItems.length > 0 ? (
              <SidebarGroup
                testId="app-sidebar-supplier-group"
                title="供应商扩展"
                description="域名池、资源供给、供货规则与结算闭环"
                selectedPath={location.pathname}
                items={supplierItems}
                role={user?.role}
                navigate={navigate}
              />
            ) : null}
            {adminItems.length > 0 ? (
              <SidebarGroup
                testId="app-sidebar-admin-group"
                title="管理员扩展"
                description="用户运营、供应商经营、风控审计与 Webhook"
                selectedPath={location.pathname}
                items={adminItems}
                role={user?.role}
                navigate={navigate}
              />
            ) : null}
          </>
        ) : (
          <div
            data-testid="app-sidebar-loading-card"
            style={{
              marginBottom: 14,
              borderRadius: 16,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              padding: '16px 14px',
            }}
          >
            <Typography.Text style={{ color: '#f7f8f8', fontWeight: 600, fontSize: 13 }}>
              共享菜单加载中
            </Typography.Text>
            <Typography.Paragraph style={{ color: 'rgba(138,143,152,0.9)', margin: '8px 0 0', fontSize: 12, lineHeight: 1.6 }}>
              {SHARED_CONSOLE_MENU_LOADING_LABEL}
            </Typography.Paragraph>
          </div>
        )}
      </div>

      <div style={{ padding: '14px 18px 18px', color: 'rgba(138,143,152,0.96)', fontSize: 12, lineHeight: 1.7 }}>
        单一登录后控制台 · 共享布局骨架 · 按角色差异化菜单与页面
      </div>
    </div>
  )
}

function SidebarGroup({
  testId,
  title,
  description,
  items,
  selectedPath,
  role,
  navigate,
}: {
  testId?: string
  title: string
  description: string
  items: MenuItem[]
  selectedPath: string
  role?: string
  navigate: (path: string) => void
}) {
  if (items.length === 0) {
    return null
  }

  return (
    <div
      data-testid={testId}
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
        items={toNavItems(items, role)}
        onSelect={(data) => navigate(String(data.itemKey))}
        footer={{ collapseButton: false }}
      />
    </div>
  )
}
