import { Banner, Button, Card, Form, Space, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui'
import { IconActivity, IconAlertTriangle, IconClock, IconPulse, IconSafe, IconShield } from '@douyinfe/semi-icons'
import type { JSX } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminAuditEntry, getAdminAudit } from '../services/auth'
import { ADMIN_AUDIT_ROUTE, ADMIN_RISK_ROUTE, ADMIN_USERS_ROUTE, API_KEYS_ROUTE, DOCS_ROUTE } from '../utils/consoleNavigation'

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

interface AuditMissionSignal {
  key: string
  title: string
  value: string
  helper: string
  color: 'cyan' | 'red' | 'orange' | 'green'
}

interface AuditActionLane {
  key: string
  title: string
  description: string
  button: string
  path: string
  tag: string
}

function latestActor(items: AdminAuditEntry[]) {
  return items[0]?.actor_type ?? '—'
}

export function AdminAuditPage() {
  const navigate = useNavigate()
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
  const uniqueActors = useMemo(() => new Set(items.map((item) => item.actor_type)).size, [items])

  const missionSignals = useMemo<AuditMissionSignal[]>(() => [
    {
      key: 'denied',
      title: '高风险动作',
      value: String(deniedItems.length),
      helper: '当前结果中所有 denied_* 事件',
      color: 'red',
    },
    {
      key: 'events',
      title: '审计总数',
      value: String(items.length),
      helper: '当前筛选条件下返回的事件条数',
      color: 'cyan',
    },
    {
      key: 'actors',
      title: '主体类型',
      value: String(uniqueActors),
      helper: `最近主体：${latestActor(items)}`,
      color: 'green',
    },
    {
      key: 'latest',
      title: '最近动作',
      value: latestAction,
      helper: '结果集首条动作，便于快速回放',
      color: 'orange',
    },
  ], [deniedItems.length, items, latestAction, uniqueActors])

  const actionLanes = useMemo<AuditActionLane[]>(() => [
    {
      key: 'risk',
      title: '先核对风险信号来源',
      description: '当出现 denied_whitelist、denied_rate_limit 或 denied_scope 时，先回到风控中心确认对应规则、窗口与严重级别。',
      button: '查看风控中心',
      path: ADMIN_RISK_ROUTE,
      tag: 'Risk',
    },
    {
      key: 'finance',
      title: '再确认高危运营后果',
      description: '如果审计显示调账、结算或争议处置链路异常，再回到管理员资金工作台核对副作用与确认短语执行。',
      button: '打开资金工作台',
      path: ADMIN_USERS_ROUTE,
      tag: 'Finance',
    },
    {
      key: 'integration',
      title: '最后回到接入验证',
      description: '用 API Keys 与文档入口继续检查鉴权契约、作用域设计和真实接口重放结果，而不是另开一套后台。',
      button: '打开 API Keys',
      path: API_KEYS_ROUTE,
      tag: 'Integration',
    },
  ], [])

  const sharedConsoleLinks = useMemo(
    () => [
      { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE, icon: <IconSafe /> },
      { key: 'risk', label: '风控中心', path: ADMIN_RISK_ROUTE, icon: <IconAlertTriangle /> },
      { key: 'docs', label: 'API 文档', path: DOCS_ROUTE, icon: <IconPulse /> },
    ],
    [],
  )

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
          borderRadius: 28,
          background: 'linear-gradient(135deg, rgba(17,24,39,0.96) 0%, rgba(15,23,42,0.92) 58%, rgba(30,41,59,0.92) 100%)',
          border: '1px solid rgba(148,163,184,0.16)',
          boxShadow: '0 24px 64px rgba(2, 6, 23, 0.36)',
        }}
        bodyStyle={{ padding: 28 }}
      >
        <Space vertical align="start" spacing={16} style={{ width: '100%' }}>
          <Tag color="red" shape="circle">Audit Mission Control</Tag>
          <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }} wrap>
            <div>
              <Typography.Title heading={3} style={{ color: '#f8fafc', marginBottom: 8 }}>
                审计日志
              </Typography.Title>
              <Typography.Paragraph style={{ marginBottom: 0, color: 'rgba(226,232,240,0.78)', maxWidth: 860 }}>
                将真实 `/api/v1/admin/audit` 回放、风险联动、高危运营后果与接入契约复盘放在同一套深色共享控制台中，不再把审计追踪拆成孤立查询页。
              </Typography.Paragraph>
            </div>
            <Space spacing={8} wrap>
              <Tag color="blue">审计回放</Tag>
              <Tag color="green">共享控制台</Tag>
            </Space>
          </Space>
          <Banner
            type="info"
            fullMode={false}
            description="支持按 user_id、api_key_id、actor_type、action 过滤，便于排查白名单拦截、限流命中、越权请求与管理员高危动作。"
            style={{ width: '100%', background: 'rgba(15, 23, 42, 0.54)', border: '1px solid rgba(148,163,184,0.16)' }}
          />
          <Space wrap>
            <Tag color="grey" prefixIcon={<IconShield />}>优先筛查 denied_whitelist / denied_rate_limit / denied_scope</Tag>
            <Tag color="grey" prefixIcon={<IconClock />}>结合时间窗口与 actor_type 判断是用户操作还是系统防护</Tag>
            <Tag color="grey" prefixIcon={<IconActivity />}>审计、风控与账务运营保持单一后台闭环</Tag>
          </Space>
        </Space>
      </Card>

      <Space wrap style={{ width: '100%' }} spacing={16}>
        {missionSignals.map((item) => (
          <Card
            key={item.key}
            style={{
              flex: '1 1 220px',
              minWidth: 220,
              borderRadius: 20,
              background: 'linear-gradient(180deg, rgba(15,16,17,0.94) 0%, rgba(25,26,27,0.92) 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
            bodyStyle={{ padding: 18 }}
          >
            <Space vertical align="start" spacing={10}>
              <Tag color={item.color}>{item.title}</Tag>
              <Typography.Title heading={4} style={{ margin: 0, color: '#f8fafc' }}>{item.value}</Typography.Title>
              <Typography.Text style={{ color: 'rgba(226,232,240,0.72)' }}>{item.helper}</Typography.Text>
            </Space>
          </Card>
        ))}
      </Space>

      <Space align="start" wrap style={{ width: '100%' }} spacing={16}>
        <Card title="管理员主任务流" style={{ flex: '1 1 560px', borderRadius: 24 }}>
          <Space vertical align="start" spacing={12} style={{ width: '100%' }}>
            {actionLanes.map((item) => (
              <Card
                key={item.key}
                style={{
                  width: '100%',
                  borderRadius: 18,
                  background: 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.82) 100%)',
                  border: '1px solid rgba(148,163,184,0.14)',
                }}
                bodyStyle={{ padding: 18 }}
              >
                <Space vertical align="start" spacing={10} style={{ width: '100%' }}>
                  <Tag color="blue">{item.tag}</Tag>
                  <Typography.Title heading={5} style={{ margin: 0, color: '#f8fafc' }}>{item.title}</Typography.Title>
                  <Typography.Text style={{ color: 'rgba(226,232,240,0.72)' }}>{item.description}</Typography.Text>
                  <Button theme="solid" type="primary" onClick={() => navigate(item.path)}>{item.button}</Button>
                </Space>
              </Card>
            ))}
          </Space>
        </Card>
        <Card title="共享接入桥接" style={{ flex: '1 1 320px', borderRadius: 24 }}>
          <Space vertical align="start" spacing={12}>
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              审计页不是独立后台：查询完高危事件后，仍然通过风控、API Keys 与 API 文档入口在同一套控制台中继续验证真实鉴权契约与修复结果。
            </Typography.Paragraph>
            {sharedConsoleLinks.map((item) => (
              <Tag key={item.key} color="grey" prefixIcon={item.icon}>
                {item.label} · {item.path}
              </Tag>
            ))}
          </Space>
        </Card>
      </Space>

      <Card title="查询条件" style={{ width: '100%' }}>
        <Form form={form} layout="horizontal" labelPosition="left" initValues={{ limit: 50 }}>
          <Form.InputNumber field="user_id" label="用户 ID" style={{ width: '100%' }} />
          <Form.InputNumber field="api_key_id" label="API Key ID" style={{ width: '100%' }} />
          <Form.Input field="actor_type" label="主体类型" placeholder="user / system / admin" />
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
