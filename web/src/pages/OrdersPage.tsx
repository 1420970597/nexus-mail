import { Button, Card, Descriptions, Modal, Space, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui'
import { useEffect, useState } from 'react'
import {
  ActivationOrder,
  ActivationResultPayload,
  cancelActivationOrder,
  finishActivationOrder,
  getActivationOrders,
  getActivationResult,
} from '../services/activation'

function statusColor(status: string) {
  switch (status) {
    case 'READY':
      return 'green'
    case 'FINISHED':
      return 'cyan'
    case 'CANCELED':
    case 'TIMEOUT':
      return 'red'
    case 'WAITING_EMAIL':
      return 'orange'
    default:
      return 'blue'
  }
}

export function OrdersPage() {
  const [items, setItems] = useState<ActivationOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [resultModal, setResultModal] = useState<{ order?: ActivationOrder; result?: ActivationResultPayload; visible: boolean }>({ visible: false })

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
      setResultModal({ order: record, result: res.result, visible: true })
    } catch (error: any) {
      Toast.error(error?.response?.data?.error ?? '获取提取结果失败')
    } finally {
      setBusyId(null)
    }
  }

  const handleFinish = async (record: ActivationOrder) => {
    setBusyId(record.id)
    try {
      await finishActivationOrder(record.id)
      Toast.success(`订单 ${record.order_no} 已完成结算`)
      await load()
    } catch (error: any) {
      Toast.error(error?.response?.data?.error ?? '完成订单失败')
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
    <>
      <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
        <div>
          <Typography.Title heading={3}>订单中心</Typography.Title>
          <Typography.Paragraph>
            查看当前用户的激活订单、分配邮箱、轮询建议与提取结果；当供应商已回填验证码后，可在此手动完成订单结算。
          </Typography.Paragraph>
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
              { title: '域名池', dataIndex: 'domain_name', key: 'domain_name', render: (value) => value || '—' },
              { title: '价格', dataIndex: 'quoted_price', key: 'quoted_price', render: (value) => `¥${(Number(value) / 100).toFixed(2)}` },
              {
                title: '状态',
                dataIndex: 'status',
                key: 'status',
                render: (value) => <Tag color={statusColor(String(value))}>{String(value)}</Tag>,
              },
              {
                title: '提取结果',
                key: 'result-preview',
                render: (_, record) => record.extraction_value || '等待回填',
              },
              {
                title: '操作',
                key: 'action',
                render: (_, record) => (
                  <Space wrap>
                    <Button theme="light" loading={busyId === record.id} onClick={() => handleResult(record)}>
                      查看结果
                    </Button>
                    <Button
                      type="primary"
                      theme="solid"
                      disabled={record.status !== 'READY'}
                      loading={busyId === record.id}
                      onClick={() => handleFinish(record)}
                    >
                      完成订单
                    </Button>
                    <Button
                      type="danger"
                      theme="borderless"
                      disabled={['CANCELED', 'FINISHED', 'TIMEOUT'].includes(record.status)}
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

      <Modal
        title={resultModal.order ? `订单结果 · ${resultModal.order.order_no}` : '订单结果'}
        visible={resultModal.visible}
        footer={null}
        onCancel={() => setResultModal({ visible: false })}
      >
        {resultModal.result ? (
          <Descriptions
            data={[
              { key: '当前状态', value: <Tag color={statusColor(resultModal.result.status)}>{resultModal.result.status}</Tag> },
              { key: '提取类型', value: resultModal.result.extraction_type || '—' },
              { key: '提取结果', value: resultModal.result.extraction_value || '暂无结果' },
              { key: '剩余有效期', value: `${resultModal.result.expires_in_seconds}s` },
              { key: '轮询建议', value: resultModal.result.next_poll_after_seconds > 0 ? `${resultModal.result.next_poll_after_seconds}s 后轮询` : '无需继续轮询' },
              { key: '终态', value: resultModal.result.is_terminal ? '是' : '否' },
            ]}
          />
        ) : null}
      </Modal>
    </>
  )
}
