import { Button, Layout } from '@douyinfe/semi-ui'
import { ReactNode } from 'react'
import { AppSidebar } from '../components/AppSidebar'
import { useAuthStore } from '../store/authStore'

const { Sider, Content, Header } = Layout

interface ConsoleLayoutProps {
  children: ReactNode
  onLogout: () => void
}

export function ConsoleLayout({ children, onLogout }: ConsoleLayoutProps) {
  const { user } = useAuthStore()

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider style={{ background: '#111827' }}>
        <AppSidebar />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600 }}>Nexus-Mail 控制台</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span>{user?.email}</span>
            <Button onClick={onLogout}>退出登录</Button>
          </div>
        </Header>
        <Content style={{ padding: 24, background: '#f8fafc' }}>{children}</Content>
      </Layout>
    </Layout>
  )
}
