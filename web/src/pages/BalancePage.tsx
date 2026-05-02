import { Banner, Button, Card, Col, Form, Row, Space, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui'
import { IconActivity, IconAlertTriangle, IconArrowRight, IconPulse, IconSafe, IconSetting, IconShield, IconTickCircle } from '@douyinfe/semi-icons'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createUserOrderDispute, getWalletOverview, getWalletTransactions, topupWallet, OrderDispute, WalletOverview, WalletTransaction } from '../services/finance'
import { useAuthStore } from '../store/authStore'
import { API_KEYS_ROUTE, BALANCE_ROUTE, DOCS_ROUTE, ORDERS_ROUTE, PROJECTS_ROUTE, WEBHOOKS_ROUTE, hasMenuPath, resolvePreferredConsoleRoute } from '../utils/consoleNavigation'

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

interface FinanceMissionCard {
  key: string
  title: string
  description: string
  button: string
  path: string
  tag: string
  accent: string
}

interface ConsolePillar {
  key: string
  label: string
  summary: string
}

const missionCards: FinanceMissionCard[] = [
  {
    key: 'projects',
    title: '先确认采购预算与库存',
    description: '回到项目市场对照真实库存、成功率与价格，避免在余额不足前盲目下单。',
    button: '前往项目市场',
    path: PROJECTS_ROUTE,
    tag: 'Budget',
    accent: 'rgba(14,165,233,0.18)',
  },
  {
    key: 'orders',
    title: '再追踪冻结与退款链路',
    description: '结合订单中心确认冻结余额、超时退款与争议状态是否与订单终态一致。',
    button: '查看订单中心',
    path: ORDERS_ROUTE,
    tag: 'Execution',
    accent: 'rgba(113,112,255,0.22)',
  },
  {
    key: 'integrations',
    title: '最后串联接入与回调',
    description: '继续进入 API Keys、Webhook 与 API 文档，让充值、争议与自动化调用留在同一套深色共享控制台中。',
    button: '打开 API Keys',
    path: API_KEYS_ROUTE,
    tag: 'Integration',
    accent: 'rgba(16,185,129,0.18)',
  },
]

const consolePillars: ConsolePillar[] = [
  {
    key: 'wallet-observability',
    label: '资金观察与售后同层',
    summary: '余额、流水、冻结金额与争议入口不再分散到额外后台，直接收敛在共享控制台深色壳内。',
  },
  {
    key: 'role-aware-flow',
    label: '角色差异仍共用单壳',
    summary: '普通用户看采购与争议闭环，供应商/管理员通过同一套菜单继续处理结算、审计与售后链路。',
  },
  {
    key: 'integration-bridge',
    label: '财务到接入的桥接',
    summary: '余额确认后可以直接回到 API Keys、Webhook 与 API 文档，不切换到独立接入后台。',
  },
]

