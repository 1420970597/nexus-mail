import { Banner, Button, Card, Col, Form, Row, Select, Space, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui'
import { IconAlertTriangle, IconBolt, IconPulse, IconSafe, IconServer, IconShield, IconUser } from '@douyinfe/semi-icons'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminAdjustWallet, getAdminWalletUsers, getAdminDisputes, resolveAdminDispute, settleSupplierPending, OrderDispute, WalletOverview } from '../services/finance'
import { useAuthStore } from '../store/authStore'
import { ADMIN_AUDIT_ROUTE, ADMIN_RISK_ROUTE, ADMIN_USERS_ROUTE, API_KEYS_ROUTE, DOCS_ROUTE, WEBHOOKS_ROUTE, hasMenuPath, resolvePreferredConsoleRoute } from '../utils/consoleNavigation'

function disputeStatusColor(status: string) {
  switch (status) {
    case 'resolved':
      return 'green'
    case 'rejected':
      return 'red'
    default:
      return 'orange'
  }
}

function amountLabel(value: number) {
  return `¥${(Number(value || 0) / 100).toFixed(2)}`
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

interface AdminMissionSignal {
  key: string
  title: string
  value: string
  helper: string
  color: 'cyan' | 'red' | 'orange' | 'green'
}

interface AdminActionLane {
  key: string
  title: string
  description: string
  button: string
  path: string
  tag: string
}

export function buildDisputeResolutionPayload(values: {
  dispute_id: number | string
  status: 'resolved' | 'rejected'
  resolution_type?: string
  resolution_note?: string
  refund_amount?: number | string
}) {
  const status = values.status
  const refundAmount = status === 'rejected' ? 0 : Number(values.refund_amount || 0)
  const resolutionType = refundAmount > 0 ? 'refund' : (status === 'rejected' ? 'manual_adjustment' : (values.resolution_type || 'manual_adjustment'))
  return {
    disputeId: Number(values.dispute_id),
    payload: {
      status,
      resolution_type: resolutionType,
      resolution_note: values.resolution_note,
      refund_amount: refundAmount,
    },
  }
}

export function AdminUsersPage() {
  const navigate = useNavigate()
  const { menu, user } = useAuthStore()
  const [items, setItems] = useState<WalletOverview[]>([])
  const [disputes, setDisputes] = useState<OrderDispute[]>([])
  const [loading, setLoading] = useState(true)
  const [disputeFilters, setDisputeFilters] = useState<{ status?: 'open' | 'resolved' | 'rejected'; limit: number }>({ limit: 100 })
  const [disputeDraft, setDisputeDraft] = useState<{ status: '' | 'open' | 'resolved' | 'rejected'; limit: number }>({ status: '', limit: 100 })
  const [form] = Form.useForm()
  const [settlementForm] = Form.useForm()
  const [disputeForm] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const [walletRes, disputeRes] = await Promise.all([
        getAdminWalletUsers(),
        getAdminDisputes({
          status: disputeFilters.status,
          limit: disputeFilters.limit,
        }),
      ])
      setItems(walletRes.items)
      setDisputes(disputeRes.items)
    } catch (error: any) {
      Toast.error(error?.response?.data?.error ?? '加载管理员数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [disputeFilters])

  const handleAdjust = async () => {
    try {
      const values = await form.validate()
      await adminAdjustWallet(Number(values.user_id), Number(values.amount), values.reason, values.confirmation_phrase)
      Toast.success('调账成功')
      form.reset()
      await load()
    } catch (error: any) {
      if (error?.name === 'ValidationError') return
      Toast.error(error?.response?.data?.error ?? '调账失败')
    }
  }

  const handleSettleSupplier = async () => {
    try {
      const values = await settlementForm.validate()
      const result = await settleSupplierPending(Number(values.supplier_id), values.reason, values.confirmation_phrase)
      Toast.success(`结算成功：¥${(Number(result.payout.settled_amount) / 100).toFixed(2)}，流水 ${result.payout.entry_count} 条`)
      settlementForm.reset()
      await load()
    } catch (error: any) {
      if (error?.name === 'ValidationError') return
      Toast.error(error?.response?.data?.error ?? '供应商结算失败')
    }
  }

  const handleResolveDispute = async () => {
    try {
      const values = await disputeForm.validate()
      const { disputeId, payload } = buildDisputeResolutionPayload(values as {
        dispute_id: number | string
        status: 'resolved' | 'rejected'
        resolution_type?: string
        resolution_note?: string
        refund_amount?: number | string
      })
      await resolveAdminDispute(disputeId, payload)
      Toast.success('争议单处理完成')
      disputeForm.reset()
      await load()
    } catch (error: any) {
      if (error?.name === 'ValidationError') return
      Toast.error(error?.response?.data?.error ?? '处理争议失败')
    }
  }

  const walletTotal = useMemo(() => items.reduce((sum, item) => sum + Number(item.available_balance || 0), 0), [items])
  const pendingSettlementTotal = useMemo(() => items.reduce((sum, item) => sum + Number(item.pending_settlement || 0), 0), [items])
  const openDisputes = useMemo(() => disputes.filter((item) => item.status === 'open').length, [disputes])
  const avgWalletBalance = useMemo(() => {
    if (items.length === 0) return 0
    return Math.round(walletTotal / items.length)
  }, [items.length, walletTotal])
  const refundExposure = useMemo(() => disputes.reduce((sum, item) => sum + Number(item.refund_amount || 0), 0), [disputes])
  const canOpenRisk = hasMenuPath(menu, ADMIN_RISK_ROUTE)
  const canOpenAudit = hasMenuPath(menu, ADMIN_AUDIT_ROUTE)
  const canOpenApiKeys = hasMenuPath(menu, API_KEYS_ROUTE)
  const canOpenWebhooks = hasMenuPath(menu, WEBHOOKS_ROUTE)
  const canOpenDocs = hasMenuPath(menu, DOCS_ROUTE)
  const fallbackRoute = useMemo(() => resolvePreferredConsoleRoute(menu, user?.role), [menu, user?.role])

  const missionSignals = useMemo<AdminMissionSignal[]>(() => [
    {
      key: 'wallet',
      title: '钱包调整面',
      value: amountLabel(walletTotal),
      helper: `人均可用余额 ${amountLabel(avgWalletBalance)}`,
      color: 'cyan',
    },
    {
      key: 'settlement',
      title: '待结算总额',
      value: amountLabel(pendingSettlementTotal),
      helper: '优先处理供应商月度或异常结算',
      color: 'green',
    },
    {
      key: 'disputes',
      title: '开放争议',
      value: String(openDisputes),
      helper: `当前退款敞口 ${amountLabel(refundExposure)}`,
      color: 'orange',
    },
    {
      key: 'console',
      title: '共享控制台联动',
      value: '账务 / 风控 / 审计',
      helper: '高危动作、风控与接入留在同一后台闭环',
      color: 'red',
    },
  ], [avgWalletBalance, openDisputes, pendingSettlementTotal, refundExposure, walletTotal])

  const actionLanes = useMemo<AdminActionLane[]>(() => [
    {
      key: 'risk',
      title: '先处理风险与高危动作',
      description: '调账、结算与争议单处理前，先回看风险信号与异常趋势，避免重复操作放大账务风险。',
      button: '查看风控中心',
      path: ADMIN_RISK_ROUTE,
      tag: 'Risk',
    },
    {
      key: 'audit',
      title: '再回放审计轨迹',
      description: '把调账确认短语、结算动作与争议处理事件放在同一时间线里追踪，确保运营与审计一致。',
      button: '查看审计日志',
      path: ADMIN_AUDIT_ROUTE,
      tag: 'Audit',
    },
    {
      key: 'integration',
      title: '共享接入桥接',
      description: '完成账务/争议处理后，仍通过 API Keys、Webhook 与文档入口验证外部接入与回调链路，不拆分第二套后台。',
      button: '打开 API Keys',
      path: API_KEYS_ROUTE,
      tag: 'Integration',
    },
  ], [])

  const visibleActionLanes = useMemo(
    () => actionLanes.filter((item) => {
      if (item.path === ADMIN_RISK_ROUTE) return canOpenRisk
      if (item.path === ADMIN_AUDIT_ROUTE) return canOpenAudit
      if (item.path === API_KEYS_ROUTE) return canOpenApiKeys
      return true
    }),
    [actionLanes, canOpenApiKeys, canOpenAudit, canOpenRisk],
  )

  const visibleSharedConsoleLinks = useMemo(
    () => [
      ...(canOpenApiKeys ? [{ key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE, icon: <IconSafe /> }] : []),
      ...(canOpenWebhooks ? [{ key: 'webhooks', label: 'Webhook 设置', path: WEBHOOKS_ROUTE, icon: <IconBolt /> }] : []),
      ...(canOpenDocs ? [{ key: 'docs', label: 'API 文档', path: DOCS_ROUTE, icon: <IconShield /> }] : []),
    ],
    [canOpenApiKeys, canOpenDocs, canOpenWebhooks],
  )

  const shouldShowFallback = useMemo(
    () => fallbackRoute !== ADMIN_USERS_ROUTE && !canOpenRisk && !canOpenAudit && !canOpenApiKeys && !canOpenWebhooks && !canOpenDocs,
    [fallbackRoute, canOpenApiKeys, canOpenAudit, canOpenDocs, canOpenRisk, canOpenWebhooks],
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
          <Tag color="red" shape="circle">Admin Finance Mission Control</Tag>
          <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }} wrap>
            <div>
              <Typography.Title heading={3} style={{ color: '#f8fafc', marginBottom: 8 }}>用户管理</Typography.Title>
              <Typography.Paragraph style={{ marginBottom: 0, color: 'rgba(226,232,240,0.78)', maxWidth: 860 }}>
                将钱包调账、供应商待结算确认与争议处理收敛到单一深色共享控制台里，围绕风险、审计与共享接入能力形成同一条运营闭环。
              </Typography.Paragraph>
            </div>
            <Space spacing={8} wrap>
              <Tag color="blue">资金任务编排</Tag>
              <Tag color="green">共享控制台</Tag>
            </Space>
          </Space>
          <Banner
            type="info"
            fullMode={false}
            description="真实管理员钱包 / 争议 / 结算 API 仍是唯一数据底座；本页只升级为 mission-control 视图，帮助管理员先识别高危动作优先级，再执行二次确认与审计回放。"
            style={{ width: '100%', background: 'rgba(15, 23, 42, 0.54)', border: '1px solid rgba(148,163,184,0.16)' }}
          />
          <Space wrap>
            <Tag color="grey" prefixIcon={<IconPulse />}>管理员高危资金动作</Tag>
            <Tag color="red" prefixIcon={<IconAlertTriangle />}>调账 / 结算要求二次确认短语</Tag>
            <Tag color="green" prefixIcon={<IconShield />}>争议处理继续写入审计</Tag>
            <Tag color="blue" prefixIcon={<IconBolt />}>API Keys / Webhook / Docs 仍在同一控制台</Tag>
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
              {visibleActionLanes.map((item) => (
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
            <Space vertical align="start" spacing={12}>
              <Typography.Paragraph style={{ marginBottom: 0 }}>
                即使当前是管理员资金运营切片，也要保持单一登录后控制台叙事：完成账务 / 争议动作后，仍通过 API Keys、Webhook 与文档入口继续验证平台对外接入链路。
              </Typography.Paragraph>
              {visibleSharedConsoleLinks.map((item) => (
                <Tag key={item.key} color="grey" prefixIcon={item.icon}>
                  {item.label} · {item.path}
                </Tag>
              ))}
              {shouldShowFallback ? (
                <Card
                  data-testid="admin-users-shared-console-fallback"
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
                      当前菜单未暴露风控、审计或共享接入入口时，继续回到服务端授予的共享工作台完成后续运营闭环。
                    </Typography.Text>
                    <Button theme="solid" type="primary" onClick={() => navigate(fallbackRoute)}>返回推荐工作台</Button>
                  </Space>
                </Card>
              ) : null}
            </Space>
          </Card>
        </Col>
      </Row>

      <Space wrap style={{ width: '100%' }} spacing={16}>
        <MetricCard title="钱包总余额" value={amountLabel(walletTotal)} description="当前钱包用户可用余额总和" icon={<IconPulse />} />
        <MetricCard title="待结算总额" value={amountLabel(pendingSettlementTotal)} description="等待管理员确认结算的供应商金额" icon={<IconSafe />} />
        <MetricCard title="开放争议" value={String(openDisputes)} description="当前筛选结果中的待处理争议数" icon={<IconAlertTriangle />} />
        <MetricCard title="钱包用户数" value={String(items.length)} description="已进入钱包体系的用户主体数量" icon={<IconUser />} />
      </Space>

      <Banner type="info" fullMode={false} description="建议流程：先看风险与审计，再执行调账或结算；所有高危动作完成后仍通过共享接入入口回到 API Keys / Webhook / 文档验证外部联动。" />

      <Row gutter={[16, 16]} style={{ width: '100%' }}>
        <Col xs={24} xl={12}>
          <Card title="管理员调账" style={{ width: '100%', borderRadius: 24 }} data-testid="admin-users-adjustment-card">
            <Form form={form} layout="horizontal" labelPosition="left">
              <Form.InputNumber field="user_id" label="用户 ID" rules={[{ required: true, message: '请输入用户 ID' }]} style={{ width: '100%' }} />
              <Form.InputNumber field="amount" label="金额（分）" rules={[{ required: true, message: '请输入调账金额' }]} style={{ width: '100%' }} />
              <Form.Input field="reason" label="原因" rules={[{ required: true, message: '请输入调账原因' }]} />
              <Form.Input field="confirmation_phrase" label="二次确认" placeholder="请输入：确认调账" rules={[{ required: true, message: '请输入确认短语：确认调账' }]} />
              <Button type="primary" theme="solid" onClick={handleAdjust}>执行调账</Button>
            </Form>
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title="供应商待结算确认" style={{ width: '100%', borderRadius: 24 }} data-testid="admin-users-settlement-card">
            <Typography.Paragraph>将供应商 pending 流水一次性标记为 settled，并把待结算余额迁移到已结算余额；操作会写入 settle_supplier_pending 审计。</Typography.Paragraph>
            <Form form={settlementForm} layout="horizontal" labelPosition="left">
              <Form.InputNumber field="supplier_id" label="供应商用户 ID" rules={[{ required: true, message: '请输入供应商用户 ID' }]} style={{ width: '100%' }} />
              <Form.Input field="reason" label="结算说明" placeholder="例如：月度结算" rules={[{ required: true, message: '请输入结算说明' }]} />
              <Form.Input field="confirmation_phrase" label="二次确认" placeholder="请输入：确认结算" rules={[{ required: true, message: '请输入确认短语：确认结算' }]} />
              <Button type="primary" theme="solid" onClick={handleSettleSupplier}>确认结算</Button>
            </Form>
          </Card>
        </Col>
      </Row>

      <Card title="争议单处理" style={{ width: '100%', borderRadius: 24 }} data-testid="admin-users-dispute-resolution-card">
        <Typography.Paragraph>退款金额大于 0 时必须选择“原路退款”，驳回争议时退款金额必须为 0；处理后会写入 resolve_dispute 审计。</Typography.Paragraph>
        <Form form={disputeForm} layout="horizontal" labelPosition="left" initValues={{ status: 'resolved', resolution_type: 'manual_adjustment', refund_amount: 0 }}>
          <Form.InputNumber field="dispute_id" label="争议单 ID" rules={[{ required: true, message: '请输入争议单 ID' }]} style={{ width: '100%' }} />
          <Form.Select field="status" label="处理状态" rules={[{ required: true, message: '请选择处理状态' }]}>
            <Select.Option value="resolved">通过并处理</Select.Option>
            <Select.Option value="rejected">驳回争议</Select.Option>
          </Form.Select>
          <Form.Select field="resolution_type" label="处理类型" rules={[{ required: true, message: '请选择处理类型' }]}>
            <Select.Option value="manual_adjustment">人工调整/无需退款</Select.Option>
            <Select.Option value="refund">原路退款</Select.Option>
          </Form.Select>
          <Form.InputNumber field="refund_amount" label="退款金额（分）" min={0} style={{ width: '100%' }} />
          <Form.Input field="resolution_note" label="处理备注" />
          <Button type="primary" theme="solid" onClick={handleResolveDispute}>处理争议单</Button>
        </Form>
      </Card>

      <Card title="争议单列表" style={{ width: '100%', borderRadius: 24 }} loading={loading} data-testid="admin-users-dispute-list-card">
        <Form layout="horizontal" labelPosition="left" initValues={disputeDraft}>
          <Form.Input
            field="status"
            label="状态筛选"
            placeholder="open / resolved / rejected，留空为全部"
            onChange={(value) => {
              const next = String(value || '').trim().toLowerCase()
              setDisputeDraft((prev) => ({ ...prev, status: (next === 'open' || next === 'resolved' || next === 'rejected' ? next : '') as '' | 'open' | 'resolved' | 'rejected' }))
            }}
          />
          <Form.InputNumber
            field="limit"
            label="最多条数"
            min={1}
            max={200}
            onChange={(value) => setDisputeDraft((prev) => ({ ...prev, limit: Number(value) || 100 }))}
            style={{ width: '100%' }}
          />
          <Button onClick={() => setDisputeFilters({ status: disputeDraft.status || undefined, limit: disputeDraft.limit })}>查询争议单</Button>
        </Form>
        <Table
          pagination={false}
          rowKey="id"
          dataSource={disputes}
          columns={[
            { title: '争议单 ID', dataIndex: 'id', key: 'id' },
            { title: '订单 ID', dataIndex: 'order_id', key: 'order_id' },
            { title: '用户 ID', dataIndex: 'user_id', key: 'user_id' },
            { title: '供应商 ID', dataIndex: 'supplier_id', key: 'supplier_id' },
            { title: '项目键', dataIndex: 'project_key', key: 'project_key' },
            { title: '状态', dataIndex: 'status', key: 'status', render: (value) => <Tag color={disputeStatusColor(String(value))}>{String(value)}</Tag> },
            { title: '争议原因', dataIndex: 'reason', key: 'reason' },
            { title: '处理类型', dataIndex: 'resolution_type', key: 'resolution_type', render: (value) => value || '—' },
            { title: '退款金额', dataIndex: 'refund_amount', key: 'refund_amount', render: (value) => amountLabel(Number(value)) },
          ]}
        />
      </Card>

      <Card title="钱包总览" style={{ width: '100%', borderRadius: 24 }} loading={loading}>
        <Table
          pagination={false}
          rowKey="user_id"
          dataSource={items}
          columns={[
            { title: '用户 ID', dataIndex: 'user_id', key: 'user_id' },
            { title: '邮箱', dataIndex: 'email', key: 'email' },
            { title: '可用余额', dataIndex: 'available_balance', key: 'available_balance', render: (value) => amountLabel(Number(value)) },
            { title: '冻结余额', dataIndex: 'frozen_balance', key: 'frozen_balance', render: (value) => amountLabel(Number(value)) },
            { title: '待结算余额', dataIndex: 'pending_settlement', key: 'pending_settlement', render: (value) => amountLabel(Number(value)) },
          ]}
        />
      </Card>
    </Space>
  )
}
