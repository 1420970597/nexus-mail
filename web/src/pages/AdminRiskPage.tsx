import { Banner, Button, Card, Col, Form, Row, Select, Space, Switch, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui'
import { IconActivity, IconAlertTriangle, IconBolt, IconClock, IconHistogram, IconSafe, IconShield, IconTickCircle } from '@douyinfe/semi-icons'
import type { JSX } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { AdminRiskResponse, RiskRule, getAdminRisk, getAdminRiskRules, updateAdminRiskRules } from '../services/auth'
import { ADMIN_AUDIT_ROUTE, ADMIN_RISK_ROUTE, ADMIN_USERS_ROUTE, API_KEYS_ROUTE, DOCS_ROUTE, hasMenuPath, resolvePreferredConsoleRoute } from '../utils/consoleNavigation'

function severityColor(severity: string) {
  switch (severity) {
    case 'high':
      return 'red'
    case 'medium':
      return 'orange'
    default:
      return 'blue'
  }
}

function MetricCard({ title, value, description, icon }: { title: string; value: string; description: string; icon: JSX.Element }) {
  return (
    <Card
      style={{
        height: '100%',
        borderRadius: 20,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
      bodyStyle={{ padding: 18 }}
    >
      <Space vertical align="start" spacing={10} style={{ width: '100%' }}>
        <Tag color="grey" prefixIcon={icon}>
          {title}
        </Tag>
        <Typography.Title heading={4} style={{ margin: 0, color: '#f7f8f8' }}>
          {value}
        </Typography.Title>
        <Typography.Text style={{ color: 'rgba(208,214,224,0.72)' }}>{description}</Typography.Text>
      </Space>
    </Card>
  )
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

function ruleStatus(rule: RiskRule) {
  if (!rule.enabled) {
    return '已停用'
  }
  return `${rule.window_minutes} 分钟 / 阈值 ${rule.threshold}`
}

export function AdminRiskPage() {
  const navigate = useNavigate()
  const { menu, user } = useAuthStore()
  const [data, setData] = useState<AdminRiskResponse | null>(null)
  const [rules, setRules] = useState<RiskRule[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getAdminRisk().then(setData).catch(() => setData(null))
    getAdminRiskRules().then((payload) => setRules(payload.items)).catch(() => setRules([]))
  }, [])

  const summary = data?.summary
  const highSignals = useMemo(() => data?.signals.filter((item) => item.severity === 'high') ?? [], [data?.signals])
  const mediumSignals = useMemo(() => data?.signals.filter((item) => item.severity === 'medium') ?? [], [data?.signals])
  const enabledRules = useMemo(() => rules.filter((item) => item.enabled), [rules])

  function updateRule(index: number, patch: Partial<RiskRule>) {
    setRules((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  async function saveRules() {
    setSaving(true)
    try {
      const payload = await updateAdminRiskRules(rules)
      setRules(payload.items)
      const refreshedRisk = await getAdminRisk()
      setData(refreshedRisk)
      Toast.success('风控规则已保存，风险信号已刷新')
    } catch (error) {
      Toast.error('风控规则保存失败')
    } finally {
      setSaving(false)
    }
  }

  const missionSignals = useMemo<MissionSignal[]>(() => [
    {
      key: 'high',
      title: '高风险信号',
      value: String(summary?.high_risk_signal_count ?? 0),
      helper: '建议先联动审计事件与账务动作排查根因',
      color: 'red',
    },
    {
      key: 'medium',
      title: '观察中信号',
      value: String(summary?.medium_risk_signal_count ?? 0),
      helper: '可继续观察或下调规则阈值验证效果',
      color: 'orange',
    },
    {
      key: 'enabled-rules',
      title: '生效规则',
      value: String(enabledRules.length),
      helper: `${rules.length} 条规则中当前启用的治理项`,
      color: 'green',
    },
    {
      key: 'console',
      title: '共享控制台联动',
      value: '风控 / 审计 / 账务',
      helper: '风控处置、审计回放与高危运营动作继续留在同一后台闭环',
      color: 'cyan',
    },
  ], [enabledRules.length, rules.length, summary?.high_risk_signal_count, summary?.medium_risk_signal_count])

  const actionLanes = useMemo<ActionLane[]>(() => [
    {
      key: 'audit',
      title: '先回放异常审计轨迹',
      description: '白名单拒绝、限流拦截和越权动作都应该先回到审计日志核对 API Key、actor_type 与最近时间窗口。',
      button: '查看审计日志',
      path: ADMIN_AUDIT_ROUTE,
      tag: 'Audit',
    },
    {
      key: 'finance',
      title: '再进入高危运营处置',
      description: '如果风险信号确认影响到账务或供应商履约，再回到管理员资金工作台处理调账、结算或争议。',
      button: '打开资金工作台',
      path: ADMIN_USERS_ROUTE,
      tag: 'Finance',
    },
    {
      key: 'integration',
      title: '最后收口接入侧验证',
      description: '规则调整后继续用 API Keys、文档与真实回放脚本核对限流、白名单与契约是否同步生效。',
      button: '打开 API Keys',
      path: API_KEYS_ROUTE,
      tag: 'Integration',
    },
  ], [])

  const sharedConsoleLinks = useMemo(
    () => [
      { key: 'api-keys', label: 'API Keys', path: API_KEYS_ROUTE, icon: <IconSafe /> },
      { key: 'audit', label: '审计日志', path: ADMIN_AUDIT_ROUTE, icon: <IconActivity /> },
      { key: 'docs', label: 'API 文档', path: DOCS_ROUTE, icon: <IconTickCircle /> },
    ],
    [],
  )
  const canOpenAudit = hasMenuPath(menu, ADMIN_AUDIT_ROUTE)
  const canOpenUsers = hasMenuPath(menu, ADMIN_USERS_ROUTE)
  const canOpenApiKeys = hasMenuPath(menu, API_KEYS_ROUTE)
  const canOpenDocs = hasMenuPath(menu, DOCS_ROUTE)
  const fallbackRoute = useMemo(() => resolvePreferredConsoleRoute(menu, user?.role), [menu, user?.role])
  const shouldShowFallbackCta = fallbackRoute !== ADMIN_RISK_ROUTE
  const visibleActionLanes = useMemo(
    () => actionLanes.filter((item) => {
      if (item.path === ADMIN_AUDIT_ROUTE) return canOpenAudit
      if (item.path === ADMIN_USERS_ROUTE) return canOpenUsers
      if (item.path === API_KEYS_ROUTE) return canOpenApiKeys
      return true
    }),
    [actionLanes, canOpenApiKeys, canOpenAudit, canOpenUsers],
  )
  const visibleSharedConsoleLinks = useMemo(
    () => sharedConsoleLinks.filter((item) => {
      if (item.path === API_KEYS_ROUTE) return canOpenApiKeys
      if (item.path === ADMIN_AUDIT_ROUTE) return canOpenAudit
      if (item.path === DOCS_ROUTE) return canOpenDocs
      return true
    }),
    [canOpenApiKeys, canOpenAudit, canOpenDocs, sharedConsoleLinks],
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
          <Tag color="red" shape="circle">
            Risk Mission Control
          </Tag>
          <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }} wrap>
            <div>
              <Typography.Title heading={3} style={{ color: '#f8fafc', marginBottom: 8 }}>
                风控中心
              </Typography.Title>
              <Typography.Paragraph style={{ marginBottom: 0, color: 'rgba(226,232,240,0.78)', maxWidth: 860 }}>
                将真实风险信号、规则编辑、审计回放与高危运营处置统一收敛到同一套深色共享控制台，不再把风控判断拆到独立后台或孤立表单。
              </Typography.Paragraph>
            </div>
            <Space spacing={8} wrap>
              <Tag color="blue">规则生效</Tag>
              <Tag color="green">共享控制台</Tag>
            </Space>
          </Space>
          <Banner
            type="warning"
            fullMode={false}
            description="当前风控信号基于真实 API Key 审计、争议单与订单超时统计构建；此页只重组为 mission-control 视图，仍然以 `/api/v1/admin/risk` 与 `/api/v1/admin/risk/rules` 作为唯一数据底座。"
            style={{ width: '100%', background: 'rgba(15, 23, 42, 0.54)', border: '1px solid rgba(148,163,184,0.16)' }}
          />
          <Space wrap>
            <Tag color="grey" prefixIcon={<IconAlertTriangle />}>高风险先联动审计</Tag>
            <Tag color="grey" prefixIcon={<IconBolt />}>规则保存后立即刷新风险摘要</Tag>
            <Tag color="grey" prefixIcon={<IconShield />}>处置动作继续挂接账务与争议后台</Tag>
            <Tag color="grey" prefixIcon={<IconSafe />}>无需切换独立风控后台</Tag>
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
              <Typography.Title heading={4} style={{ margin: 0, color: '#f8fafc' }}>
                {item.value}
              </Typography.Title>
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
                    <Typography.Title heading={5} style={{ margin: 0, color: '#f8fafc' }}>
                      {item.title}
                    </Typography.Title>
                    <Typography.Text style={{ color: 'rgba(226,232,240,0.72)' }}>{item.description}</Typography.Text>
                    <Button theme="solid" type="primary" onClick={() => navigate(item.path)}>
                      {item.button}
                    </Button>
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
                调整规则或确认风险后，仍然需要通过同一控制台中的 API Keys、审计日志与 API 文档复盘限流、白名单、作用域和真实接口契约是否一致生效。
              </Typography.Paragraph>
              {visibleSharedConsoleLinks.map((item) => (
                <Tag key={item.key} color="grey" prefixIcon={item.icon}>
                  {item.label} · {item.path}
                </Tag>
              ))}
              {!canOpenAudit && !canOpenApiKeys && !canOpenDocs && shouldShowFallbackCta ? (
                <Card
                  data-testid="admin-risk-shared-console-fallback"
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
                    <Typography.Title heading={5} style={{ margin: 0, color: '#f8fafc' }}>
                      回到推荐工作台继续管理员主链路
                    </Typography.Title>
                    <Typography.Text style={{ color: 'rgba(226,232,240,0.72)' }}>
                      当前菜单未暴露审计、接入或文档入口时，继续回到服务端授予的共享工作台完成后续运营闭环。
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

      <Row gutter={[16, 16]} style={{ width: '100%' }}>
        <Col xs={24} md={12} xl={6}>
          <MetricCard
            title="高风险"
            value={String(summary?.high_risk_signal_count ?? 0)}
            description="建议优先查看并联动审计排查"
            icon={<IconAlertTriangle />}
          />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <MetricCard
            title="中风险"
            value={String(summary?.medium_risk_signal_count ?? 0)}
            description="可继续观察或下调阈值验证"
            icon={<IconHistogram />}
          />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <MetricCard
            title="白名单拦截"
            value={String(summary?.denied_whitelist ?? 0)}
            description="最近窗口内被白名单拒绝的请求数"
            icon={<IconShield />}
          />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <MetricCard
            title="限流拦截"
            value={String(summary?.denied_rate_limit ?? 0)}
            description="疑似重试风暴或异常高频请求"
            icon={<IconBolt />}
          />
        </Col>
      </Row>

      <Banner
        type="info"
        fullMode={false}
        description="当前风控信号基于真实 API Key 鉴权审计、开放争议单、订单取消/超时占比构建；规则中心用于配置后续风控任务的启停、阈值、窗口与等级。"
      />

      <Row gutter={[16, 16]} style={{ width: '100%' }}>
        <Col xs={24} xl={14}>
          <Card title="规则命中概览" style={{ width: '100%' }}>
            <Space vertical align="start" spacing={12} style={{ width: '100%' }}>
              <Tag color="red" prefixIcon={<IconAlertTriangle />}>高风险信号：{highSignals.length} 条</Tag>
              <Tag color="orange" prefixIcon={<IconHistogram />}>中风险信号：{mediumSignals.length} 条</Tag>
              <Tag color="blue" prefixIcon={<IconTickCircle />}>开放争议单：{summary?.open_disputes ?? 0}</Tag>
              <Tag color="grey" prefixIcon={<IconBolt />}>超时订单：{summary?.timeout_orders ?? 0} ｜ 取消订单：{summary?.canceled_orders ?? 0}</Tag>
            </Space>
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card title="处置建议" style={{ width: '100%' }}>
            <Space vertical align="start" spacing={12}>
              <Tag color="red">1. 先打开审计日志查看 denied_whitelist / denied_rate_limit 来源 API Key</Tag>
              <Tag color="orange">2. 若高风险持续增长，收紧阈值并通知调用方修复重试策略</Tag>
              <Tag color="blue">3. 结合争议与超时订单，判断是否需要临时停用异常供给链路</Tag>
            </Space>
          </Card>
        </Col>
      </Row>

      <Card
        title="可配置风控规则"
        style={{ width: '100%' }}
        headerExtraContent={
          <Button theme="solid" loading={saving} onClick={saveRules}>
            保存规则
          </Button>
        }
      >
        <Table
          pagination={false}
          rowKey="key"
          dataSource={rules}
          columns={[
            { title: '规则', dataIndex: 'key', key: 'key' },
            {
              title: '启用',
              dataIndex: 'enabled',
              key: 'enabled',
              render: (_value, _record, index) => (
                <Switch
                  aria-label={`启用规则-${rules[index].key}`}
                  checked={rules[index].enabled}
                  onChange={(checked) => updateRule(index, { enabled: checked })}
                />
              ),
            },
            {
              title: '阈值',
              dataIndex: 'threshold',
              key: 'threshold',
              render: (_value, _record, index) => (
                <Form.InputNumber
                  field={`threshold-${rules[index].key}`}
                  noLabel
                  min={1}
                  max={10000}
                  value={rules[index].threshold}
                  onNumberChange={(value) => updateRule(index, { threshold: Number(value) || 1 })}
                />
              ),
            },
            {
              title: '窗口(分钟)',
              dataIndex: 'window_minutes',
              key: 'window_minutes',
              render: (_value, _record, index) => (
                <Form.InputNumber
                  field={`window-${rules[index].key}`}
                  noLabel
                  min={1}
                  max={1440}
                  value={rules[index].window_minutes}
                  onNumberChange={(value) => updateRule(index, { window_minutes: Number(value) || 1 })}
                />
              ),
            },
            {
              title: '等级',
              dataIndex: 'severity',
              key: 'severity',
              render: (_value, _record, index) => (
                <Select
                  value={rules[index].severity}
                  style={{ width: 120 }}
                  onChange={(value) => updateRule(index, { severity: String(value) })}
                  optionList={[
                    { label: 'high', value: 'high' },
                    { label: 'medium', value: 'medium' },
                    { label: 'low', value: 'low' },
                  ]}
                />
              ),
            },
            {
              title: '规则状态',
              dataIndex: 'key',
              key: 'status',
              render: (_value, record) => <Tag color={record.enabled ? 'green' : 'grey'}>{ruleStatus(record)}</Tag>,
            },
            { title: '说明', dataIndex: 'description', key: 'description' },
          ]}
        />
      </Card>

      <Card title="风险信号" style={{ width: '100%' }}>
        <Table
          pagination={false}
          rowKey={(record) => `${record?.category ?? 'unknown'}-${record?.title ?? 'signal'}`}
          dataSource={data?.signals ?? []}
          columns={[
            { title: '类别', dataIndex: 'category', key: 'category' },
            { title: '等级', dataIndex: 'severity', key: 'severity', render: (value) => <Tag color={severityColor(String(value))}>{String(value)}</Tag> },
            { title: '次数', dataIndex: 'count', key: 'count' },
            { title: '标题', dataIndex: 'title', key: 'title' },
            { title: '说明', dataIndex: 'detail', key: 'detail' },
          ]}
        />
      </Card>
    </Space>
  )
}
