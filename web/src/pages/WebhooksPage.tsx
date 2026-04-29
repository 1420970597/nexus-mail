import { Banner, Button, Card, Collapse, Empty, Form, Space, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui'
import { useEffect, useMemo, useState } from 'react'
import {
  createWebhookEndpoint,
  createWebhookTestDelivery,
  getWebhookDeliveries,
  getWebhookEndpoints,
  WebhookDeliveryRecord,
  WebhookEndpointRecord,
} from '../services/webhooks'

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

export function WebhooksPage() {
  const [items, setItems] = useState<WebhookEndpointRecord[]>([])
  const [deliveries, setDeliveries] = useState<Record<number, WebhookDeliveryRecord[]>>({})
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [testingID, setTestingID] = useState<number | null>(null)
  const [createdSecret, setCreatedSecret] = useState('')
  const [createdPreview, setCreatedPreview] = useState('')
  const [expandedRows, setExpandedRows] = useState<number[]>([])
  const [form] = Form.useForm()

  const load = async (selectedEndpointID?: number) => {
    setLoading(true)
    try {
      const endpoints = await getWebhookEndpoints()
      setItems(endpoints.items)

      const targetEndpointID =
        selectedEndpointID ??
        (endpoints.items.length > 0 ? endpoints.items[0].id : null)

      if (targetEndpointID) {
        const res = await getWebhookDeliveries(targetEndpointID)
        setDeliveries({ [targetEndpointID]: res.items })
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

  const handleCreate = async () => {
    try {
      const values = await form.validate()
      const events = Array.isArray(values.events) ? values.events.map((item) => String(item).trim()).filter(Boolean) : []
      setCreating(true)
      const res = await createWebhookEndpoint({
        url: String(values.url || '').trim(),
        events,
      })
      setCreatedSecret(res.endpoint.signing_secret ?? '')
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

  const endpointTable = useMemo(
    () => [
      { title: 'Endpoint ID', dataIndex: 'id', key: 'id' },
      { title: '目标 URL', dataIndex: 'url', key: 'url' },
      {
        title: '事件',
        dataIndex: 'events',
        key: 'events',
        render: (value: string[]) => (Array.isArray(value) && value.length > 0 ? value.join(', ') : '—'),
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
      <div>
        <Typography.Title heading={3}>Webhook 设置</Typography.Title>
        <Typography.Paragraph>
          为你的账户配置真实异步回调地址，支持测试投递、签名校验与最近 50 条投递/重试状态可观测。
        </Typography.Paragraph>
      </div>

      <Banner
        type="info"
        fullMode={false}
        description="仅支持 http/https 地址；服务端会拒绝 localhost、内网、link-local 与其他 SSRF 风险目标。测试投递返回 202 仅表示已入队，实际回调由 webhook-worker 异步执行。"
      />

      <Banner
        type="info"
        fullMode={false}
        description="每次真实回调都会携带 X-Nexus-Webhook-Signature: sha256=... 请求头；签名密钥仅在创建瞬间展示一次，后续页面只保留 secret_preview。"
      />

      {createdSecret ? (
        <Banner
          type="success"
          fullMode={false}
          description={`新 endpoint 的签名密钥（仅本次可见，请立即复制保存）：${createdSecret}（预览：${createdPreview}）`}
        />
      ) : null}

      <Card title="创建 Webhook endpoint" style={{ width: '100%' }}>
        <Form form={form} labelPosition="left" layout="horizontal">
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
            rules={[{ required: true, message: '请选择至少一个事件' }]}
            style={{ width: '100%' }}
            optionList={WEBHOOK_EVENT_OPTIONS}
          />
          <Button type="primary" theme="solid" loading={creating} onClick={handleCreate}>
            创建 endpoint
          </Button>
        </Form>
      </Card>

      <Card title="当前 endpoints" style={{ width: '100%' }} loading={loading}>
        {hasEndpoints ? (
          <Table
            pagination={false}
            dataSource={items}
            rowKey="id"
            columns={endpointTable}
            expandedRowKeys={expandedRows}
            onExpandedRowsChange={async (rows) => {
              const normalizedRows = (rows ?? []).map((item) => Number(item)).filter((item) => !Number.isNaN(item))
              setExpandedRows(normalizedRows)
              const latestID = normalizedRows[normalizedRows.length - 1]
              if (!latestID || deliveries[latestID]) {
                return
              }
              try {
                const res = await getWebhookDeliveries(latestID)
                setDeliveries((current) => ({ ...current, [latestID]: res.items }))
              } catch (error: any) {
                Toast.error(error?.response?.data?.error ?? '加载投递记录失败')
              }
            }}
            expandedRowRender={(record) => {
              if (!record) {
                return null
              }
              const typedRecord = record as WebhookEndpointRecord
              const endpointDeliveries = deliveries[typedRecord.id] ?? []
              return (
                <Collapse defaultActiveKey={['deliveries']}>
                  <Collapse.Panel header={`最近投递记录（endpoint #${typedRecord.id}）`} itemKey="deliveries">
                    <Table
                      pagination={false}
                      dataSource={endpointDeliveries}
                      rowKey="id"
                      empty={endpointDeliveries.length === 0 ? <Empty description="展开后可查看该 endpoint 最近投递记录；当前暂无已加载记录。" /> : undefined}
                      columns={[
                        { title: '投递 ID', dataIndex: 'id', key: 'id' },
                        { title: '事件', dataIndex: 'event_type', key: 'event_type' },
                        {
                          title: '状态',
                          dataIndex: 'status',
                          key: 'status',
                          render: (value: string) => <Tag color={deliveryStatusColor(String(value))}>{String(value)}</Tag>,
                        },
                        { title: '尝试次数', dataIndex: 'attempt_count', key: 'attempt_count' },
                        { title: '下次重试', dataIndex: 'next_attempt_at', key: 'next_attempt_at', render: (value: string) => formatTime(value) },
                        { title: '最后错误', dataIndex: 'last_error', key: 'last_error', render: (value: string) => formatTime(value) },
                        { title: '投递时间', dataIndex: 'delivered_at', key: 'delivered_at', render: (value: string) => formatTime(value) },
                        { title: '创建时间', dataIndex: 'created_at', key: 'created_at' },
                      ]}
                    />
                    <Typography.Paragraph style={{ marginTop: 12, marginBottom: 0 }}>
                      `pending` 表示已入队或等待下一次重试，`sent` 表示目标服务返回 2xx，`failed` 表示达到最大尝试次数或最终失败。当前接口仅展示最近记录，不支持更早历史翻页。
                    </Typography.Paragraph>
                  </Collapse.Panel>
                </Collapse>
              )
            }}
          />
        ) : (
          <Empty
            title="尚未配置 Webhook endpoint"
            description="创建第一个回调地址后，可在这里查看异步投递状态、重试记录与签名密钥预览。"
          />
        )}
      </Card>
    </Space>
  )
}
