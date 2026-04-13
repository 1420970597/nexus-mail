import { Card, Space, Table, Tag, Typography } from '@douyinfe/semi-ui'
import { useEffect, useState } from 'react'
import { getSupplierSettlementOverview, SupplierSettlementEntry, WalletOverview } from '../services/finance'

export function SupplierSettlementsPage() {
  const [wallet, setWallet] = useState<WalletOverview | null>(null)
  const [entries, setEntries] = useState<SupplierSettlementEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getSupplierSettlementOverview()
      .then((res) => {
        setWallet(res.wallet)
        setEntries(res.entries)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <div>
        <Typography.Title heading={3}>供应商结算</Typography.Title>
        <Typography.Paragraph>查看订单完结后累计到供应商侧的待结算金额与结算流水。</Typography.Paragraph>
      </div>
      <Card style={{ width: '100%' }} loading={loading}>
        <Space spacing={24}>
          <Tag color="green">待结算：¥{((wallet?.pending_settlement ?? 0) / 100).toFixed(2)}</Tag>
          <Tag color="blue">账户余额：¥{((wallet?.available_balance ?? 0) / 100).toFixed(2)}</Tag>
        </Space>
      </Card>
      <Card title="结算流水" style={{ width: '100%' }} loading={loading}>
        <Table
          pagination={false}
          rowKey="id"
          dataSource={entries}
          columns={[
            { title: '订单', dataIndex: 'order_id', key: 'order_id' },
            { title: '金额', dataIndex: 'amount', key: 'amount', render: (value) => `¥${(Number(value) / 100).toFixed(2)}` },
            { title: '状态', dataIndex: 'status', key: 'status', render: (value) => <Tag color={value === 'pending' ? 'orange' : 'green'}>{String(value)}</Tag> },
            { title: '备注', dataIndex: 'note', key: 'note' },
          ]}
        />
      </Card>
    </Space>
  )
}
