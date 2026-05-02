import { Banner, Button, Card, Form, Space, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui'
import { IconActivity, IconArrowRight, IconBolt, IconPriceTag, IconSafe } from '@douyinfe/semi-icons'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createSupplierDispute,
  getSupplierCostProfiles,
  getSupplierDisputes,
  getSupplierReports,
  getSupplierSettlementOverview,
  saveSupplierCostProfile,
  OrderDispute,
  SupplierCostProfile,
  SupplierReportRow,
  SupplierSettlementEntry,
  WalletOverview,
} from '../services/finance'
import { API_KEYS_ROUTE, DOCS_ROUTE, SUPPLIER_OFFERINGS_ROUTE, SUPPLIER_RESOURCES_ROUTE, WEBHOOKS_ROUTE } from '../utils/consoleNavigation'

function disputeTagColor(status: string) {
  switch (status) {
    case 'open':
      return 'orange'
    case 'resolved':
      return 'green'
    case 'rejected':
      return 'red'
    default:
      return 'grey'
  }
}

function money(value: number) {
  return `¥${(value / 100).toFixed(2)}`
}

function sectionCardStyle() {
  return {
    width: '100%',
    borderRadius: 24,
    background: 'linear-gradient(180deg, rgba(15,23,42,0.94) 0%, rgba(2,6,23,0.96) 100%)',
    border: '1px solid rgba(148,163,184,0.16)',
    boxShadow: '0 18px 48px rgba(2, 6, 23, 0.24)',
  }
}

function MetricCard({ title, value, description, color }: { title: string; value: string; description: string; color: string }) {
  return (
    <Card
      style={{
        flex: '1 1 220px',
        minWidth: 220,
        borderRadius: 20,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)',
        border: `1px solid ${color}`,
      }}
      bodyStyle={{ padding: 20 }}
    >
      <Space vertical align="start" spacing={10}>
        <Tag color="white">{title}</Tag>
        <Typography.Title heading={4} style={{ margin: 0, color: '#f8fafc' }}>{value}</Typography.Title>
        <Typography.Text style={{ color: 'rgba(203,213,225,0.74)' }}>{description}</Typography.Text>
      </Space>
    </Card>
  )
}

