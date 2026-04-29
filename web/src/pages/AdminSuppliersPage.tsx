import { Banner, Button, Card, Col, Row, Space, Table, Tag, Typography } from '@douyinfe/semi-ui'
import { useEffect, useMemo, useState } from 'react'
import { AdminOverviewResponse, getAdminOverview } from '../services/auth'
import { useNavigate } from 'react-router-dom'

function amountLabel(value: number) {
  return `¥${(Number(value || 0) / 100).toFixed(2)}`
}

function percentLabel(value: number) {
  return `${(Number(value || 0) / 100).toFixed(2)}%`
}

function completionColor(value: number) {
  const ratio = Number(value || 0)
  if (ratio >= 9000) return 'green'
  if (ratio >= 7000) return 'blue'
  if (ratio >= 5000) return 'orange'
  return 'red'
}

export function AdminSuppliersPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<AdminOverviewResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await getAdminOverview()
      setData(res)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const summary = data?.summary
  const suppliers = data?.suppliers ?? []

  const highlights = useMemo(() => {
    const risky = suppliers.filter((item) => Number(item.completion_rate_bps || 0) < 7000).length
    const highPending = [...suppliers]
      .sort((a, b) => Number(b.pending_settlement || 0) - Number(a.pending_settlement || 0))
      .slice(0, 3)
    return { risky, highPending }
  }, [suppliers])

  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <div>
        <Typography.Title heading={3}>供应商管理</Typography.Title>
        <Typography.Paragraph>
          面向管理员的供应商运营总览页：聚合真实 overview 数据，快速识别高待结算、低完成率与争议风险供应商，并跳转到结算/争议处置页面。
        </Typography.Paragraph>
      </div>

      <Banner
        type="info"
        fullMode={false}
        description="本页优先复用真实 /admin/overview 聚合结果，并直接承接供应商风险识别与处置入口；无需切换独立后台。"
        style={{ width: '100%' }}
      />

      <Row gutter={16} style={{ width: '100%' }}>
        <Col span={6}>
          <Card title="供应商总数" loading={loading}>
            <Typography.Title heading={2} style={{ margin: 0 }}>{summary?.suppliers.total ?? 0}</Typography.Title>
            <Typography.Text type="tertiary">共享控制台中的供应商主体</Typography.Text>
          </Card>
        </Col>
        <Col span={6}>
          <Card title="待结算金额" loading={loading}>
            <Typography.Title heading={2} style={{ margin: 0 }}>{amountLabel(summary?.supplier_settlements.pending_amount ?? 0)}</Typography.Title>
            <Typography.Text type="tertiary">需管理员确认结算的累计金额</Typography.Text>
          </Card>
        </Col>
        <Col span={6}>
          <Card title="开放争议单" loading={loading}>
            <Typography.Title heading={2} style={{ margin: 0 }}>{summary?.disputes.open ?? 0}</Typography.Title>
            <Typography.Text type="tertiary">建议优先核查争议与退款链路</Typography.Text>
          </Card>
        </Col>
        <Col span={6}>
          <Card title="低完成率供应商" loading={loading}>
            <Typography.Title heading={2} style={{ margin: 0 }}>{highlights.risky}</Typography.Title>
            <Typography.Text type="tertiary">完成率低于 70% 的供应商数量</Typography.Text>
          </Card>
        </Col>
      </Row>

      <Card title="运营提示" style={{ width: '100%' }} loading={loading}>
        <Space wrap>
          <Tag color="red">争议率：{percentLabel(summary?.disputes.dispute_rate_bps ?? 0)}</Tag>
          <Tag color="orange">订单超时率：{percentLabel(summary?.orders.timeout_rate_bps ?? 0)}</Tag>
          <Tag color="blue">订单取消率：{percentLabel(summary?.orders.cancel_rate_bps ?? 0)}</Tag>
          <Tag color="green">完成订单流水：{amountLabel(summary?.orders.gross_revenue ?? 0)}</Tag>
        </Space>
        <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Button theme="solid" type="primary" onClick={() => navigate('/admin/users')}>前往处理结算 / 争议</Button>
          <Button onClick={() => navigate('/admin/risk')}>查看风控中心</Button>
          <Button onClick={() => navigate('/admin/audit')}>查看审计日志</Button>
        </div>
      </Card>

      <Card title="高待结算提醒" style={{ width: '100%' }} loading={loading}>
        {highlights.highPending.length === 0 ? (
          <Typography.Text type="tertiary">暂无供应商待结算记录。</Typography.Text>
        ) : (
          <Space vertical align="start" spacing={12} style={{ width: '100%' }}>
            {highlights.highPending.map((item) => (
              <Card
                key={item.user_id}
                style={{ width: '100%', borderRadius: 16, background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(248,113,113,0.16)' }}
                bodyStyle={{ padding: 16 }}
              >
                <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                  <div>
                    <Typography.Text strong>{item.email}</Typography.Text>
                    <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Tag color="red">待结算：{amountLabel(item.pending_settlement)}</Tag>
                      <Tag color="blue">完成率：{percentLabel(item.completion_rate_bps)}</Tag>
                      <Tag color="orange">争议 / 超时关注</Tag>
                    </div>
                  </div>
                  <Space>
                    <Button theme="solid" type="primary" onClick={() => navigate('/admin/users')}>去确认结算</Button>
                    <Button onClick={() => navigate('/admin/audit')}>查审计</Button>
                  </Space>
                </Space>
              </Card>
            ))}
          </Space>
        )}
      </Card>

      <Card title="供应商运营列表" style={{ width: '100%' }} loading={loading}>
        <Table
          pagination={false}
          rowKey="user_id"
          dataSource={suppliers}
          columns={[
            { title: '供应商 ID', dataIndex: 'user_id', key: 'user_id' },
            { title: '邮箱', dataIndex: 'email', key: 'email' },
            { title: '待结算金额', dataIndex: 'pending_settlement', key: 'pending_settlement', render: (value) => amountLabel(Number(value || 0)) },
            { title: '订单总数', dataIndex: 'order_total', key: 'order_total' },
            { title: '完成 / 超时 / 取消', key: 'status_split', render: (_, record) => `${record.finished_orders}/${record.timeout_orders}/${record.canceled_orders}` },
            {
              title: '完成率',
              dataIndex: 'completion_rate_bps',
              key: 'completion_rate_bps',
              render: (value) => <Tag color={completionColor(Number(value || 0))}>{percentLabel(Number(value || 0))}</Tag>,
            },
            { title: '完成流水', dataIndex: 'gross_revenue', key: 'gross_revenue', render: (value) => amountLabel(Number(value || 0)) },
            {
              title: '运营动作',
              key: 'actions',
              render: (_, record) => (
                <Space wrap>
                  <Button theme="solid" type="primary" onClick={() => navigate('/admin/users')}>处理结算</Button>
                  <Button onClick={() => navigate('/admin/risk')}>看风控</Button>
                  <Button onClick={() => navigate('/admin/audit')}>查审计</Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </Space>
  )
}
