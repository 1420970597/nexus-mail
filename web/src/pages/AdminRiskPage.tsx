import { Banner, Button, Card, Col, InputNumber, Row, Select, Space, Switch, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui'
import { useEffect, useState } from 'react'
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

export function AdminRiskPage() {
  const [data, setData] = useState<AdminRiskResponse | null>(null)
  const [rules, setRules] = useState<RiskRule[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getAdminRisk().then(setData).catch(() => setData(null))
    getAdminRiskRules().then((payload) => setRules(payload.items)).catch(() => setRules([]))
  }, [])

  const summary = data?.summary

  function updateRule(index: number, patch: Partial<RiskRule>) {
    setRules((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  async function saveRules() {
    setSaving(true)
    try {
      const payload = await updateAdminRiskRules(rules)
      setRules(payload.items)
      Toast.success('风控规则已保存')
    } catch (error) {
      Toast.error('风控规则保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <div>
        <Typography.Title heading={3}>风控中心</Typography.Title>
        <Typography.Paragraph>聚合真实订单、争议与 API Key 审计事件，并提供可配置规则阈值。</Typography.Paragraph>
      </div>
      <Banner type="warning" fullMode={false} description="当前风控信号基于真实 API Key 鉴权审计、开放争议单、订单取消/超时占比构建；规则中心用于配置后续风控任务的启停、阈值、窗口与等级。" />
      <Row gutter={16} style={{ width: '100%' }}>
        <Col span={6}><Card title="开放争议单">{summary?.open_disputes ?? 0}</Card></Col>
        <Col span={6}><Card title="白名单拦截">{summary?.denied_whitelist ?? 0}</Card></Col>
        <Col span={6}><Card title="限流拦截">{summary?.denied_rate_limit ?? 0}</Card></Col>
        <Col span={6}><Card title="高风险信号">{summary?.high_risk_signal_count ?? 0}</Card></Col>
        <Col span={6}><Card title="中风险信号">{summary?.medium_risk_signal_count ?? 0}</Card></Col>
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
          rowKey={(record) => `${record.category}-${record.title}`}
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
