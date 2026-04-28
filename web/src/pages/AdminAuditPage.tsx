import { Banner, Card, Form, Button, Space, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui'
import { useEffect, useState } from 'react'
import { AdminAuditEntry, getAdminAudit } from '../services/auth'

export function AdminAuditPage() {
  const [items, setItems] = useState<AdminAuditEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()

  const load = async (params?: { user_id?: number; api_key_id?: number; actor_type?: string; action?: string; limit?: number }) => {
    setLoading(true)
    try {
      const res = await getAdminAudit(params)
      setItems(res.items)
    } catch (error: any) {
      Toast.error(error?.response?.data?.error ?? '加载审计日志失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load({ limit: 50 })
  }, [])

  const handleQuery = async () => {
    const values = await form.validate()
    await load({
      user_id: values.user_id ? Number(values.user_id) : undefined,
      api_key_id: values.api_key_id ? Number(values.api_key_id) : undefined,
      actor_type: values.actor_type || undefined,
      action: values.action || undefined,
      limit: values.limit ? Number(values.limit) : 50,
    })
  }

  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <div>
        <Typography.Title heading={3}>审计日志</Typography.Title>
        <Typography.Paragraph>基于真实 `/api/v1/admin/audit` 接口回放 API Key 生命周期与运行时鉴权事件。</Typography.Paragraph>
      </div>
      <Banner type="info" fullMode={false} description="支持按 user_id、api_key_id、actor_type、action 过滤，便于排查白名单拦截与越权请求。" />
      <Card title="查询条件" style={{ width: '100%' }}>
        <Form form={form} layout="horizontal" labelPosition="left" initValues={{ limit: 50 }}>
          <Form.InputNumber field="user_id" label="用户 ID" style={{ width: '100%' }} />
          <Form.InputNumber field="api_key_id" label="API Key ID" style={{ width: '100%' }} />
          <Form.Input field="actor_type" label="主体类型" placeholder="user / system" />
          <Form.Input field="action" label="动作" placeholder="create / revoke / success / denied_whitelist" />
          <Form.InputNumber field="limit" label="返回条数" style={{ width: '100%' }} min={1} max={200} />
          <Button type="primary" theme="solid" onClick={() => void handleQuery()}>查询审计</Button>
        </Form>
      </Card>
      <Card title="审计事件" style={{ width: '100%' }} loading={loading}>
        <Table
          pagination={false}
          rowKey="id"
          dataSource={items}
          columns={[
            { title: '审计 ID', dataIndex: 'id', key: 'id' },
            { title: '用户 ID', dataIndex: 'user_id', key: 'user_id' },
            { title: 'API Key ID', dataIndex: 'api_key_id', key: 'api_key_id' },
            { title: '动作', dataIndex: 'action', key: 'action', render: (value) => <Tag color={String(value).startsWith('denied') ? 'red' : 'blue'}>{String(value)}</Tag> },
            { title: '主体', dataIndex: 'actor_type', key: 'actor_type' },
            { title: '说明', dataIndex: 'note', key: 'note' },
            { title: '时间', dataIndex: 'created_at', key: 'created_at' },
          ]}
        />
      </Card>
    </Space>
  )
}
