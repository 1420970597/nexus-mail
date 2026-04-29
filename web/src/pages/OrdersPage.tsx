import { Banner, Button, Card, Col, Descriptions, Empty, Modal, Row, Space, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui'
import { IconActivity, IconClock, IconMail, IconTickCircle } from '@douyinfe/semi-icons'
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

  const readyCount = items.filter((item) => item.status === 'READY').length
  const waitingCount = items.filter((item) => item.status === 'WAITING_EMAIL').length
  const finishedCount = items.filter((item) => item.status === 'FINISHED').length
  const latestMailbox = items.find((item) => item.email_address)?.email_address ?? '—'

  return (
    <>
      <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
        <Card
          style={{
            width: '100%',
            borderRadius: 24,
            background: 'linear-gradient(135deg, rgba(94,106,210,0.18) 0%, rgba(15,16,17,0.96) 58%, rgba(8,9,10,0.98) 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
          bodyStyle={{ padding: 24 }}
        >
          <Space vertical align="start" spacing={16} style={{ width: '100%' }}>
            <Tag color="cyan" shape="circle">统一订单工作台</Tag>
            <div>
              <Typography.Title heading={3} style={{ marginBottom: 8, color: '#f7f8f8' }}>订单中心</Typography.Title>
              <Typography.Paragraph style={{ marginBottom: 0, color: 'rgba(208,214,224,0.82)', maxWidth: 860 }}>
                在共享控制台中统一追踪当前用户的真实激活订单、邮箱分配、提取结果与订单终态，让采购与履约观察不再依赖独立后台。
              </Typography.Paragraph>
            </div>
            <Space wrap>
              <Tag color="grey" prefixIcon={<IconMail />}>下单后回到此页追踪邮箱与验证码提取</Tag>
              <Tag color="grey" prefixIcon={<IconActivity />}>READY / FINISHED / TIMEOUT 全部来自真实 API 返回</Tag>
            </Space>
          </Space>
        </Card>

        <Space wrap style={{ width: '100%' }} spacing={16}>
          <MetricCard title="待收信" value={String(waitingCount)} description="仍在等待邮箱分配或新邮件写入的订单" icon={<IconClock />} />
          <MetricCard title="待完成" value={String(readyCount)} description="供应商已回填结果，可进入完成结算" icon={<IconActivity />} />
          <MetricCard title="已完成" value={String(finishedCount)} description="已经完成履约并进入终态的订单" icon={<IconTickCircle />} />
          <MetricCard title="最近邮箱" value={latestMailbox} description="最近一笔订单分配到的邮箱地址" icon={<IconMail />} />
        </Space>

        <Banner
          type="info"
          fullMode={false}
          description="建议顺序：先在项目市场创建订单，再在订单中心查看邮箱分配与结果；如状态转为 READY，可在同一控制台直接完成订单。"
        />

        <Row gutter={[16, 16]} style={{ width: '100%' }}>
          <Col xs={24} xl={17}>
            <Card title="真实订单列表" style={{ width: '100%', borderRadius: 24 }} bodyStyle={{ padding: 0 }}>
              <Table
                loading={loading}
                pagination={false}
                rowKey="id"
                dataSource={items}
                empty={<Empty description="当前暂无订单，可先前往项目市场下单。" />}
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
          </Col>
          <Col xs={24} xl={7}>
            <Card title="履约说明" style={{ width: '100%', borderRadius: 24 }} bodyStyle={{ padding: 20 }}>
              <Space vertical align="start" spacing={16} style={{ width: '100%' }}>
                <Card style={{ width: '100%', borderRadius: 18, background: 'linear-gradient(180deg, rgba(248,250,252,0.98) 0%, rgba(241,245,249,0.94) 100%)', border: '1px solid rgba(148,163,184,0.16)' }} bodyStyle={{ padding: 18 }}>
                  <Typography.Title heading={5} style={{ marginTop: 0 }}>READY 后完成订单</Typography.Title>
                  <Typography.Paragraph style={{ marginBottom: 0, color: '#475569' }}>
                    当供应商已回填验证码或链接时，订单状态会转为 READY；这时可在同一控制台查看结果并手动完成订单。
                  </Typography.Paragraph>
                </Card>
                <Card style={{ width: '100%', borderRadius: 18, background: 'linear-gradient(180deg, rgba(248,250,252,0.98) 0%, rgba(241,245,249,0.94) 100%)', border: '1px solid rgba(148,163,184,0.16)' }} bodyStyle={{ padding: 18 }}>
                  <Typography.Title heading={5} style={{ marginTop: 0 }}>异常时看结果面板</Typography.Title>
                  <Typography.Paragraph style={{ marginBottom: 0, color: '#475569' }}>
                    通过“查看结果”确认提取类型、剩余有效期与建议轮询间隔，帮助区分等待邮件与真正失败的场景。
                  </Typography.Paragraph>
                </Card>
              </Space>
            </Card>
          </Col>
        </Row>
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
