import { Banner, Card, Col, Row, Space, Table, Tag, Typography } from '@douyinfe/semi-ui'
import { useEffect, useState } from 'react'
import { getAdminOverview, getDashboardOverview, AdminOverviewResponse, DashboardOverviewResponse } from '../services/auth'
import { useAuthStore } from '../store/authStore'

function amountLabel(value: number) {
  return `¥${(Number(value || 0) / 100).toFixed(2)}`
}

function percentLabel(value: number) {
  return `${(Number(value || 0) / 100).toFixed(2)}%`
}

export function DashboardPage() {
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

  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <Banner
        fullMode={false}
        type="info"
        title={`欢迎回来，${user?.email ?? '访客'}`}
        description={message}
        style={{ width: '100%' }}
      />
      <div>
        <Typography.Title heading={3}>控制台总览</Typography.Title>
        <Typography.Paragraph>优先展示真实 API 返回的运营指标，减少占位文案，支持管理员快速发现风险与争议。</Typography.Paragraph>
      </div>
      <Row gutter={16} style={{ width: '100%' }}>
        <Col span={8}><Card title="当前角色">{user?.role ?? 'guest'}</Card></Col>
        <Col span={8}><Card title="项目供给数">{overview?.stats?.projects ?? 0}</Card></Col>
        <Col span={8}><Card title="供应商数">{overview?.stats?.suppliers ?? 0}</Card></Col>
      </Row>
      {user?.role === 'admin' && adminSummary ? (
        <>
          <Row gutter={16} style={{ width: '100%' }}>
            <Col span={6}><Card title="钱包用户数">{adminSummary.users.total}</Card></Col>
            <Col span={6}><Card title="开放争议单">{adminSummary.disputes.open}</Card></Col>
            <Col span={6}><Card title="超时订单">{adminSummary.orders.timeout}</Card></Col>
            <Col span={6}><Card title="待结算金额">{amountLabel(adminSummary.supplier_settlements.pending_amount)}</Card></Col>
          </Row>
          <Row gutter={16} style={{ width: '100%' }}>
            <Col span={6}><Card title="订单完成率">{percentLabel(adminSummary.orders.completion_rate_bps)}</Card></Col>
            <Col span={6}><Card title="订单超时率">{percentLabel(adminSummary.orders.timeout_rate_bps)}</Card></Col>
            <Col span={6}><Card title="订单取消率">{percentLabel(adminSummary.orders.cancel_rate_bps)}</Card></Col>
            <Col span={6}><Card title="争议发生率">{percentLabel(adminSummary.disputes.dispute_rate_bps)}</Card></Col>
          </Row>
          <Row gutter={16} style={{ width: '100%' }}>
            <Col span={8}><Card title="已完成订单流水">{amountLabel(adminSummary.orders.gross_revenue)}</Card></Col>
            <Col span={8}><Card title="平均完成客单价">{amountLabel(adminSummary.orders.average_finished_order_value)}</Card></Col>
            <Col span={8}><Card title="鉴权拒绝率">{percentLabel(adminSummary.audit.denied_rate_bps)}</Card></Col>
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
          </Card>
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
