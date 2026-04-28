import { Banner, Card, Col, Row, Space, Table, Tag, Typography } from '@douyinfe/semi-ui'
import { useEffect, useState } from 'react'
import { AdminRiskResponse, getAdminRisk } from '../services/auth'

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

  useEffect(() => {
    getAdminRisk().then(setData).catch(() => setData(null))
  }, [])

  const summary = data?.summary

  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <div>
        <Typography.Title heading={3}>风控中心</Typography.Title>
        <Typography.Paragraph>聚合真实订单、争议与 API Key 审计事件，优先暴露高风险信号而非占位页。</Typography.Paragraph>
      </div>
      <Banner type="warning" fullMode={false} description="当前风控信号基于真实 API Key 鉴权审计、开放争议单、订单取消/超时占比构建，可继续演进到独立规则中心。" />
      <Row gutter={16} style={{ width: '100%' }}>
        <Col span={6}><Card title="开放争议单">{summary?.open_disputes ?? 0}</Card></Col>
        <Col span={6}><Card title="白名单拦截">{summary?.denied_whitelist ?? 0}</Card></Col>
        <Col span={6}><Card title="高风险信号">{summary?.high_risk_signal_count ?? 0}</Card></Col>
        <Col span={6}><Card title="中风险信号">{summary?.medium_risk_signal_count ?? 0}</Card></Col>
      </Row>
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
