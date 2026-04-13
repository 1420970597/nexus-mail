import { Nav } from '@douyinfe/semi-ui'
import {
  IconHome,
  IconSetting,
  IconUser,
  IconActivity,
} from '@douyinfe/semi-icons'

export function AppSidebar() {
  return (
    <div style={{ height: '100%', color: '#fff' }}>
      <div style={{ padding: '20px 16px', fontSize: 20, fontWeight: 700, color: '#fff' }}>Nexus-Mail</div>
      <Nav
        style={{ maxWidth: '100%', height: 'calc(100% - 72px)', background: 'transparent' }}
        defaultSelectedKeys={['dashboard']}
        items={[
          { itemKey: 'dashboard', text: '仪表盘', icon: <IconHome /> },
          { itemKey: 'orders', text: '订单中心', icon: <IconActivity /> },
          { itemKey: 'suppliers', text: '供应商', icon: <IconUser /> },
          { itemKey: 'settings', text: '系统设置', icon: <IconSetting /> },
        ]}
        footer={{ collapseButton: false }}
      />
    </div>
  )
}
