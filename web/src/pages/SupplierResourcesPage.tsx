import { Card, Space, Table, Tag, Typography } from '@douyinfe/semi-ui'
import { useEffect, useState } from 'react'
import { getSupplierResourcesOverview } from '../services/activation'

export function SupplierResourcesPage() {
  const [data, setData] = useState<{ domains: any[]; mailboxes: any[]; accounts: any[] }>({ domains: [], mailboxes: [], accounts: [] })

  useEffect(() => {
    getSupplierResourcesOverview().then(setData).catch(() => setData({ domains: [], mailboxes: [], accounts: [] }))
  }, [])

  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <div>
        <Typography.Title heading={3}>供应商资源</Typography.Title>
        <Typography.Paragraph>统一展示供应商的域名池、邮箱池与第三方邮箱账号池，承接后续资源录入与凭证管理。</Typography.Paragraph>
      </div>

      <Card title="域名池" style={{ width: '100%' }}>
        <Table
          pagination={false}
          rowKey="id"
          dataSource={data.domains}
          columns={[
            { title: '域名', dataIndex: 'name', key: 'name' },
            { title: '区域', dataIndex: 'region', key: 'region' },
            { title: 'Catch-All', dataIndex: 'catch_all', key: 'catch_all', render: (value) => <Tag color={value ? 'green' : 'grey'}>{value ? '是' : '否'}</Tag> },
            { title: '状态', dataIndex: 'status', key: 'status', render: (value) => <Tag color="blue">{String(value)}</Tag> },
          ]}
        />
      </Card>

      <Card title="邮箱池 / 别名池" style={{ width: '100%' }}>
        <Table
          pagination={false}
          rowKey="id"
          dataSource={data.mailboxes}
          columns={[
            { title: '邮箱地址', dataIndex: 'address', key: 'address' },
            { title: '来源类型', dataIndex: 'source_type', key: 'source_type' },
            { title: '项目', dataIndex: 'project_key', key: 'project_key' },
            { title: '状态', dataIndex: 'status', key: 'status', render: (value) => <Tag color="purple">{String(value)}</Tag> },
          ]}
        />
      </Card>

      <Card title="第三方邮箱账号池" style={{ width: '100%' }}>
        <Table
          pagination={false}
          rowKey="id"
          dataSource={data.accounts}
          columns={[
            { title: 'Provider', dataIndex: 'provider', key: 'provider' },
            { title: '来源类型', dataIndex: 'source_type', key: 'source_type' },
            { title: '认证方式', dataIndex: 'auth_mode', key: 'auth_mode' },
            { title: '协议', dataIndex: 'protocol_mode', key: 'protocol_mode' },
            { title: '标识', dataIndex: 'identifier', key: 'identifier' },
            { title: '状态', dataIndex: 'status', key: 'status', render: (value) => <Tag color="orange">{String(value)}</Tag> },
          ]}
        />
      </Card>
    </Space>
  )
}
