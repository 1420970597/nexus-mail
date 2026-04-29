import { Banner, Card, Form, Button, Space, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui'
import { IconActivity, IconAlertTriangle, IconClock, IconSafe } from '@douyinfe/semi-icons'
import { useEffect, useMemo, useState } from 'react'
import { AdminAuditEntry, getAdminAudit } from '../services/auth'

function auditActionColor(action: string) {
  if (action.startsWith('denied')) {
    return 'red'
  }
  if (action === 'revoke') {
    return 'orange'
  }
  return 'blue'
}

function MetricCard({ title, value, description, icon }: { title: string; value: string; description: string; icon: JSX.Element }) {
  return (
    <Card
      style={{
        flex: '1 1 220px',
        minWidth: 220,
        borderRadius: 20,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
      bodyStyle={{ padding: 18 }}
    >
      <Space vertical align="start" spacing={10} style={{ width: '100%' }}>
        <Tag color="grey" prefixIcon={icon}>{title}</Tag>
        <Typography.Title heading={4} style={{ margin: 0, color: '#f7f8f8' }}>{value}</Typography.Title>
        <Typography.Text style={{ color: 'rgba(208,214,224,0.72)' }}>{description}</Typography.Text>
      </Space>
    </Card>
  )
}

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

  const deniedItems = useMemo(() => items.filter((item) => item.action.startsWith('denied')), [items])
  const latestAction = useMemo(() => items[0]?.action ?? '—', [items])

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
      <Card
        style={{
          width: '100%',
          borderRadius: 24,
          background: 'linear-gradient(135deg, rgba(94,106,210,0.16) 0%, rgba(15,16,17,0.96) 58%, rgba(8,9,10,0.98) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
        bodyStyle={{ padding: 24 }}
      >
        <Space vertical align="start" spacing={16} style={{ width: '100%' }}>
          <Tag color="red" shape="circle">管理员视角</Tag>
          <div>
            <Typography.Title heading={3} style={{ marginBottom: 8, color: '#f7f8f8' }}>
              审计回放与追踪
            </Typography.Title>
            <Typography.Paragraph style={{ marginBottom: 0, color: 'rgba(208,214,224,0.82)', maxWidth: 860 }}>
              基于真实 `/api/v1/admin/audit` 接口回放 API Key 生命周期与运行时鉴权事件，统一查看高风险拒绝动作与最近操作者轨迹。
            </Typography.Paragraph>
          </div>
          <Space wrap>
            <Tag color="grey" prefixIcon={<IconSafe />}>优先筛查 denied_whitelist / denied_rate_limit / denied_scope</Tag>
            <Tag color="grey" prefixIcon={<IconClock />}>结合时间窗口与 actor_type 判断是用户操作还是系统防护</Tag>
          </Space>
        </Space>
      </Card>

      <Space wrap style={{ width: '100%' }} spacing={16}>
        <MetricCard title="高风险动作" value={String(deniedItems.length)} description="当前结果中所有 denied_* 事件" icon={<IconAlertTriangle />} />
        <MetricCard title="审计总数" value={String(items.length)} description="当前筛选条件下返回的事件条数" icon={<IconActivity />} />
        <MetricCard title="最近动作" value={latestAction} description="结果集首条动作，便于快速回放" icon={<IconClock />} />
      </Space>

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
            { title: '动作', dataIndex: 'action', key: 'action', render: (value) => <Tag color={auditActionColor(String(value))}>{String(value)}</Tag> },
            { title: '主体', dataIndex: 'actor_type', key: 'actor_type' },
            { title: '说明', dataIndex: 'note', key: 'note' },
            { title: '时间', dataIndex: 'created_at', key: 'created_at' },
          ]}
        />
      </Card>
    </Space>
  )
}
