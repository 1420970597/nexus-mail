import { Button, Card, Form, Space, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui'
import { useEffect, useState } from 'react'
import { createUserOrderDispute, getWalletOverview, getWalletTransactions, topupWallet, OrderDispute, WalletOverview, WalletTransaction } from '../services/finance'

export function BalancePage() {
  const [wallet, setWallet] = useState<WalletOverview | null>(null)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [topupForm] = Form.useForm()
  const [disputeForm] = Form.useForm()
  const [recentDisputes, setRecentDisputes] = useState<OrderDispute[]>([])

  const load = async () => {
    setLoading(true)
    try {
      const [walletRes, txRes] = await Promise.all([getWalletOverview(), getWalletTransactions()])
      setWallet(walletRes.wallet)
      setTransactions(txRes.items)
    } catch (error: any) {
      Toast.error(error?.response?.data?.error ?? '加载钱包数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const handleTopup = async () => {
    try {
      const values = await topupForm.validate()
      await topupWallet(Number(values.amount), values.note)
      Toast.success('充值成功')
      topupForm.reset()
      await load()
    } catch (error: any) {
      if (error?.name === 'ValidationError') return
      Toast.error(error?.response?.data?.error ?? '充值失败')
    }
  }

  const handleCreateDispute = async () => {
    try {
      const values = await disputeForm.validate()
      const res = await createUserOrderDispute(Number(values.order_id), values.reason)
      setRecentDisputes((current) => [res.dispute, ...current].slice(0, 10))
      Toast.success('已提交订单争议')
      disputeForm.reset()
    } catch (error: any) {
      if (error?.name === 'ValidationError') return
      Toast.error(error?.response?.data?.error ?? '提交争议失败')
    }
  }

  return (
    <Space vertical align="start" style={{ width: '100%' }} spacing={24}>
      <div>
        <Typography.Title heading={3}>余额中心</Typography.Title>
        <Typography.Paragraph>查看可用余额、冻结余额，模拟充值，并对异常订单发起争议与退款申请。</Typography.Paragraph>
      </div>

      <Card style={{ width: '100%' }} loading={loading}>
        <Space spacing={24}>
          <Tag color="green">可用余额：¥{((wallet?.available_balance ?? 0) / 100).toFixed(2)}</Tag>
          <Tag color="orange">冻结余额：¥{((wallet?.frozen_balance ?? 0) / 100).toFixed(2)}</Tag>
          <Tag color="blue">待结算：¥{((wallet?.pending_settlement ?? 0) / 100).toFixed(2)}</Tag>
        </Space>
      </Card>

      <Card title="模拟充值" style={{ width: '100%' }}>
        <Form form={topupForm} layout="horizontal" labelPosition="left">
          <Form.InputNumber field="amount" label="金额（分）" rules={[{ required: true, message: '请输入充值金额' }]} style={{ width: '100%' }} />
          <Form.Input field="note" label="备注" placeholder="在线充值 / 手工补款" />
          <Button type="primary" theme="solid" onClick={handleTopup}>确认充值</Button>
        </Form>
      </Card>

      <Card title="订单争议申请" style={{ width: '100%' }}>
        <Form form={disputeForm} layout="horizontal" labelPosition="left">
          <Form.InputNumber field="order_id" label="订单 ID" rules={[{ required: true, message: '请输入订单 ID' }]} style={{ width: '100%' }} />
          <Form.Input field="reason" label="争议原因" rules={[{ required: true, message: '请输入争议原因' }]} />
          <Button type="primary" theme="solid" onClick={handleCreateDispute}>提交争议</Button>
        </Form>
      </Card>

      <Card title="最近提交的争议" style={{ width: '100%' }}>
        <Table
          pagination={false}
          rowKey="id"
          dataSource={recentDisputes}
          columns={[
            { title: '争议单 ID', dataIndex: 'id', key: 'id' },
            { title: '订单 ID', dataIndex: 'order_id', key: 'order_id' },
            { title: '状态', dataIndex: 'status', key: 'status', render: (value) => <Tag color={value === 'open' ? 'orange' : 'green'}>{String(value)}</Tag> },
            { title: '原因', dataIndex: 'reason', key: 'reason' },
          ]}
        />
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
