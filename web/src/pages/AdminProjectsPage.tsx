import { Card, Space, Table, Tag, Typography } from '@douyinfe/semi-ui'
import { useEffect, useState } from 'react'
import { getAdminProjectOfferings, InventoryItem } from '../services/activation'

export function AdminProjectsPage() {
  const [items, setItems] = useState<InventoryItem[]>([])

  useEffect(() => {
    getAdminProjectOfferings().then((res) => setItems(res.items)).catch(() => setItems([]))
  }, [])

  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <div>
        <Typography.Title heading={3}>管理员项目配置</Typography.Title>
        <Typography.Paragraph>查看当前项目的价格、库存、供应商与域名池分布，为后续更完整的项目配置界面打底。</Typography.Paragraph>
      </div>

      <Card style={{ width: '100%' }}>
        <Table
          pagination={false}
          rowKey={(record?: InventoryItem) => `${record?.project_key ?? 'unknown'}-${record?.domain_id ?? 0}`}
          dataSource={items}
          columns={[
            { title: '项目', dataIndex: 'project_name', key: 'project_name' },
            { title: '项目键', dataIndex: 'project_key', key: 'project_key', render: (value) => <Tag color="blue">{String(value)}</Tag> },
            { title: '域名池', dataIndex: 'domain_name', key: 'domain_name' },
            { title: '供应商 ID', dataIndex: 'supplier_id', key: 'supplier_id' },
            { title: '价格', dataIndex: 'price', key: 'price', render: (value) => `¥${Number(value) / 100}` },
            { title: '库存', dataIndex: 'stock', key: 'stock' },
            { title: '成功率', dataIndex: 'success_rate', key: 'success_rate', render: (value) => `${Math.round(Number(value) * 100)}%` },
          ]}
        />
      </Card>
    </Space>
  )
}
