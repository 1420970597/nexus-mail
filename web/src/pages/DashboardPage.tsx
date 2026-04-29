import { Banner, Button, Card, Col, Row, Space, Table, Tag, Typography } from '@douyinfe/semi-ui'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAdminOverview, getDashboardOverview, AdminOverviewResponse, DashboardOverviewResponse } from '../services/auth'
import { useAuthStore } from '../store/authStore'

function amountLabel(value: number) {
  return `¥${(Number(value || 0) / 100).toFixed(2)}`
}

function percentLabel(value: number) {
  return `${(Number(value || 0) / 100).toFixed(2)}%`
}

function metricCardStyle(accent: string) {
  return {
    height: '100%',
    borderRadius: 20,
    background: 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,250,252,0.96) 100%)',
    border: `1px solid ${accent}`,
    boxShadow: '0 16px 40px rgba(15, 23, 42, 0.08)',
  }
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null)
  const [adminOverview, setAdminOverview] = useState<AdminOverviewResponse | null>(null)
  const [message, setMessage] = useState('正在加载概览数据...')

  useEffect(() => {
    let active = true
    getDashboardOverview()
      .then(async (res) => {
        if (!active) return
        setOverview(res)
        setMessage(res.message ?? '实时概览已加载')
        if (user?.role === 'admin') {
          const adminRes = await getAdminOverview()
          if (!active) return
          setAdminOverview(adminRes)
        }
      })
      .catch(() => {
        if (!active) return
        setMessage('实时概览加载失败，请稍后重试')
      })
    return () => {
      active = false
    }
  }, [user?.role])

  const adminSummary = adminOverview?.summary
  const topSupplier = useMemo(() => adminOverview?.suppliers?.[0], [adminOverview])

  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <Banner
        fullMode={false}
        type="info"
        title={`欢迎回来，${user?.email ?? '访客'}`}
        description={message}
        style={{ width: '100%' }}
      />

      <div style={{ width: '100%' }}>
        <Typography.Title heading={3}>控制台总览</Typography.Title>
        <Typography.Paragraph>
          统一登录后的共享控制台首页：优先展示真实 API 返回的经营、风控与结算指标，帮助不同角色在同一壳中快速进入主任务。
        </Typography.Paragraph>
      </div>

      <Row gutter={16} style={{ width: '100%' }}>
        <Col span={8}>
          <Card title="当前角色" style={metricCardStyle('rgba(59,130,246,0.18)')}>
            <Typography.Title heading={2} style={{ margin: 0 }}>{user?.role ?? 'guest'}</Typography.Title>
            <Typography.Text type="tertiary">当前菜单与页面能力将随角色动态变化</Typography.Text>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="项目供给数" style={metricCardStyle('rgba(14,165,233,0.18)')}>
            <Typography.Title heading={2} style={{ margin: 0 }}>{overview?.stats?.projects ?? 0}</Typography.Title>
            <Typography.Text type="tertiary">可售项目 / 库存聚合概览</Typography.Text>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="供应商数" style={metricCardStyle('rgba(16,185,129,0.18)')}>
            <Typography.Title heading={2} style={{ margin: 0 }}>{overview?.stats?.suppliers ?? 0}</Typography.Title>
            <Typography.Text type="tertiary">支撑当前市场供给的供应商主体</Typography.Text>
          </Card>
        </Col>
      </Row>

      {user?.role === 'admin' && adminSummary ? (
        <>
          <Row gutter={16} style={{ width: '100%' }}>
            <Col span={6}><Card title="钱包用户数" style={metricCardStyle('rgba(59,130,246,0.16)')}><Typography.Title heading={2} style={{ margin: 0 }}>{adminSummary.users.total}</Typography.Title><Typography.Text type="tertiary">已开通钱包能力的用户</Typography.Text></Card></Col>
            <Col span={6}><Card title="开放争议单" style={metricCardStyle('rgba(249,115,22,0.16)')}><Typography.Title heading={2} style={{ margin: 0 }}>{adminSummary.disputes.open}</Typography.Title><Typography.Text type="tertiary">建议优先处置的争议工单</Typography.Text></Card></Col>
            <Col span={6}><Card title="超时订单" style={metricCardStyle('rgba(239,68,68,0.16)')}><Typography.Title heading={2} style={{ margin: 0 }}>{adminSummary.orders.timeout}</Typography.Title><Typography.Text type="tertiary">影响履约与风控的超时订单</Typography.Text></Card></Col>
            <Col span={6}><Card title="待结算金额" style={metricCardStyle('rgba(16,185,129,0.16)')}><Typography.Title heading={2} style={{ margin: 0 }}>{amountLabel(adminSummary.supplier_settlements.pending_amount)}</Typography.Title><Typography.Text type="tertiary">待管理员确认的供应商结算余额</Typography.Text></Card></Col>
          </Row>

          <Row gutter={16} style={{ width: '100%' }}>
            <Col span={6}><Card title="订单完成率" style={metricCardStyle('rgba(59,130,246,0.12)')}><Typography.Title heading={3} style={{ margin: 0 }}>{percentLabel(adminSummary.orders.completion_rate_bps)}</Typography.Title></Card></Col>
            <Col span={6}><Card title="订单超时率" style={metricCardStyle('rgba(249,115,22,0.12)')}><Typography.Title heading={3} style={{ margin: 0 }}>{percentLabel(adminSummary.orders.timeout_rate_bps)}</Typography.Title></Card></Col>
            <Col span={6}><Card title="订单取消率" style={metricCardStyle('rgba(239,68,68,0.12)')}><Typography.Title heading={3} style={{ margin: 0 }}>{percentLabel(adminSummary.orders.cancel_rate_bps)}</Typography.Title></Card></Col>
            <Col span={6}><Card title="争议发生率" style={metricCardStyle('rgba(168,85,247,0.12)')}><Typography.Title heading={3} style={{ margin: 0 }}>{percentLabel(adminSummary.disputes.dispute_rate_bps)}</Typography.Title></Card></Col>
          </Row>

          <Row gutter={16} style={{ width: '100%' }}>
            <Col span={8}><Card title="已完成订单流水" style={metricCardStyle('rgba(16,185,129,0.12)')}><Typography.Title heading={3} style={{ margin: 0 }}>{amountLabel(adminSummary.orders.gross_revenue)}</Typography.Title></Card></Col>
            <Col span={8}><Card title="平均完成客单价" style={metricCardStyle('rgba(14,165,233,0.12)')}><Typography.Title heading={3} style={{ margin: 0 }}>{amountLabel(adminSummary.orders.average_finished_order_value)}</Typography.Title></Card></Col>
            <Col span={8}><Card title="鉴权拒绝率" style={metricCardStyle('rgba(239,68,68,0.12)')}><Typography.Title heading={3} style={{ margin: 0 }}>{percentLabel(adminSummary.audit.denied_rate_bps)}</Typography.Title></Card></Col>
          </Row>

          <Card title="管理员运营摘要" style={{ width: '100%' }}>
            <Space wrap>
              <Tag color="blue">项目：{adminSummary.projects.active}/{adminSummary.projects.total} 启用</Tag>
              <Tag color="green">完成订单：{adminSummary.orders.finished}</Tag>
              <Tag color="orange">取消订单：{adminSummary.orders.canceled}</Tag>
              <Tag color="red">白名单拦截：{adminSummary.audit.denied_whitelist}</Tag>
              <Tag color="red">限流拦截：{adminSummary.audit.denied_rate_limit}</Tag>
              <Tag color="red">鉴权拒绝总数：{adminSummary.audit.denied_total}</Tag>
            </Space>
            <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Button theme="solid" type="primary" onClick={() => navigate('/admin/suppliers')}>前往供应商管理查看详情</Button>
              <Button onClick={() => navigate('/admin/risk')}>前往风控中心</Button>
              <Button onClick={() => navigate('/admin/audit')}>前往审计日志</Button>
            </div>
          </Card>

          {topSupplier ? (
            <Card title="当前重点关注供应商" style={{ width: '100%' }}>
              <Space wrap>
                <Tag color="red">{topSupplier.email}</Tag>
                <Tag color="orange">待结算：{amountLabel(topSupplier.pending_settlement)}</Tag>
                <Tag color="blue">完成率：{percentLabel(topSupplier.completion_rate_bps)}</Tag>
                <Tag color="green">完成流水：{amountLabel(topSupplier.gross_revenue)}</Tag>
              </Space>
            </Card>
          ) : null}

          <Card title="供应商待结算排行" style={{ width: '100%' }}>
            <Table
              pagination={false}
              rowKey="user_id"
              dataSource={adminOverview?.suppliers ?? []}
              columns={[
                { title: '供应商 ID', dataIndex: 'user_id', key: 'user_id' },
                { title: '邮箱', dataIndex: 'email', key: 'email' },
                { title: '待结算金额', dataIndex: 'pending_settlement', key: 'pending_settlement', render: (value) => amountLabel(Number(value || 0)) },
                { title: '订单数', dataIndex: 'order_total', key: 'order_total' },
                { title: '完成/超时/取消', key: 'status_breakdown', render: (_, record) => `${record.finished_orders}/${record.timeout_orders}/${record.canceled_orders}` },
                { title: '完成率', dataIndex: 'completion_rate_bps', key: 'completion_rate_bps', render: (value) => percentLabel(Number(value || 0)) },
                { title: '完成流水', dataIndex: 'gross_revenue', key: 'gross_revenue', render: (value) => amountLabel(Number(value || 0)) },
              ]}
            />
          </Card>

          <Card title="最近审计事件" style={{ width: '100%' }}>
            <Table
              pagination={false}
              rowKey="id"
              dataSource={adminOverview?.recent_audit ?? []}
              columns={[
                { title: '动作', dataIndex: 'action', key: 'action' },
                { title: '主体', dataIndex: 'actor_type', key: 'actor_type' },
                { title: '说明', dataIndex: 'note', key: 'note' },
                { title: '时间', dataIndex: 'created_at', key: 'created_at' },
              ]}
            />
          </Card>
        </>
      ) : null}
    </Space>
  )
}
