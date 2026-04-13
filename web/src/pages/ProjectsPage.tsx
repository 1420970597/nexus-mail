import { Banner, Button, Card, Space, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui'
import { useEffect, useMemo, useState } from 'react'
import { createActivationOrder, getInventory, InventoryItem } from '../services/activation'

export function ProjectsPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creatingKey, setCreatingKey] = useState('')

  useEffect(() => {
    getInventory()
      .then((res) => setItems(res.items))
      .finally(() => setLoading(false))
  }, [])

  const grouped = useMemo(() => items, [items])

  const handleCreate = async (record: InventoryItem) => {
    setCreatingKey(`${record.project_key}-${record.domain_id}`)
    try {
      const res = await createActivationOrder(record.project_key, record.domain_id)
      Toast.success(`已创建订单 ${res.order.order_no}，邮箱：${res.order.email_address}`)
      const latest = await getInventory()
      setItems(latest.items)
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
        <Typography.Paragraph>查看可售项目、价格、库存与推荐域名池，并直接创建一次性邮件接码订单。</Typography.Paragraph>
      </div>

      <Banner type="info" fullMode={false} description="Phase 2 已接入首批项目/库存接口，当前为订单流程骨架，可用于演示项目选择与下单分配。" />

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
            { title: '价格', dataIndex: 'price', key: 'price', render: (value) => `¥${Number(value) / 100}` },
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
