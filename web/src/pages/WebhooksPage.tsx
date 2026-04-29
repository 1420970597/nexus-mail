import { Banner, Button, Card, Empty, Form, Space, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui'
import { IconActivity, IconArticle, IconBolt, IconSafe, IconServer } from '@douyinfe/semi-icons'
import { useEffect, useMemo, useState } from 'react'
import {
  createWebhookEndpoint,
  createWebhookTestDelivery,
  getWebhookDeliveries,
  getWebhookEndpoints,
  WebhookDeliveryRecord,
  WebhookEndpointRecord,
} from '../services/webhooks'
import { useAuthStore } from '../store/authStore'

const SIGNING_SECRET_VISIBILITY_MS = 5 * 60 * 1000

const WEBHOOK_EVENT_OPTIONS = [
  { label: '激活订单完成（activation.finished）', value: 'activation.finished' },
  { label: '激活订单就绪（activation.ready）', value: 'activation.ready' },
  { label: '激活订单超时（activation.timeout）', value: 'activation.timeout' },
  { label: 'Webhook 连通性测试（webhook.test）', value: 'webhook.test' },
]

function endpointStatusColor(status: string) {
  switch (status) {
    case 'active':
      return 'green'
    case 'disabled':
      return 'grey'
    default:
      return 'blue'
  }
}

function deliveryStatusColor(status: string) {
  switch (status) {
    case 'sent':
      return 'green'
    case 'failed':
      return 'red'
    case 'pending':
      return 'blue'
    default:
      return 'grey'
  }
}

function formatTime(value?: string) {
  return value && value.trim() ? value : '—'
}

function roleCopy(role?: string) {
  switch (role) {
    case 'admin':
      return {
        badge: '管理员视角',
        title: 'Webhook 运维与回调观测',
        description: '用于集中查看回调端点、测试投递与失败重试状态，辅助联调审计、限流与异常回放。',
        tips: ['重点关注 failed / pending 重试链路与 last_error', '测试投递返回 202 仅表示已入队，实际回调由 worker 异步执行'],
      }
    case 'supplier':
      return {
        badge: '供应商视角',
        title: '供给事件回调工作台',
        description: '为供应链系统配置事件回调地址，观察异步投递状态，确保供货与履约事件可被外部系统消费。',
        tips: ['优先使用固定公网出口服务承接回调，避免白名单/内网地址被拒绝', '结合 API 文档与订单状态回放验证回调语义'],
      }
    default:
      return {
        badge: '用户视角',
        title: '开发者 Webhook 接入工作台',
        description: '创建账户级回调 endpoint，测试真实投递链路，并跟踪最近 50 条异步 delivery 状态。',
        tips: ['签名密钥仅在创建瞬间展示一次，请立即复制保存', '先配置 API Keys 与文档，再补上回调消费端校验逻辑'],
      }
  }
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
        <Tag color="grey" prefixIcon={icon}>
          {title}
        </Tag>
        <Typography.Title heading={4} style={{ margin: 0, color: '#f7f8f8' }}>
          {value}
        </Typography.Title>
        <Typography.Text style={{ color: 'rgba(208,214,224,0.72)' }}>{description}</Typography.Text>
      </Space>
    </Card>
  )
}

