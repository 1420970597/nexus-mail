import { Banner, Button, Card, Space, Table, Tag, Typography } from '@douyinfe/semi-ui'

const apiKeyRows = [
  {
    name: '默认应用密钥',
    scope: 'read:orders, write:webhooks',
    status: '待启用',
    updatedAt: 'Phase 5 接入后可管理',
  },
]

export function ApiKeysPage() {
  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <div>
        <Typography.Title heading={3}>API Keys</Typography.Title>
        <Typography.Paragraph>
          这里用于承接对外 API 的密钥、权限范围与后续 IP 白名单控制。
        </Typography.Paragraph>
      </div>

      <Banner
        type="info"
        fullMode={false}
        description="当前阶段提供控制台骨架，Phase 5 将在此接入完整的密钥生命周期管理。"
      />

      <Card style={{ width: '100%' }}>
        <Table
          pagination={false}
          dataSource={apiKeyRows}
          columns={[
            { title: '名称', dataIndex: 'name', key: 'name' },
            { title: '权限范围', dataIndex: 'scope', key: 'scope' },
            {
              title: '状态',
              dataIndex: 'status',
              key: 'status',
              render: (value) => <Tag color="orange">{String(value)}</Tag>,
            },
            { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt' },
          ]}
          rowKey="name"
        />
      </Card>

      <Button theme="solid" type="primary">创建新密钥（待开放）</Button>
    </Space>
  )
}
