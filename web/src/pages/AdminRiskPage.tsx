import { Banner, Button, Card, Col, InputNumber, Row, Select, Space, Switch, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui'
import { IconAlertTriangle, IconBolt, IconHistogram, IconSafe, IconShield, IconTickCircle } from '@douyinfe/semi-icons'
import { useEffect, useMemo, useState } from 'react'
import { AdminRiskResponse, RiskRule, getAdminRisk, getAdminRiskRules, updateAdminRiskRules } from '../services/auth'

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

export function AdminRiskPage() {
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

  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <Card
        style={{
          width: '100%',
          borderRadius: 24,
          background: 'linear-gradient(135deg, rgba(94,106,210,0.16) 0%, rgba(15,16,17,0.96) 58%, rgba(8,9,10,0.98) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
        bodyStyle={{ padding: 24 }}
      >
        <Space vertical align="start" spacing={16} style={{ width: '100%' }}>
          <Tag color="red" shape="circle">
            管理员视角
          </Tag>
          <div>
            <Typography.Title heading={3} style={{ marginBottom: 8, color: '#f7f8f8' }}>
              风险指挥台
            </Typography.Title>
            <Typography.Paragraph style={{ marginBottom: 0, color: 'rgba(208,214,224,0.82)', maxWidth: 860 }}>
              聚合真实订单、争议、API Key 审计与规则阈值，统一判断哪些信号需要立即处置、哪些适合继续观察。
            </Typography.Paragraph>
          </div>
          <Space wrap>
            <Tag color="grey" prefixIcon={<IconSafe />}>高风险信号优先联动审计日志与白名单策略</Tag>
            <Tag color="grey" prefixIcon={<IconShield />}>规则保存后会刷新摘要，便于验证阈值调整效果</Tag>
          </Space>
        </Space>
      </Card>

      <Row gutter={[16, 16]} style={{ width: '100%' }}>
        <Col xs={24} md={12} xl={6}><MetricCard title="高风险" value={String(summary?.high_risk_signal_count ?? 0)} description="建议优先查看并联动审计排查" icon={<IconAlertTriangle />} /></Col>
        <Col xs={24} md={12} xl={6}><MetricCard title="中风险" value={String(summary?.medium_risk_signal_count ?? 0)} description="可继续观察或下调阈值验证" icon={<IconHistogram />} /></Col>
        <Col xs={24} md={12} xl={6}><MetricCard title="白名单拦截" value={String(summary?.denied_whitelist ?? 0)} description="最近窗口内被白名单拒绝的请求数" icon={<IconShield />} /></Col>
        <Col xs={24} md={12} xl={6}><MetricCard title="限流拦截" value={String(summary?.denied_rate_limit ?? 0)} description="疑似重试风暴或异常高频请求" icon={<IconBolt />} /></Col>
      </Row>

      <Banner type="warning" fullMode={false} description="当前风控信号基于真实 API Key 鉴权审计、开放争议单、订单取消/超时占比构建；规则中心用于配置后续风控任务的启停、阈值、窗口与等级。" />

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

      <Card title="可配置风控规则" style={{ width: '100%' }} headerExtraContent={<Button theme="solid" loading={saving} onClick={saveRules}>保存规则</Button>}>
        <Table
          pagination={false}
          rowKey="key"
          dataSource={rules}
          columns={[
            { title: '规则', dataIndex: 'key', key: 'key' },
            { title: '启用', dataIndex: 'enabled', key: 'enabled', render: (_value, _record, index) => <Switch checked={rules[index].enabled} onChange={(checked) => updateRule(index, { enabled: checked })} /> },
            { title: '阈值', dataIndex: 'threshold', key: 'threshold', render: (_value, _record, index) => <InputNumber min={1} max={10000} value={rules[index].threshold} onNumberChange={(value) => updateRule(index, { threshold: Number(value) || 1 })} /> },
            { title: '窗口(分钟)', dataIndex: 'window_minutes', key: 'window_minutes', render: (_value, _record, index) => <InputNumber min={1} max={1440} value={rules[index].window_minutes} onNumberChange={(value) => updateRule(index, { window_minutes: Number(value) || 1 })} /> },
            { title: '等级', dataIndex: 'severity', key: 'severity', render: (_value, _record, index) => <Select value={rules[index].severity} style={{ width: 120 }} onChange={(value) => updateRule(index, { severity: String(value) })} optionList={[{ label: 'high', value: 'high' }, { label: 'medium', value: 'medium' }, { label: 'low', value: 'low' }]} /> },
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
