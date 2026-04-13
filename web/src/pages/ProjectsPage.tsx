import { Banner, Button, Card, Space, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui'
import { useEffect, useMemo, useState } from 'react'
import { createActivationOrder, getInventory, InventoryItem } from '../services/activation'

export function ProjectsPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creatingKey, setCreatingKey] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await getInventory()
      setItems(res.items)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const grouped = useMemo(() => items, [items])

  const handleCreate = async (record: InventoryItem) => {
    setCreatingKey(`${record.project_key}-${record.domain_id}`)
    try {
      const res = await createActivationOrder(record.project_key, record.domain_id)
      Toast.success(`已创建订单 ${res.order.order_no}，邮箱：${res.order.email_address}`)
      await load()
    } catch (error: any) {
      Toast.error(error?.response?.data?.error ?? '创建订单失败')
    } finally {
      setCreatingKey('')
    }
  }

  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <div>
        <Typography.Title heading={3}>项目市场</Typography.Title>
        <Typography.Paragraph>
          查看可售项目、价格、库存、供应商来源与协议模式，并直接创建一次性邮件接码订单。
        </Typography.Paragraph>
      </div>

      <Banner
        type="info"
        fullMode={false}
        description="Phase 2 已打通项目 -> 库存 -> 下单 -> 订单轮询主链路。优先展示项目键、域名池、成功率和库存，便于后续接入更精细的筛选器。"
      />

      <Card style={{ width: '100%' }}>
        <Table
          loading={loading}
          pagination={false}
          rowKey={(record?: InventoryItem) => `${record?.project_key ?? 'unknown'}-${record?.domain_id ?? 0}`}
          dataSource={grouped}
          columns={[
            { title: '项目', dataIndex: 'project_name', key: 'project_name' },
            { title: '项目键', dataIndex: 'project_key', key: 'project_key', render: (value) => <Tag color="blue">{String(value)}</Tag> },
            { title: '域名池', dataIndex: 'domain_name', key: 'domain_name' },
            { title: '来源类型', dataIndex: 'source_type', key: 'source_type', render: (value) => <Tag color="grey">{String(value)}</Tag> },
            { title: '协议', dataIndex: 'protocol_mode', key: 'protocol_mode', render: (value) => value || 'smtp_inbound' },
            { title: '价格', dataIndex: 'price', key: 'price', render: (value) => `¥${(Number(value) / 100).toFixed(2)}` },
            { title: '库存', dataIndex: 'stock', key: 'stock' },
            { title: '成功率', dataIndex: 'success_rate', key: 'success_rate', render: (value) => `${Math.round(Number(value) * 100)}%` },
            {
              title: '操作',
              key: 'action',
              render: (_, record) => (
                <Button
                  theme="solid"
                  type="primary"
                  disabled={record.stock <= 0}
                  loading={creatingKey === `${record.project_key}-${record.domain_id}`}
                  onClick={() => handleCreate(record)}
                >
                  {record.stock > 0 ? '立即下单' : '库存不足'}
                </Button>
              ),
            },
          ]}
        />
      </Card>
    </Space>
  )
}
