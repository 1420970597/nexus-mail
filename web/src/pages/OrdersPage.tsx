import { Button, Card, Space, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui'
import { useEffect, useState } from 'react'
import { cancelActivationOrder, getActivationOrders, getActivationResult, ActivationOrder } from '../services/activation'

export function OrdersPage() {
  const [items, setItems] = useState<ActivationOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await getActivationOrders()
      setItems(res.items)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const handleResult = async (record: ActivationOrder) => {
    setBusyId(record.id)
    try {
      const res = await getActivationResult(record.id)
      Toast.info(`订单 ${record.order_no} 当前状态：${res.result.status}；提取结果：${res.result.extraction_value || '暂无结果'}`)
    } catch (error: any) {
      Toast.error(error?.response?.data?.error ?? '获取提取结果失败')
    } finally {
      setBusyId(null)
    }
  }

  const handleCancel = async (record: ActivationOrder) => {
    setBusyId(record.id)
    try {
      await cancelActivationOrder(record.id)
      Toast.success(`订单 ${record.order_no} 已取消`)
      await load()
    } catch (error: any) {
      Toast.error(error?.response?.data?.error ?? '取消订单失败')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <div>
        <Typography.Title heading={3}>订单中心</Typography.Title>
        <Typography.Paragraph>查看当前用户的激活订单、分配邮箱、订单状态与提取结果，并支持取消未完成订单。</Typography.Paragraph>
      </div>

      <Card style={{ width: '100%' }}>
        <Table
          loading={loading}
          pagination={false}
          rowKey="id"
          dataSource={items}
          columns={[
            { title: '订单号', dataIndex: 'order_no', key: 'order_no' },
            { title: '项目', dataIndex: 'project_name', key: 'project_name' },
            { title: '邮箱地址', dataIndex: 'email_address', key: 'email_address' },
            { title: '域名池', dataIndex: 'domain_name', key: 'domain_name' },
            { title: '价格', dataIndex: 'quoted_price', key: 'quoted_price', render: (value) => `¥${Number(value) / 100}` },
            { title: '状态', dataIndex: 'status', key: 'status', render: (value) => <Tag color="blue">{String(value)}</Tag> },
            {
              title: '操作',
              key: 'action',
              render: (_, record) => (
                <Space>
                  <Button theme="light" loading={busyId === record.id} onClick={() => handleResult(record)}>查看结果</Button>
                  <Button
                    type="danger"
                    theme="borderless"
                    disabled={record.status === 'CANCELED' || record.status === 'FINISHED'}
                    loading={busyId === record.id}
                    onClick={() => handleCancel(record)}
                  >
                    取消订单
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </Space>
  )
}
