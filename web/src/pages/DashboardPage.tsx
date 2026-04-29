import { Banner, Button, Card, Col, Empty, Row, Space, Table, Tag, Typography } from '@douyinfe/semi-ui'
import {
  IconActivity,
  IconArticle,
  IconHistogram,
  IconSafe,
  IconServer,
  IconSetting,
} from '@douyinfe/semi-icons'
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
    background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)',
    border: `1px solid ${accent}`,
    boxShadow: 'rgba(0,0,0,0.2) 0px 0px 0px 1px',
  }
}

interface RoleAction {
  title: string
  description: string
  path: string
  button: string
  icon: JSX.Element
  accent: string
}

function roleActions(role?: string): RoleAction[] {
  switch (role) {
    case 'admin':
      return [
        {
          title: '经营与供应商运营',
          description: '优先查看供应商待结算、完成率和争议处置入口，保持管理动作在同一控制台内闭环。',
          path: '/admin/suppliers',
          button: '前往供应商管理',
          icon: <IconServer />,
          accent: 'rgba(113, 112, 255, 0.28)',
        },
        {
          title: '风险与审计联动',
          description: '把 API Key 风险、白名单拦截、限流拒绝与审计事件串联观察，不再切换独立后台。',
          path: '/admin/risk',
          button: '进入风控中心',
          icon: <IconSafe />,
          accent: 'rgba(239, 68, 68, 0.24)',
        },
      {
        title: '共享接入入口',
        description: '通过 API 文档与 Webhook 设置继续对外联调，兼顾产品运营与平台接入。',
        path: '/webhooks',
        button: '打开 Webhook 工作台',
        icon: <IconArticle />,
        accent: 'rgba(14, 165, 233, 0.24)',
      },
]
    case 'supplier':
      return [
        {
          title: '域名池运营',
          description: '先维护域名池与 Catch-All 覆盖，再回到资源与供货规则页收敛供给质量。',
          path: '/supplier/domains',
          button: '前往域名管理',
          icon: <IconServer />,
          accent: 'rgba(16, 185, 129, 0.24)',
        },
        {
          title: '供货与履约',
          description: '围绕订单履约、库存消耗与成功率调整供货规则，保持供给侧动作集中。',
          path: '/supplier/offerings',
          button: '调整供货规则',
          icon: <IconActivity />,
          accent: 'rgba(113, 112, 255, 0.28)',
        },
        {
          title: '结算与观察',
          description: '随时检查待结算余额与运营结果，减少供应商在多页面之间往返。',
          path: '/supplier/settlements',
          button: '查看结算页',
          icon: <IconHistogram />,
          accent: 'rgba(249, 115, 22, 0.26)',
        },
      ]
    default:
      return [
        {
          title: '开始采购',
          description: '从项目市场快速进入真实库存与定价，再直接创建订单进入统一流程。',
          path: '/projects',
          button: '前往项目市场',
          icon: <IconServer />,
          accent: 'rgba(14, 165, 233, 0.24)',
        },
        {
          title: '追踪订单结果',
          description: '在订单中心查看邮箱分配、提取结果和完成状态，避免跳到独立后台查看。',
          path: '/orders',
          button: '查看订单中心',
          icon: <IconActivity />,
          accent: 'rgba(113, 112, 255, 0.28)',
        },
        {
          title: '集成与回调',
          description: '继续配置 API Keys、白名单与文档，完成对外 API / Webhook 对接。',
          path: '/api-keys',
          button: '管理 API Keys',
          icon: <IconSetting />,
          accent: 'rgba(16, 185, 129, 0.24)',
        },
      ]
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
  const actions = useMemo(() => roleActions(user?.role), [user?.role])

  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <Card
        style={{
          width: '100%',
          borderRadius: 24,
          background: 'linear-gradient(135deg, rgba(94,106,210,0.18) 0%, rgba(17,24,39,0.9) 58%, rgba(15,16,17,0.96) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
        bodyStyle={{ padding: 24 }}
      >
        <Space vertical align="start" spacing={18} style={{ width: '100%' }}>
          <Tag color="cyan" shape="circle">Shared Console Entry</Tag>
          <div>
            <Typography.Title heading={2} style={{ color: '#f7f8f8', marginBottom: 8, letterSpacing: '-0.6px' }}>
              控制台总览
            </Typography.Title>
            <Typography.Paragraph style={{ color: 'rgba(208,214,224,0.82)', marginBottom: 0, maxWidth: 860, fontSize: 16 }}>
              登录后先在这里确认实时经营指标、角色可执行动作与关键跳转入口，再继续进入采购、供给、风控、审计与对外集成页面。
            </Typography.Paragraph>
          </div>
          <Banner
            fullMode={false}
            type="info"
            title={`欢迎回来，${user?.email ?? '访客'}`}
            description={message}
            style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#d0d6e0' }}
          />
          <Row gutter={[16, 16]} style={{ width: '100%' }}>
            {actions.map((item) => (
              <Col xs={24} lg={8} key={item.title}>
                <Card style={metricCardStyle(item.accent)} bodyStyle={{ padding: 18 }}>
                  <Space vertical align="start" spacing={12} style={{ width: '100%' }}>
                    <Tag color="grey" prefixIcon={item.icon}>{item.title}</Tag>
                    <Typography.Title heading={5} style={{ margin: 0, color: '#f7f8f8' }}>
                      {item.title}
                    </Typography.Title>
                    <Typography.Paragraph style={{ margin: 0, color: 'rgba(208,214,224,0.72)', minHeight: 66 }}>
                      {item.description}
                    </Typography.Paragraph>
                    <Button type="primary" theme="solid" onClick={() => navigate(item.path)} style={{ background: '#5e6ad2', borderRadius: 10 }}>
                      {item.button}
                    </Button>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </Space>
      </Card>

      <Row gutter={16} style={{ width: '100%' }}>
        <Col span={8}>
          <Card title="当前角色" style={metricCardStyle('rgba(94,106,210,0.28)')}>
            <Typography.Title heading={2} style={{ margin: 0, color: '#f7f8f8' }}>{user?.role ?? 'guest'}</Typography.Title>
            <Typography.Text style={{ color: 'rgba(208,214,224,0.68)' }}>当前菜单与页面能力将随角色动态变化</Typography.Text>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="项目供给数" style={metricCardStyle('rgba(14,165,233,0.24)')}>
            <Typography.Title heading={2} style={{ margin: 0, color: '#f7f8f8' }}>{overview?.stats?.projects ?? 0}</Typography.Title>
            <Typography.Text style={{ color: 'rgba(208,214,224,0.68)' }}>可售项目 / 库存聚合概览</Typography.Text>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="供应商数" style={metricCardStyle('rgba(16,185,129,0.24)')}>
            <Typography.Title heading={2} style={{ margin: 0, color: '#f7f8f8' }}>{overview?.stats?.suppliers ?? 0}</Typography.Title>
            <Typography.Text style={{ color: 'rgba(208,214,224,0.68)' }}>支撑当前市场供给的供应商主体</Typography.Text>
          </Card>
        </Col>
      </Row>

      {user?.role === 'admin' && adminSummary ? (
        <>
          <Row gutter={16} style={{ width: '100%' }}>
            <Col span={6}><Card title="钱包用户数" style={metricCardStyle('rgba(59,130,246,0.16)')}><Typography.Title heading={2} style={{ margin: 0, color: '#f7f8f8' }}>{adminSummary.users.total}</Typography.Title><Typography.Text style={{ color: 'rgba(208,214,224,0.68)' }}>已开通钱包能力的用户</Typography.Text></Card></Col>
            <Col span={6}><Card title="开放争议单" style={metricCardStyle('rgba(249,115,22,0.16)')}><Typography.Title heading={2} style={{ margin: 0, color: '#f7f8f8' }}>{adminSummary.disputes.open}</Typography.Title><Typography.Text style={{ color: 'rgba(208,214,224,0.68)' }}>建议优先处置的争议工单</Typography.Text></Card></Col>
            <Col span={6}><Card title="超时订单" style={metricCardStyle('rgba(239,68,68,0.16)')}><Typography.Title heading={2} style={{ margin: 0, color: '#f7f8f8' }}>{adminSummary.orders.timeout}</Typography.Title><Typography.Text style={{ color: 'rgba(208,214,224,0.68)' }}>影响履约与风控的超时订单</Typography.Text></Card></Col>
            <Col span={6}><Card title="待结算金额" style={metricCardStyle('rgba(16,185,129,0.16)')}><Typography.Title heading={2} style={{ margin: 0, color: '#f7f8f8' }}>{amountLabel(adminSummary.supplier_settlements.pending_amount)}</Typography.Title><Typography.Text style={{ color: 'rgba(208,214,224,0.68)' }}>待管理员确认的供应商结算余额</Typography.Text></Card></Col>
          </Row>

          <Row gutter={16} style={{ width: '100%' }}>
            <Col span={6}><Card title="订单完成率" style={metricCardStyle('rgba(59,130,246,0.12)')}><Typography.Title heading={3} style={{ margin: 0, color: '#f7f8f8' }}>{percentLabel(adminSummary.orders.completion_rate_bps)}</Typography.Title></Card></Col>
            <Col span={6}><Card title="订单超时率" style={metricCardStyle('rgba(249,115,22,0.12)')}><Typography.Title heading={3} style={{ margin: 0, color: '#f7f8f8' }}>{percentLabel(adminSummary.orders.timeout_rate_bps)}</Typography.Title></Card></Col>
            <Col span={6}><Card title="订单取消率" style={metricCardStyle('rgba(239,68,68,0.12)')}><Typography.Title heading={3} style={{ margin: 0, color: '#f7f8f8' }}>{percentLabel(adminSummary.orders.cancel_rate_bps)}</Typography.Title></Card></Col>
            <Col span={6}><Card title="争议发生率" style={metricCardStyle('rgba(168,85,247,0.12)')}><Typography.Title heading={3} style={{ margin: 0, color: '#f7f8f8' }}>{percentLabel(adminSummary.disputes.dispute_rate_bps)}</Typography.Title></Card></Col>
          </Row>

          <Row gutter={16} style={{ width: '100%' }}>
            <Col span={8}><Card title="已完成订单流水" style={metricCardStyle('rgba(16,185,129,0.12)')}><Typography.Title heading={3} style={{ margin: 0, color: '#f7f8f8' }}>{amountLabel(adminSummary.orders.gross_revenue)}</Typography.Title></Card></Col>
            <Col span={8}><Card title="平均完成客单价" style={metricCardStyle('rgba(14,165,233,0.12)')}><Typography.Title heading={3} style={{ margin: 0, color: '#f7f8f8' }}>{amountLabel(adminSummary.orders.average_finished_order_value)}</Typography.Title></Card></Col>
            <Col span={8}><Card title="鉴权拒绝率" style={metricCardStyle('rgba(239,68,68,0.12)')}><Typography.Title heading={3} style={{ margin: 0, color: '#f7f8f8' }}>{percentLabel(adminSummary.audit.denied_rate_bps)}</Typography.Title></Card></Col>
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
          ) : (
            <Card title="当前重点关注供应商" style={{ width: '100%' }}>
              <Empty description="暂无供应商聚合数据" />
            </Card>
          )}

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
        </>
      ) : null}
    </Space>
  )
}