export function BalancePage() {
  const navigate = useNavigate()
  const { user, menu } = useAuthStore()
  const [wallet, setWallet] = useState<WalletOverview | null>(null)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [topupForm] = Form.useForm()
  const [disputeForm] = Form.useForm()
  const [recentDisputes, setRecentDisputes] = useState<OrderDispute[]>([])

  const load = async () => {
    setLoading(true)
    try {
      const [walletRes, txRes] = await Promise.all([getWalletOverview(), getWalletTransactions()])
      setWallet(walletRes.wallet)
      setTransactions(txRes.items)
    } catch (error: any) {
      Toast.error(error?.response?.data?.error ?? '加载钱包数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const handleTopup = async () => {
    try {
      const values = await topupForm.validate()
      await topupWallet(Number(values.amount), values.note)
      Toast.success('充值成功')
      topupForm.reset()
      await load()
    } catch (error: any) {
      if (error?.name === 'ValidationError') return
      Toast.error(error?.response?.data?.error ?? '充值失败')
    }
  }

  const handleCreateDispute = async () => {
    try {
      const values = await disputeForm.validate()
      const res = await createUserOrderDispute(Number(values.order_id), values.reason)
      setRecentDisputes((current) => [res.dispute, ...current].slice(0, 10))
      Toast.success('已提交订单争议')
      disputeForm.reset()
    } catch (error: any) {
      if (error?.name === 'ValidationError') return
      Toast.error(error?.response?.data?.error ?? '提交争议失败')
    }
  }

  const latestTransaction = useMemo(() => transactions[0]?.type ?? '—', [transactions])
  const recentSessionDisputeCount = useMemo(() => recentDisputes.filter((item) => item.status === 'open').length, [recentDisputes])
  const roleTag = useMemo(() => {
    switch (user?.role) {
      case 'admin':
        return '管理员可在共享控制台的运营链路继续跟进调账、结算与争议处理'
      case 'supplier':
        return '供应商仍通过同一套共享控制台观察供货结算与争议结果'
      default:
        return '普通用户先完成预算确认，再串联订单、争议与接入路径'
    }
  }, [user?.role])

  const canOpenProjects = hasMenuPath(menu, PROJECTS_ROUTE)
  const canOpenOrders = hasMenuPath(menu, ORDERS_ROUTE)
  const canOpenApiKeys = hasMenuPath(menu, API_KEYS_ROUTE)
  const canOpenWebhooks = hasMenuPath(menu, WEBHOOKS_ROUTE)
  const canOpenDocs = hasMenuPath(menu, DOCS_ROUTE)
  const fallbackRoute = useMemo(() => resolvePreferredConsoleRoute(menu, user?.role), [menu, user?.role])

  const visibleMissionCards = useMemo(
    () => missionCards.filter((item) => hasMenuPath(menu, item.path)),
    [menu],
  )

  const canShowFallback =
    !canOpenProjects &&
    !canOpenOrders &&
    !canOpenApiKeys &&
    !canOpenWebhooks &&
    !canOpenDocs &&
    fallbackRoute !== BALANCE_ROUTE

  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <Card
        style={{
          width: '100%',
          borderRadius: 28,
          background: 'linear-gradient(135deg, rgba(94,106,210,0.2) 0%, rgba(15,16,17,0.96) 55%, rgba(8,9,10,0.98) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 64px rgba(2, 6, 23, 0.36)',
        }}
        bodyStyle={{ padding: 24 }}
      >
        <Space vertical align="start" spacing={16} style={{ width: '100%' }}>
          <Tag color="cyan" shape="circle">Finance Mission Control</Tag>
          <div>
            <Typography.Title heading={3} style={{ marginBottom: 8, color: '#f7f8f8' }}>余额中心</Typography.Title>
            <Typography.Paragraph style={{ marginBottom: 0, color: 'rgba(208,214,224,0.82)', maxWidth: 860 }}>
              在共享控制台中统一查看可用余额、冻结金额与待结算状态，让资金观察、充值与售后动作不再依赖额外后台。
            </Typography.Paragraph>
          </div>
          <Space wrap>
            <Tag color="grey" prefixIcon={<IconPulse />}>钱包余额与流水来自真实 API 返回</Tag>
            <Tag color="grey" prefixIcon={<IconShield />}>异常订单可直接提交争议并回到管理员链路处理</Tag>
            <Tag color="grey" prefixIcon={<IconSafe />}>{roleTag}</Tag>
          </Space>
          <Banner
            type="info"
            fullMode={false}
            description="资金工作台已与共享控制台深色壳对齐：先确认余额与预算，再回到订单、API Keys、Webhook 与 API 文档完成业务闭环。"
            style={{ width: '100%', background: 'rgba(15, 23, 42, 0.54)', border: '1px solid rgba(148,163,184,0.16)' }}
          />
        </Space>
      </Card>

      <Space wrap style={{ width: '100%' }} spacing={16}>
        <MetricCard title="可用余额" value={amountLabel(wallet?.available_balance ?? 0)} description="可继续采购与扣费的余额" icon={<IconPulse />} />
        <MetricCard title="冻结余额" value={amountLabel(wallet?.frozen_balance ?? 0)} description="订单执行中暂时冻结的金额" icon={<IconShield />} />
        <MetricCard title="待结算" value={amountLabel(wallet?.pending_settlement ?? 0)} description="关联履约链路、等待进入终态的金额" icon={<IconTickCircle />} />
        <MetricCard title="最近流水 / 本次会话争议" value={latestTransaction} description={`本次会话新提交争议：${recentSessionDisputeCount} 条`} icon={<IconAlertTriangle />} />
      </Space>

      <Row gutter={[16, 16]} style={{ width: '100%' }}>
        <Col xs={24} xl={16}>
          <Card
            title={<span style={{ color: '#f7f8f8' }}>资金任务流</span>}
            style={{ width: '100%', borderRadius: 24, background: 'linear-gradient(180deg, rgba(15,16,17,0.94) 0%, rgba(25,26,27,0.92) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
            bodyStyle={{ padding: 20 }}
          >
            {visibleMissionCards.length > 0 ? (
              <Row gutter={[16, 16]}>
                {visibleMissionCards.map((item) => (
                  <Col xs={24} md={8} key={item.key}>
                    <Card
                      style={{
                        height: '100%',
                        borderRadius: 20,
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                        border: `1px solid ${item.accent}`,
                      }}
                      bodyStyle={{ padding: 18 }}
                    >
                      <Space vertical align="start" spacing={12} style={{ width: '100%' }}>
                        <Tag color="cyan">{item.tag}</Tag>
                        <Typography.Title heading={5} style={{ color: '#f7f8f8', margin: 0 }}>{item.title}</Typography.Title>
                        <Typography.Paragraph style={{ marginBottom: 0, color: 'rgba(208,214,224,0.78)' }}>
                          {item.description}
                        </Typography.Paragraph>
                        <Button theme="borderless" type="tertiary" icon={<IconArrowRight />} onClick={() => navigate(item.path)}>
                          {item.button}
                        </Button>
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            ) : canShowFallback ? (
              <Card
                data-testid="balance-shared-console-fallback"
                style={{ width: '100%', borderRadius: 20, background: 'rgba(15, 23, 42, 0.72)', border: '1px solid rgba(148,163,184,0.16)' }}
                bodyStyle={{ padding: 20 }}
              >
                <Space vertical align="start" spacing={12}>
                  <Tag color="blue">Shared Console fallback</Tag>
                  <Typography.Title heading={5} style={{ margin: 0, color: '#f8fafc' }}>当前资金页已是唯一可见业务工作台</Typography.Title>
                  <Typography.Paragraph style={{ margin: 0, color: 'rgba(226,232,240,0.76)', maxWidth: 720 }}>
                    当服务端暂未暴露采购、订单或接入入口时，保持留在同一套共享控制台，并回到推荐工作台继续查看当前角色仍可访问的主链路。
                  </Typography.Paragraph>
                  <Button theme="solid" type="primary" icon={<IconArrowRight />} onClick={() => navigate(fallbackRoute)}>
                    返回推荐工作台
                  </Button>
                </Space>
              </Card>
            ) : null}
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card title="控制台能力矩阵" style={{ width: '100%', borderRadius: 24 }} bodyStyle={{ padding: 20 }}>
            <Space vertical align="start" spacing={14} style={{ width: '100%' }}>
              {consolePillars.map((item) => (
                <Card
                  key={item.key}
                  style={{ width: '100%', borderRadius: 18, background: 'linear-gradient(180deg, rgba(248,250,252,0.96) 0%, rgba(241,245,249,0.92) 100%)', border: '1px solid rgba(148,163,184,0.16)' }}
                  bodyStyle={{ padding: 16 }}
                >
                  <Typography.Title heading={6} style={{ marginTop: 0 }}>{item.label}</Typography.Title>
                  <Typography.Paragraph style={{ marginBottom: 0, color: '#475569' }}>{item.summary}</Typography.Paragraph>
                </Card>
              ))}
              <Space wrap>
                {canOpenOrders ? (
                  <Button theme="light" icon={<IconActivity />} onClick={() => navigate(ORDERS_ROUTE)}>查看订单中心</Button>
                ) : null}
                {canOpenWebhooks ? (
                  <Button theme="light" icon={<IconSetting />} onClick={() => navigate(WEBHOOKS_ROUTE)}>打开 Webhook 设置</Button>
                ) : null}
                {canOpenDocs ? (
                  <Button theme="light" icon={<IconSafe />} onClick={() => navigate(DOCS_ROUTE)}>打开 API 文档</Button>
                ) : null}
              </Space>
            </Space>
          </Card>
        </Col>
      </Row>

      <Banner
        type="info"
        fullMode={false}
        description="先在余额中心确认余额与最近流水，再决定是否充值或发起争议；所有资金动作都保留在共享控制台主壳中。"
      />

      <Row gutter={[16, 16]} style={{ width: '100%' }}>
        <Col xs={24} xl={10}>
          <Card title="模拟充值" style={{ width: '100%', borderRadius: 24 }}>
            <Form form={topupForm} layout="horizontal" labelPosition="left">
              <Form.InputNumber field="amount" label="金额（分）" rules={[{ required: true, message: '请输入充值金额' }]} style={{ width: '100%' }} />
              <Form.Input field="note" label="备注" placeholder="在线充值 / 手工补款" />
              <Button type="primary" theme="solid" onClick={handleTopup}>确认充值</Button>
            </Form>
          </Card>
        </Col>
        <Col xs={24} xl={14}>
          <Card title="订单争议申请" style={{ width: '100%', borderRadius: 24 }}>
            <Typography.Paragraph style={{ color: '#475569' }}>
              当订单结果异常、超时或与预期不符时，可直接在共享控制台发起争议；后续管理员会在共享控制台的运营链路继续处理退款与结算链路。
            </Typography.Paragraph>
            <Form form={disputeForm} layout="horizontal" labelPosition="left">
              <Form.InputNumber field="order_id" label="订单 ID" rules={[{ required: true, message: '请输入订单 ID' }]} style={{ width: '100%' }} />
              <Form.Input field="reason" label="争议原因" rules={[{ required: true, message: '请输入争议原因' }]} />
              <Button type="primary" theme="solid" onClick={handleCreateDispute}>提交争议</Button>
            </Form>
          </Card>
        </Col>
      </Row>

      <Card title="本次会话新提交的争议" style={{ width: '100%', borderRadius: 24 }}>
        <Table
          pagination={false}
          rowKey="id"
          dataSource={recentDisputes}
          columns={[
            { title: '争议单 ID', dataIndex: 'id', key: 'id' },
            { title: '订单 ID', dataIndex: 'order_id', key: 'order_id' },
            { title: '状态', dataIndex: 'status', key: 'status', render: (value) => <Tag color={value === 'open' ? 'orange' : 'green'}>{String(value)}</Tag> },
            { title: '原因', dataIndex: 'reason', key: 'reason' },
          ]}
        />
      </Card>

      <Card title="钱包流水" style={{ width: '100%', borderRadius: 24 }} loading={loading}>
        <Table
          pagination={false}
          rowKey="id"
          dataSource={transactions}
          columns={[
            { title: '类型', dataIndex: 'type', key: 'type' },
            { title: '方向', dataIndex: 'direction', key: 'direction' },
            { title: '余额类型', dataIndex: 'balance_type', key: 'balance_type' },
            { title: '金额', dataIndex: 'amount', key: 'amount', render: (value) => amountLabel(Number(value)) },
            { title: '订单', dataIndex: 'order_id', key: 'order_id', render: (value) => value || '—' },
            { title: '备注', dataIndex: 'note', key: 'note' },
          ]}
        />
      </Card>
    </Space>
  )
}
