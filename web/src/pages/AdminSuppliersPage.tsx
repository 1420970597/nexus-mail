import { Banner, Button, Card, Col, Row, Space, Table, Tag, Typography } from '@douyinfe/semi-ui'
import { IconActivity, IconAlertTriangle, IconBolt, IconBriefcase, IconSafe, IconShield } from '@douyinfe/semi-icons'
import { useEffect, useMemo, useState } from 'react'
import { AdminOverviewResponse, getAdminOverview } from '../services/auth'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import {
  ADMIN_AUDIT_ROUTE,
  ADMIN_RISK_ROUTE,
  ADMIN_SUPPLIERS_ROUTE,
  ADMIN_USERS_ROUTE,
  API_KEYS_ROUTE,
  DOCS_ROUTE,
  hasMenuPath,
  resolvePreferredConsoleRoute,
  WEBHOOKS_ROUTE,
} from '../utils/consoleNavigation'

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

interface MissionSignal {
  key: string
  title: string
  value: string
  helper: string
  color: 'cyan' | 'red' | 'orange' | 'green'
}

interface ActionLane {
  key: string
  title: string
  description: string
  button: string
  path: string
  tag: string
}

export function AdminSuppliersPage() {
  const navigate = useNavigate()
  const { user, menu } = useAuthStore()
  const [data, setData] = useState<AdminOverviewResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const canOpenAdminUsers = hasMenuPath(menu, ADMIN_USERS_ROUTE)
  const canOpenRisk = hasMenuPath(menu, ADMIN_RISK_ROUTE)
  const canOpenAudit = hasMenuPath(menu, ADMIN_AUDIT_ROUTE)
  const canOpenApiKeys = hasMenuPath(menu, API_KEYS_ROUTE)
  const canOpenWebhooks = hasMenuPath(menu, WEBHOOKS_ROUTE)
  const canOpenDocs = hasMenuPath(menu, DOCS_ROUTE)
  const fallbackRoute = useMemo(() => resolvePreferredConsoleRoute(menu, user?.role), [menu, user?.role])
  const shouldShowFallback = useMemo(
    () => fallbackRoute !== ADMIN_SUPPLIERS_ROUTE && !canOpenAdminUsers && !canOpenRisk && !canOpenAudit && !canOpenApiKeys && !canOpenWebhooks && !canOpenDocs,
    [fallbackRoute, canOpenAdminUsers, canOpenRisk, canOpenAudit, canOpenApiKeys, canOpenWebhooks, canOpenDocs],
  )

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
    const riskySuppliers = suppliers.filter((item) => Number(item.completion_rate_bps || 0) < 7000)
    const highPending = [...suppliers]
      .sort((a, b) => Number(b.pending_settlement || 0) - Number(a.pending_settlement || 0))
      .slice(0, 3)
    const highestPending = highPending[0]?.pending_settlement ?? 0
    return { riskySuppliers, highPending, highestPending }
  }, [suppliers])

  const missionSignals = useMemo<MissionSignal[]>(() => [
    {
      key: 'pending',
      title: '高待结算待办',
      value: amountLabel(summary?.supplier_settlements.pending_amount ?? 0),
      helper: `Top supplier ${amountLabel(highlights.highestPending)}`,
      color: 'cyan',
    },
    {
      key: 'risk',
      title: '低履约风险',
      value: `${highlights.riskySuppliers.length}`,
      helper: '完成率低于 70% 的供应商数量',
      color: 'red',
    },
    {
      key: 'dispute',
      title: '争议敞口',
      value: percentLabel(summary?.disputes.dispute_rate_bps ?? 0),
      helper: `${summary?.disputes.open ?? 0} 个开放争议待处理`,
      color: 'orange',
    },
    {
      key: 'console',
      title: '共享控制台联动',
      value: '结算 / 风控 / 审计',
      helper: '供应商运营动作保持在同一控制台闭环',
      color: 'green',
    },
  ], [highlights.highestPending, highlights.riskySuppliers.length, summary?.disputes.dispute_rate_bps, summary?.disputes.open, summary?.supplier_settlements.pending_amount])

  const actionLanes = useMemo<ActionLane[]>(() => [
    ...(canOpenAdminUsers
      ? [{
          key: 'settlement',
          title: '结算优先级排程',
          description: '先处理高待结算与开放争议，把供应商账务确认留在共享控制台同一条运营链路。',
          button: '前往处理结算 / 争议',
          path: ADMIN_USERS_ROUTE,
          tag: 'Settlement',
        }]
      : []),
    ...(canOpenRisk
      ? [{
          key: 'risk',
          title: '异常履约复盘',
          description: '低完成率与超时上升时，立即联动风控中心确认阈值、信号等级与是否需要临时止损。',
          button: '查看风控中心',
          path: ADMIN_RISK_ROUTE,
          tag: 'Risk',
        }]
      : []),
    ...(canOpenAudit
      ? [{
          key: 'audit',
          title: '审计回放闭环',
          description: '把供应商运营动作与 denied_* 事件放到同一条时间线里，方便追查白名单、限流与角色操作。',
          button: '查看审计日志',
          path: ADMIN_AUDIT_ROUTE,
          tag: 'Audit',
        }]
      : []),
  ], [canOpenAdminUsers, canOpenAudit, canOpenRisk])

  const sharedConsoleLinks = useMemo(
    () => [
      ...(canOpenApiKeys ? [{ key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE }] : []),
      ...(canOpenWebhooks ? [{ key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE }] : []),
      ...(canOpenDocs ? [{ key: 'docs', label: 'API 文档', path: DOCS_ROUTE }] : []),
    ],
    [canOpenApiKeys, canOpenDocs, canOpenWebhooks],
  )

  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <Card
        style={{
          width: '100%',
          borderRadius: 28,
          background: 'linear-gradient(135deg, rgba(17,24,39,0.96) 0%, rgba(15,23,42,0.92) 58%, rgba(30,41,59,0.92) 100%)',
          border: '1px solid rgba(148,163,184,0.16)',
          boxShadow: '0 24px 64px rgba(2, 6, 23, 0.36)',
        }}
        bodyStyle={{ padding: 28 }}
      >
        <Space vertical align="start" spacing={16} style={{ width: '100%' }}>
          <Tag color="cyan" shape="circle">Supplier Mission Control</Tag>
          <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }} wrap>
            <div>
              <Typography.Title heading={3} style={{ color: '#f8fafc', marginBottom: 8 }}>供应商管理</Typography.Title>
              <Typography.Paragraph style={{ marginBottom: 0, color: 'rgba(226,232,240,0.78)', maxWidth: 860 }}>
                管理员供应商运营台升级为深色共享控制台：围绕待结算、履约质量与争议敞口做任务编排，并直接回流到结算、风控和审计动作。
              </Typography.Paragraph>
            </div>
            <Space spacing={8} wrap>
              <Tag color="blue">任务闭环</Tag>
              <Tag color="green">共享控制台</Tag>
            </Space>
          </Space>
          <Banner
            type="info"
            fullMode={false}
            description="真实 /admin/overview 仍是唯一数据底座；页面只重组为 mission-control 视图，帮助管理员优先确认高待结算供应商、低完成率风险与争议敞口。"
            style={{ width: '100%', background: 'rgba(15, 23, 42, 0.54)', border: '1px solid rgba(148,163,184,0.16)' }}
          />
          <Space wrap>
            <Tag color="grey" prefixIcon={<IconBriefcase />}>高待结算供应商</Tag>
            <Tag color="red" prefixIcon={<IconAlertTriangle />}>低完成率需人工复核</Tag>
            <Tag color="green" prefixIcon={<IconShield />}>争议处理继续挂接审计</Tag>
            <Tag color="blue" prefixIcon={<IconBolt />}>无需切换独立后台</Tag>
          </Space>
        </Space>
      </Card>

      <Space wrap style={{ width: '100%' }} spacing={16}>
        {missionSignals.map((item) => (
          <Card
            key={item.key}
            style={{
              flex: '1 1 220px',
              minWidth: 220,
              borderRadius: 20,
              background: 'linear-gradient(180deg, rgba(15,16,17,0.94) 0%, rgba(25,26,27,0.92) 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
            bodyStyle={{ padding: 18 }}
          >
            <Space vertical align="start" spacing={10}>
              <Tag color={item.color}>{item.title}</Tag>
              <Typography.Title heading={4} style={{ margin: 0, color: '#f8fafc' }}>{item.value}</Typography.Title>
              <Typography.Text style={{ color: 'rgba(226,232,240,0.72)' }}>{item.helper}</Typography.Text>
            </Space>
          </Card>
        ))}
      </Space>

      <Row gutter={[16, 16]} style={{ width: '100%' }}>
        <Col xs={24} xl={15}>
          <Card title="管理员主任务流" style={{ width: '100%', borderRadius: 24 }}>
            <Space vertical align="start" spacing={12} style={{ width: '100%' }}>
              {actionLanes.map((item) => (
                <Card
                  key={item.key}
                  style={{
                    width: '100%',
                    borderRadius: 18,
                    background: 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.82) 100%)',
                    border: '1px solid rgba(148,163,184,0.14)',
                  }}
                  bodyStyle={{ padding: 18 }}
                >
                  <Space vertical align="start" spacing={10} style={{ width: '100%' }}>
                    <Tag color="blue">{item.tag}</Tag>
                    <Typography.Title heading={5} style={{ margin: 0, color: '#f8fafc' }}>{item.title}</Typography.Title>
                    <Typography.Text style={{ color: 'rgba(226,232,240,0.72)' }}>{item.description}</Typography.Text>
                    <Button theme="solid" type="primary" onClick={() => navigate(item.path)}>{item.button}</Button>
                  </Space>
                </Card>
              ))}
            </Space>
          </Card>
        </Col>
        <Col xs={24} xl={9}>
          <Card title="共享接入桥接" style={{ width: '100%', borderRadius: 24 }}>
            <Space vertical align="start" spacing={12} data-testid="admin-suppliers-shared-console-bridge">
              <Typography.Paragraph style={{ marginBottom: 0 }}>
                即使当前是管理员供应商运营切片，也要保留单一登录后控制台叙事：处理完结算 / 风控 / 审计后，仍通过 API Keys、Webhook 与文档入口验证对外接入链路。
              </Typography.Paragraph>
              {sharedConsoleLinks.map((item) => (
                <Tag key={item.key} color="grey" prefixIcon={item.key === 'api-keys' ? <IconSafe /> : item.key === 'webhooks' ? <IconBolt /> : <IconActivity />}>
                  {item.label} · {item.path}
                </Tag>
              ))}
              {shouldShowFallback ? (
                <Card
                  data-testid="admin-suppliers-shared-console-fallback"
                  style={{
                    width: '100%',
                    borderRadius: 18,
                    background: 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.82) 100%)',
                    border: '1px solid rgba(148,163,184,0.14)',
                  }}
                  bodyStyle={{ padding: 18 }}
                >
                  <Space vertical align="start" spacing={10} style={{ width: '100%' }}>
                    <Tag color="cyan">Fallback</Tag>
                    <Typography.Title heading={5} style={{ margin: 0, color: '#f8fafc' }}>回到推荐工作台继续管理员主链路</Typography.Title>
                    <Typography.Text style={{ color: 'rgba(226,232,240,0.72)' }}>
                      当前菜单未暴露结算、风控、审计或共享接入入口时，继续回到服务端授予的共享工作台完成后续运营闭环。
                    </Typography.Text>
                    <Button theme="solid" type="primary" onClick={() => navigate(fallbackRoute)}>
                      返回推荐工作台
                    </Button>
                  </Space>
                </Card>
              ) : null}
            </Space>
          </Card>
        </Col>
      </Row>

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
            <Typography.Title heading={2} style={{ margin: 0 }}>{highlights.riskySuppliers.length}</Typography.Title>
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
          {canOpenAdminUsers ? <Button theme="solid" type="primary" onClick={() => navigate(ADMIN_USERS_ROUTE)}>前往处理结算 / 争议</Button> : null}
          {canOpenRisk ? <Button onClick={() => navigate(ADMIN_RISK_ROUTE)}>查看风控中心</Button> : null}
          {canOpenAudit ? <Button onClick={() => navigate(ADMIN_AUDIT_ROUTE)}>查看审计日志</Button> : null}
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
                    {canOpenAdminUsers ? <Button theme="solid" type="primary" onClick={() => navigate(ADMIN_USERS_ROUTE)}>去确认结算</Button> : null}
                    {canOpenAudit ? <Button onClick={() => navigate(ADMIN_AUDIT_ROUTE)}>查审计</Button> : null}
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
              render: () => (
                <Space wrap>
                  {canOpenAdminUsers ? <Button theme="solid" type="primary" onClick={() => navigate(ADMIN_USERS_ROUTE)}>处理结算</Button> : null}
                  {canOpenRisk ? <Button onClick={() => navigate(ADMIN_RISK_ROUTE)}>看风控</Button> : null}
                  {canOpenAudit ? <Button onClick={() => navigate(ADMIN_AUDIT_ROUTE)}>查审计</Button> : null}
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </Space>
  )
}