export function SupplierSettlementsPage() {
  const navigate = useNavigate()
  const [wallet, setWallet] = useState<WalletOverview | null>(null)
  const [entries, setEntries] = useState<SupplierSettlementEntry[]>([])
  const [profiles, setProfiles] = useState<SupplierCostProfile[]>([])
  const [reports, setReports] = useState<SupplierReportRow[]>([])
  const [disputes, setDisputes] = useState<OrderDispute[]>([])
  const [loading, setLoading] = useState(true)
  const [reportFilters, setReportFilters] = useState({ from: '', to: '', limit: 100 })
  const [reportDraft, setReportDraft] = useState({ from: '', to: '', limit: 100 })
  const [costForm] = Form.useForm()
  const [disputeForm] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const [overviewRes, profileRes, reportRes, disputeRes] = await Promise.all([
        getSupplierSettlementOverview(),
        getSupplierCostProfiles(),
        getSupplierReports({
          from: reportFilters.from || undefined,
          to: reportFilters.to || undefined,
          limit: reportFilters.limit,
        }),
        getSupplierDisputes(),
      ])
      setWallet(overviewRes.wallet)
      setEntries(overviewRes.entries)
      setProfiles(profileRes.items)
      setReports(reportRes.items)
      setDisputes(disputeRes.items)
    } catch (error: any) {
      Toast.error(error?.response?.data?.error ?? '加载供应商结算数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [reportFilters])

  const metrics = useMemo(() => {
    const openDisputes = disputes.filter((dispute) => dispute.status === 'open').length
    const activeProfiles = profiles.filter((profile) => profile.status === 'active').length
    const entryTotal = entries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
    return {
      pendingSettlement: money(wallet?.pending_settlement ?? 0),
      activeProfiles: String(activeProfiles),
      openDisputes: String(openDisputes),
      entryTotal: money(entryTotal),
      entryLabel: '当前列表流水',
    }
  }, [disputes, entries, profiles, wallet])

  const missionSteps = [
    {
      key: 'wallet',
      tag: '01 · 资金检查',
      title: '先核对待结算与冻结资金',
      description: '确认本周期待结算、可用余额与冻结余额，判断是否需要回到资源侧排查异常供给。',
      button: '查看供应商资源',
      path: SUPPLIER_RESOURCES_ROUTE,
      accent: 'rgba(34,197,94,0.22)',
    },
    {
      key: 'cost',
      tag: '02 · 成本维护',
      title: '继续维护项目成本模型',
      description: '让 success / timeout 成本与项目供货规则持续对齐，为后续毛利复盘提供真实底座。',
      button: '继续维护供货规则',
      path: SUPPLIER_OFFERINGS_ROUTE,
      accent: 'rgba(59,130,246,0.22)',
    },
    {
      key: 'dispute',
      tag: '03 · 闭环复盘',
      title: '最后复盘争议与共享控制台入口',
      description: '处理争议后仍可回到共享控制台中的 API Keys、Webhook 与 Docs 页面继续核对接入链路，保持供给与接入叙事单壳一致。',
      button: '打开 API Keys',
      path: API_KEYS_ROUTE,
      accent: 'rgba(168,85,247,0.22)',
    },
  ]

  const consolePillars = [
    { key: 'api', label: 'API Keys · /api-keys', summary: '同一登录态下继续校验密钥分发，不拆第二个供应商后台。', action: () => navigate(API_KEYS_ROUTE), icon: <IconSafe /> },
    { key: 'webhooks', label: 'Webhook 设置 · /webhooks', summary: '结算与争议反馈后的外部回调链路仍在共享控制台统一维护。', action: () => navigate(WEBHOOKS_ROUTE), icon: <IconBolt /> },
    { key: 'docs', label: 'API 文档 · /docs', summary: '供给与财务动作完成后，继续回到文档验证真实对外接入规则。', action: () => navigate(DOCS_ROUTE), icon: <IconPriceTag /> },
  ]

  const handleSaveProfile = async () => {
    try {
      const values = await costForm.validate()
      await saveSupplierCostProfile({
        project_key: values.project_key,
        cost_per_success: Number(values.cost_per_success),
        cost_per_timeout: Number(values.cost_per_timeout),
        currency: values.currency,
        status: values.status,
        notes: values.notes,
      })
      costForm.reset()
      Toast.success('成本模型已保存')
      await load()
    } catch (error: any) {
      if (error?.name === 'ValidationError') return
      Toast.error(error?.response?.data?.error ?? '保存成本模型失败')
    }
  }

  const handleCreateDispute = async () => {
    try {
      const values = await disputeForm.validate()
      await createSupplierDispute(Number(values.order_id), values.reason)
      disputeForm.reset()
      Toast.success('争议单已提交')
      await load()
    } catch (error: any) {
      if (error?.name === 'ValidationError') return
      Toast.error(error?.response?.data?.error ?? '提交争议失败')
    }
  }

  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <Card
        style={{
          width: '100%',
          borderRadius: 28,
          background: 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.94) 45%, rgba(88,28,135,0.82) 100%)',
          border: '1px solid rgba(148,163,184,0.18)',
          boxShadow: '0 24px 64px rgba(2, 6, 23, 0.38)',
        }}
        bodyStyle={{ padding: 28 }}
      >
        <Space vertical align="start" spacing={18} style={{ width: '100%' }}>
          <Tag color="purple" size="large">Supplier Finance Mission Control</Tag>
          <Space vertical align="start" spacing={8}>
            <Typography.Title heading={2} style={{ margin: 0, color: '#f8fafc' }}>
              供应商资金与争议指挥台
            </Typography.Title>
            <Typography.Paragraph style={{ margin: 0, color: 'rgba(226,232,240,0.82)', maxWidth: 920 }}>
              在单一登录后的深色共享控制台里，把待结算余额、冻结资金、成本模型、项目报表与争议处理收敛到同一条供应商财务闭环。
              资源页、供货规则、API Keys、Webhook 与 Docs 仍作为同一套壳中的共享入口联动，不额外拆出第二个供应商后台。
            </Typography.Paragraph>
          </Space>
          <Banner
            type="info"
            fullMode={false}
            description="真实供应商结算 / 报表 / 争议 API 仍是唯一数据底座；当前页面只升级为 mission-control 视图，帮助先识别资金状态，再执行成本维护与争议复盘。"
            style={{ width: '100%', background: 'rgba(15, 23, 42, 0.42)', borderRadius: 18, border: '1px solid rgba(148,163,184,0.18)' }}
          />
          <Space wrap spacing={16} style={{ width: '100%' }}>
            <MetricCard title="待结算余额" value={metrics.pendingSettlement} description="等待平台确认或进入周期结算的供应商金额。" color="rgba(34,197,94,0.35)" />
            <MetricCard title="活跃成本模型" value={metrics.activeProfiles} description="status=active 的项目成本模型数，可直接参与毛利测算。" color="rgba(59,130,246,0.35)" />
            <MetricCard title="开放争议" value={metrics.openDisputes} description="当前仍待处理的争议单数量，需要继续跟进售后闭环。" color="rgba(249,115,22,0.35)" />
            <MetricCard title={metrics.entryLabel} value={metrics.entryTotal} description="当前已加载结算流水列表的金额总和，用于快速感知资金规模。" color="rgba(168,85,247,0.35)" />
          </Space>
        </Space>
      </Card>

      <Card style={sectionCardStyle()} bodyStyle={{ padding: 24 }}>
        <Space vertical align="start" spacing={18} style={{ width: '100%' }}>
          <div>
            <Typography.Title heading={4} style={{ margin: 0, color: '#f8fafc' }}>
              供应商资金任务流
            </Typography.Title>
            <Typography.Paragraph style={{ color: 'rgba(203,213,225,0.76)', marginTop: 8 }}>
              继续沿共享控制台的单壳路径推进资金检查 → 成本维护 → 争议复盘，不在财务切片里切换冗余后台。
            </Typography.Paragraph>
          </div>
          <Space wrap spacing={16} style={{ width: '100%' }}>
            {missionSteps.map((step) => (
              <Card
                key={step.key}
                style={{
                  flex: '1 1 250px',
                  minWidth: 250,
                  borderRadius: 20,
                  background: `linear-gradient(180deg, ${step.accent} 0%, rgba(15,23,42,0.55) 100%)`,
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
                bodyStyle={{ padding: 20 }}
              >
                <Space vertical align="start" spacing={12} style={{ width: '100%' }}>
                  <Tag color="white">{step.tag}</Tag>
                  <Typography.Title heading={5} style={{ margin: 0, color: '#f8fafc' }}>{step.title}</Typography.Title>
                  <Typography.Text style={{ color: 'rgba(226,232,240,0.78)' }}>{step.description}</Typography.Text>
                  <Button theme="solid" type="primary" icon={<IconArrowRight />} onClick={() => navigate(step.path)}>
                    {step.button}
                  </Button>
                </Space>
              </Card>
            ))}
          </Space>
        </Space>
      </Card>

      <Card style={sectionCardStyle()} bodyStyle={{ padding: 24 }}>
        <Space vertical align="start" spacing={18} style={{ width: '100%' }}>
          <div>
            <Typography.Title heading={4} style={{ margin: 0, color: '#f8fafc' }}>
              共享控制台联动
            </Typography.Title>
            <Typography.Paragraph style={{ color: 'rgba(203,213,225,0.76)', marginTop: 8 }}>
              供应商财务动作完成后，继续与共享接入能力、回调配置和文档入口处于同一控制台中，避免把财务体验拆成孤岛页面。
            </Typography.Paragraph>
          </div>
          <Space wrap spacing={16} style={{ width: '100%' }}>
            {consolePillars.map((pillar) => (
              <Card
                key={pillar.key}
                style={{
                  flex: '1 1 240px',
                  minWidth: 240,
                  borderRadius: 18,
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
                bodyStyle={{ padding: 18 }}
              >
                <Space vertical align="start" spacing={10}>
                  <Typography.Text strong style={{ color: '#f8fafc' }}>{pillar.label}</Typography.Text>
                  <Typography.Text style={{ color: 'rgba(203,213,225,0.74)' }}>{pillar.summary}</Typography.Text>
                </Space>
              </Card>
            ))}
          </Space>
          <Space wrap spacing={12}>
            {consolePillars.map((pillar) => (
              <Button key={pillar.key} icon={pillar.icon} onClick={pillar.action}>
                {pillar.label}
              </Button>
            ))}
          </Space>
        </Space>
      </Card>

      <Card title="供应商成本模型" style={sectionCardStyle()} bodyStyle={{ padding: 24 }} loading={loading}>
        <Form form={costForm} layout="horizontal" labelPosition="left" initValues={{ currency: 'CNY', status: 'active' }}>
          <Form.Input field="project_key" label="项目键" maxLength={64} rules={[{ required: true, message: '请输入项目键' }]} />
          <Form.InputNumber field="cost_per_success" label="成功成本（分）" min={0} rules={[{ required: true, message: '请输入成功成本' }]} style={{ width: '100%' }} />
          <Form.InputNumber field="cost_per_timeout" label="超时成本（分）" min={0} rules={[{ required: true, message: '请输入超时成本' }]} style={{ width: '100%' }} />
          <Form.Input field="currency" label="币种" maxLength={3} rules={[{ required: true, message: '请输入 3 位币种代码' }]} />
          <Form.Select field="status" label="状态" optionList={[{ label: '启用', value: 'active' }, { label: '停用', value: 'inactive' }]} />
          <Form.TextArea field="notes" label="备注" maxCount={500} />
          <Button type="primary" theme="solid" onClick={handleSaveProfile}>保存成本模型</Button>
        </Form>
        <Table
          style={{ marginTop: 16 }}
          pagination={false}
          rowKey="id"
          dataSource={profiles}
          columns={[
            { title: '项目键', dataIndex: 'project_key', key: 'project_key' },
            { title: '成功成本', dataIndex: 'cost_per_success', key: 'cost_per_success', render: (value) => money(Number(value)) },
            { title: '超时成本', dataIndex: 'cost_per_timeout', key: 'cost_per_timeout', render: (value) => money(Number(value)) },
            { title: '币种', dataIndex: 'currency', key: 'currency' },
            { title: '状态', dataIndex: 'status', key: 'status', render: (value) => <Tag color="blue">{String(value)}</Tag> },
            { title: '备注', dataIndex: 'notes', key: 'notes', render: (value) => value || '—' },
          ]}
        />
      </Card>

      <Card title="项目报表" style={sectionCardStyle()} bodyStyle={{ padding: 24 }} loading={loading}>
        <Form layout="horizontal" labelPosition="left" initValues={reportDraft}>
          <Form.Input
            field="from"
            label="开始日期"
            placeholder="YYYY-MM-DD"
            onChange={(value) => setReportDraft((prev) => ({ ...prev, from: String(value ?? '') }))}
          />
          <Form.Input
            field="to"
            label="结束日期"
            placeholder="YYYY-MM-DD"
            onChange={(value) => setReportDraft((prev) => ({ ...prev, to: String(value ?? '') }))}
          />
          <Form.InputNumber
            field="limit"
            label="最多项目数"
            min={1}
            max={200}
            onChange={(value) => setReportDraft((prev) => ({ ...prev, limit: Number(value) || 100 }))}
            style={{ width: '100%' }}
          />
          <Button onClick={() => setReportFilters(reportDraft)}>查询报表</Button>
        </Form>
        <Table
          pagination={false}
          rowKey="project_key"
          dataSource={reports}
          columns={[
            { title: '项目键', dataIndex: 'project_key', key: 'project_key' },
            { title: '总订单', dataIndex: 'total_orders', key: 'total_orders' },
            { title: '完成', dataIndex: 'finished_orders', key: 'finished_orders' },
            { title: '超时', dataIndex: 'timeout_orders', key: 'timeout_orders' },
            { title: '争议单', dataIndex: 'disputed_orders', key: 'disputed_orders' },
            { title: '营收', dataIndex: 'gross_revenue', key: 'gross_revenue', render: (value) => money(Number(value)) },
            { title: '成本', dataIndex: 'modeled_cost', key: 'modeled_cost', render: (value) => money(Number(value)) },
            { title: '毛利', dataIndex: 'estimated_gross_pnl', key: 'estimated_gross_pnl', render: (value) => money(Number(value)) },
          ]}
        />
      </Card>

      <Card title="供应商争议单" style={sectionCardStyle()} bodyStyle={{ padding: 24 }} loading={loading}>
        <Form form={disputeForm} layout="horizontal" labelPosition="left">
          <Form.InputNumber field="order_id" label="订单 ID" rules={[{ required: true, message: '请输入订单 ID' }]} style={{ width: '100%' }} />
          <Form.Input field="reason" label="争议原因" rules={[{ required: true, message: '请输入争议原因' }]} />
          <Button type="primary" theme="solid" onClick={handleCreateDispute}>提交争议</Button>
        </Form>
        <Table
          style={{ marginTop: 16 }}
          pagination={false}
          rowKey="id"
          dataSource={disputes}
          columns={[
            { title: '争议单 ID', dataIndex: 'id', key: 'id' },
            { title: '订单 ID', dataIndex: 'order_id', key: 'order_id' },
            { title: '项目键', dataIndex: 'project_key', key: 'project_key' },
            { title: '状态', dataIndex: 'status', key: 'status', render: (value) => <Tag color={disputeTagColor(String(value))}>{String(value)}</Tag> },
            { title: '原因', dataIndex: 'reason', key: 'reason' },
            { title: '退款金额', dataIndex: 'refund_amount', key: 'refund_amount', render: (value) => money(Number(value)) },
            { title: '处理备注', dataIndex: 'resolution_note', key: 'resolution_note', render: (value) => value || '—' },
          ]}
        />
      </Card>

      <Card title="结算流水" style={sectionCardStyle()} bodyStyle={{ padding: 24 }} loading={loading}>
        <Table
          pagination={false}
          rowKey="id"
          dataSource={entries}
          columns={[
            { title: '订单', dataIndex: 'order_id', key: 'order_id' },
            { title: '金额', dataIndex: 'amount', key: 'amount', render: (value) => money(Number(value)) },
            { title: '状态', dataIndex: 'status', key: 'status', render: (value) => <Tag color={value === 'pending' ? 'orange' : 'green'}>{String(value)}</Tag> },
            { title: '备注', dataIndex: 'note', key: 'note' },
          ]}
        />
      </Card>
    </Space>
  )
}