export function WebhooksPage() {
  const { user } = useAuthStore()
  const [items, setItems] = useState<WebhookEndpointRecord[]>([])
  const [deliveries, setDeliveries] = useState<Record<number, WebhookDeliveryRecord[]>>({})
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [testingID, setTestingID] = useState<number | null>(null)
  const [createdSecret, setCreatedSecret] = useState('')
  const [createdSecretExpiresAt, setCreatedSecretExpiresAt] = useState<number | null>(null)
  const [createdPreview, setCreatedPreview] = useState('')
  const [expandedRows, setExpandedRows] = useState<number[]>([])
  const [form] = Form.useForm()

  const load = async (selectedEndpointID?: number) => {
    setLoading(true)
    try {
      const endpoints = await getWebhookEndpoints()
      setItems(endpoints.items)

      const targetEndpointID = selectedEndpointID ?? (endpoints.items.length > 0 ? endpoints.items[0].id : null)

      if (targetEndpointID) {
        const res = await getWebhookDeliveries(targetEndpointID)
        setDeliveries((current) => ({ ...current, [targetEndpointID]: res.items }))
        setExpandedRows([targetEndpointID])
      } else {
        setDeliveries({})
        setExpandedRows([])
      }
    } catch (error: any) {
      Toast.error(error?.response?.data?.error ?? '加载 Webhook 数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    if (!createdSecret || createdSecretExpiresAt === null) {
      return
    }

    const remaining = createdSecretExpiresAt - Date.now()
    if (remaining <= 0) {
      setCreatedSecret('')
      setCreatedSecretExpiresAt(null)
      return
    }

    const timer = window.setTimeout(() => {
      setCreatedSecret('')
      setCreatedSecretExpiresAt(null)
    }, remaining)

    return () => window.clearTimeout(timer)
  }, [createdSecret, createdSecretExpiresAt])

  const handleCreate = async () => {
    try {
      const values = await form.validate()
      const events = Array.isArray(values.events)
        ? values.events.map((item) => String(item).trim()).filter(Boolean)
        : []
      setCreating(true)
      const res = await createWebhookEndpoint({
        url: String(values.url || '').trim(),
        events,
      })
      setCreatedSecret(res.endpoint.signing_secret ?? '')
      setCreatedSecretExpiresAt(Date.now() + SIGNING_SECRET_VISIBILITY_MS)
      setCreatedPreview(res.endpoint.secret_preview)
      Toast.success('Webhook endpoint 已创建，请立即复制签名密钥')
      form.reset()
      await load(res.endpoint.id)
    } catch (error: any) {
      if (error?.name === 'ValidationError') {
        return
      }
      Toast.error(error?.response?.data?.error ?? '创建 Webhook endpoint 失败')
    } finally {
      setCreating(false)
    }
  }

  const handleTest = async (id: number) => {
    try {
      setTestingID(id)
      await createWebhookTestDelivery(id)
      Toast.success('测试投递已入队，系统将异步真实回调目标地址')
      await load(id)
    } catch (error: any) {
      Toast.error(error?.response?.data?.error ?? '创建测试投递失败')
    } finally {
      setTestingID(null)
    }
  }

  const copy = useMemo(() => roleCopy(user?.role), [user?.role])
  const deliveryStats = useMemo(() => {
    let total = 0
    let sent = 0
    let failed = 0

    for (const items of Object.values(deliveries)) {
      total += items.length
      for (const item of items) {
        if (item.status === 'sent') {
          sent += 1
        }
        if (item.status === 'failed') {
          failed += 1
        }
      }
    }

    return { total, sent, failed }
  }, [deliveries])

  const endpointColumns = useMemo(
    () => [
      { title: 'Endpoint ID', dataIndex: 'id', key: 'id' },
      { title: '目标 URL', dataIndex: 'url', key: 'url' },
      {
        title: '事件',
        dataIndex: 'events',
        key: 'events',
        render: (value: string[]) =>
          Array.isArray(value) && value.length > 0 ? (
            <Space wrap>
              {value.map((event) => (
                <Tag key={event} color="cyan">
                  {event}
                </Tag>
              ))}
            </Space>
          ) : (
            '—'
          ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: (value: string) => <Tag color={endpointStatusColor(String(value))}>{String(value)}</Tag>,
      },
      { title: '密钥预览', dataIndex: 'secret_preview', key: 'secret_preview' },
      { title: '创建时间', dataIndex: 'created_at', key: 'created_at' },
      {
        title: '操作',
        key: 'action',
        render: (_: unknown, record: WebhookEndpointRecord) => (
          <Space>
            <Button
              theme="light"
              loading={testingID === record.id}
              disabled={record.status !== 'active'}
              onClick={() => void handleTest(record.id)}
            >
              发送测试投递
            </Button>
            <Button
              theme="borderless"
              onClick={() =>
                setExpandedRows((current) =>
                  current.includes(record.id) ? current.filter((item) => item !== record.id) : [...current, record.id],
                )
              }
            >
              {expandedRows.includes(record.id) ? '收起记录' : '查看投递'}
            </Button>
          </Space>
        ),
      },
    ],
    [expandedRows, testingID],
  )

  const hasEndpoints = items.length > 0

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
          <Tag color="cyan" shape="circle">
            {copy.badge}
          </Tag>
          <div>
            <Typography.Title heading={3} style={{ marginBottom: 8, color: '#f7f8f8' }}>
              {copy.title}
            </Typography.Title>
            <Typography.Paragraph style={{ marginBottom: 0, color: 'rgba(208,214,224,0.82)', maxWidth: 860 }}>
              {copy.description}
            </Typography.Paragraph>
          </div>
          <Space wrap>
            {copy.tips.map((tip) => (
              <Tag key={tip} color="grey" prefixIcon={<IconSafe />}>
                {tip}
              </Tag>
            ))}
          </Space>
        </Space>
      </Card>

      <Space wrap style={{ width: '100%' }} spacing={16}>
        <MetricCard title="当前 endpoints" value={String(items.length)} description="已登记的回调目标数" icon={<IconServer />} />
        <MetricCard title="已缓存投递" value={String(deliveryStats.total)} description="当前页面已加载的最近 delivery 数" icon={<IconActivity />} />
        <MetricCard title="成功投递" value={String(deliveryStats.sent)} description="最近已成功送达的回调记录" icon={<IconBolt />} />
        <MetricCard title="失败投递" value={String(deliveryStats.failed)} description="需要排查 last_error 或重试链路" icon={<IconArticle />} />
      </Space>

      <Banner
        type="info"
        fullMode={false}
        description="Webhook 仅允许公网可达的 https 地址，禁止 localhost、内网、link-local、回环地址与 DNS 解析到私网目标；测试投递返回 202 代表已入队，实际回调由 worker 异步执行。"
      />

      {createdSecret ? (
        <Banner
          type="success"
          fullMode={false}
          closeIcon={null}
          description={`签名密钥（仅本次可见）：${createdSecret} ｜ 预览：${createdPreview}`}
          actions={
            <Space>
              <Button
                theme="light"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(createdSecret)
                    Toast.success('签名密钥已复制')
                    setCreatedSecret('')
                    setCreatedSecretExpiresAt(null)
                  } catch {
                    Toast.error('复制失败，请手动复制后关闭')
                  }
                }}
              >
                复制并隐藏
              </Button>
              <Button
                theme="borderless"
                onClick={() => {
                  setCreatedSecret('')
                  setCreatedSecretExpiresAt(null)
                }}
              >
                关闭
              </Button>
            </Space>
          }
        />
      ) : null}

      <Card title="创建回调 endpoint" style={{ width: '100%' }}>
        <Form form={form} layout="horizontal" labelPosition="left">
          <Form.Input
            field="url"
            label="目标地址"
            placeholder="https://hooks.example.com/nexus-mail"
            rules={[{ required: true, message: '请输入目标 URL' }]}
          />
          <Form.Select
            field="events"
            label="事件订阅"
            placeholder="请选择至少一个事件"
            multiple
            optionList={WEBHOOK_EVENT_OPTIONS}
            rules={[{ required: true, message: '请选择至少一个事件' }]}
          />
          <Button type="primary" theme="solid" loading={creating} onClick={handleCreate}>
            创建 Webhook endpoint
          </Button>
        </Form>
      </Card>

      <Card title="当前 endpoint" style={{ width: '100%' }} loading={loading}>
        {hasEndpoints ? (
          <Table
            pagination={false}
            dataSource={items}
            rowKey="id"
            columns={endpointColumns}
            expandedRowKeys={expandedRows}
            onExpandedRowsChange={async (rows) => {
              const numericRows = rows.map((item) => Number(item)).filter((item) => Number.isFinite(item))
              setExpandedRows(numericRows)
              const latest = numericRows.at(-1)
              if (latest && !deliveries[latest]) {
                try {
                  const res = await getWebhookDeliveries(latest)
                  setDeliveries((current) => ({ ...current, [latest]: res.items }))
                } catch (error: any) {
                  Toast.error(error?.response?.data?.error ?? '加载投递记录失败')
                }
              }
            }}
            expandedRowRender={(record) => {
              if (!record || typeof record !== 'object' || !('id' in record)) {
                return null
              }
              const typedRecord = record as WebhookEndpointRecord
              const endpointDeliveries = deliveries[typedRecord.id] ?? []
              return endpointDeliveries.length === 0 ? (
                <Empty description={`endpoint #${typedRecord.id} 暂无投递记录`} />
              ) : (
                <Table
                  pagination={false}
                  dataSource={endpointDeliveries}
                  rowKey="id"
                  columns={[
                    { title: '投递 ID', dataIndex: 'id', key: 'id' },
                    { title: '事件类型', dataIndex: 'event_type', key: 'event_type' },
                    {
                      title: '状态',
                      dataIndex: 'status',
                      key: 'status',
                      render: (value: string) => <Tag color={deliveryStatusColor(String(value))}>{String(value)}</Tag>,
                    },
                    { title: '尝试次数', dataIndex: 'attempt_count', key: 'attempt_count' },
                    { title: '下次重试', dataIndex: 'next_attempt_at', key: 'next_attempt_at', render: formatTime },
                    { title: '最近错误', dataIndex: 'last_error', key: 'last_error', render: formatTime },
                    { title: '送达时间', dataIndex: 'delivered_at', key: 'delivered_at', render: formatTime },
                    { title: '创建时间', dataIndex: 'created_at', key: 'created_at' },
                  ]}
                />
              )
            }}
          />
        ) : (
          <Empty description="当前还没有 Webhook endpoint，先创建第一个回调地址。" />
        )}
      </Card>
    </Space>
  )
}
