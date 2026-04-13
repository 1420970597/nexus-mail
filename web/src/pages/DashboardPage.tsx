import { Banner, Card, Col, Row, Typography } from '@douyinfe/semi-ui'
import { useEffect, useState } from 'react'
import { getDashboardOverview } from '../services/auth'
import { useAuthStore } from '../store/authStore'

export function DashboardPage() {
  const { user } = useAuthStore()
  const [message, setMessage] = useState('正在加载概览数据...')

  useEffect(() => {
    getDashboardOverview()
      .then((res) => setMessage(String(res.message)))
      .catch(() => setMessage('本地演示概览已就绪'))
  }, [])

  return (
    <div>
      <Banner
        fullMode={false}
        type="info"
        title={`欢迎回来，${user?.email ?? '访客'}`}
        description={message}
        style={{ marginBottom: 16 }}
      />
      <Typography.Title heading={3}>控制台总览</Typography.Title>
      <Row gutter={16}>
        <Col span={8}><Card title="当前角色">{user?.role ?? 'guest'}</Card></Col>
        <Col span={8}><Card title="架构状态">共享控制台 + 角色菜单已启用</Card></Col>
        <Col span={8}><Card title="当前阶段">Phase 1 鉴权与权限骨架</Card></Col>
      </Row>
    </div>
  )
}
