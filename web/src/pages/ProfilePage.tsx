import { Button, Card, Descriptions, Space, Tag, Typography } from '@douyinfe/semi-ui'
import { useAuthStore } from '../store/authStore'

export function ProfilePage() {
  const { user } = useAuthStore()

  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <div>
        <Typography.Title heading={3}>个人资料</Typography.Title>
        <Typography.Paragraph>
          在共享控制台中查看当前账号的基础身份信息、角色状态与后续可扩展的认证设置。
        </Typography.Paragraph>
      </div>

      <Card style={{ width: '100%' }}>
        <Descriptions data={[
          { key: '邮箱', value: user?.email ?? '未登录' },
          { key: '角色', value: <Tag color="blue">{user?.role ?? 'guest'}</Tag> },
          { key: '状态', value: <Tag color="green">活跃</Tag> },
        ]} />
      </Card>

      <Card title="后续规划" style={{ width: '100%' }}>
        <Space vertical align="start">
          <Typography.Text>下一阶段将在此接入资料编辑、二次验证、通知偏好与安全日志。</Typography.Text>
          <Button theme="light">编辑资料（待开放）</Button>
        </Space>
      </Card>
    </Space>
  )
}
