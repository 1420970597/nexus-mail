import { Button, Card, Form, Space, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui'
import { useEffect, useState } from 'react'
import { getWalletOverview, getWalletTransactions, topupWallet, WalletOverview, WalletTransaction } from '../services/finance'

export function BalancePage() {
  const [wallet, setWallet] = useState<WalletOverview | null>(null)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [form] = Form.useForm()

  const load = async () => {
    setLoading(true)
    try {
      const [walletRes, txRes] = await Promise.all([getWalletOverview(), getWalletTransactions()])
      setWallet(walletRes.wallet)
      setTransactions(txRes.items)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const handleTopup = async () => {
    try {
      const values = await form.validate()
      await topupWallet(Number(values.amount), values.note)
      Toast.success('充值成功')
      form.reset()
      await load()
    } catch (error: any) {
      if (error?.name === 'ValidationError') return
      Toast.error(error?.response?.data?.error ?? '充值失败')
    }
  }

  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <div>
        <Typography.Title heading={3}>余额中心</Typography.Title>
        <Typography.Paragraph>查看可用余额、冻结余额，并使用开发环境充值入口模拟充值与退款流水。</Typography.Paragraph>
      </div>

      <Card style={{ width: '100%' }} loading={loading}>
        <Space spacing={24}>
          <Tag color="green">可用余额：¥{((wallet?.available_balance ?? 0) / 100).toFixed(2)}</Tag>
          <Tag color="orange">冻结余额：¥{((wallet?.frozen_balance ?? 0) / 100).toFixed(2)}</Tag>
          <Tag color="blue">待结算：¥{((wallet?.pending_settlement ?? 0) / 100).toFixed(2)}</Tag>
        </Space>
      </Card>

      <Card title="模拟充值" style={{ width: '100%' }}>
        <Form form={form} layout="horizontal" labelPosition="left">
          <Form.InputNumber field="amount" label="金额（分）" rules={[{ required: true, message: '请输入充值金额' }]} style={{ width: '100%' }} />
          <Form.Input field="note" label="备注" placeholder="在线充值 / 手工补款" />
          <Button type="primary" theme="solid" onClick={handleTopup}>确认充值</Button>
        </Form>
      </Card>

      <Card title="钱包流水" style={{ width: '100%' }} loading={loading}>
        <Table
          pagination={false}
          rowKey="id"
          dataSource={transactions}
          columns={[
            { title: '类型', dataIndex: 'type', key: 'type' },
            { title: '方向', dataIndex: 'direction', key: 'direction' },
            { title: '余额类型', dataIndex: 'balance_type', key: 'balance_type' },
            { title: '金额', dataIndex: 'amount', key: 'amount', render: (value) => `¥${(Number(value) / 100).toFixed(2)}` },
            { title: '订单', dataIndex: 'order_id', key: 'order_id', render: (value) => value || '—' },
            { title: '备注', dataIndex: 'note', key: 'note' },
          ]}
        />
      </Card>
    </Space>
  )
}
