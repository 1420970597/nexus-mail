import { Card, Form, Select, Space, Switch, Typography } from '@douyinfe/semi-ui'

export function SettingsPage() {
  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <div>
        <Typography.Title heading={3}>设置中心</Typography.Title>
        <Typography.Paragraph>
          统一承接会话刷新策略、Webhook 偏好、控制台个性化与后续系统设置项。
        </Typography.Paragraph>
      </div>

      <Card title="控制台偏好" style={{ width: '100%' }}>
        <Form labelPosition="left">
          <Form.Switch field="notify" label="接收订单通知" initValue />
          <Form.Switch field="webhook" label="启用 Webhook 回调" />
          <Form.Select field="locale" label="默认界面语言" initValue="zh-CN">
            <Select.Option value="zh-CN">简体中文</Select.Option>
            <Select.Option value="en-US">English</Select.Option>
          </Form.Select>
        </Form>
      </Card>

      <Card title="会话策略" style={{ width: '100%' }}>
        <Typography.Text>
          当前阶段已接入登录、登出与 refresh token 轮换，后续会在这里暴露会话保活、设备管理与安全确认策略。
        </Typography.Text>
      </Card>
    </Space>
  )
}
