import { Layout } from '@douyinfe/semi-ui'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppSidebar } from './components/AppSidebar'
import { DashboardPage } from './pages/DashboardPage'

const { Sider, Content, Header } = Layout

export default function App() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider style={{ background: '#111827' }}>
        <AppSidebar />
      </Sider>
      <Layout>
        <Header style={{ background: '#ffffff', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Nexus-Mail 控制台</div>
        </Header>
        <Content style={{ padding: 24, background: '#f8fafc' }}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}
